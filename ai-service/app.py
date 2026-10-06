from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
import joblib
import os
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)

MODEL_DIR = "models"
DATA_DIR = "data"

os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)

model_storage = {}

def create_features(df):
    """Create features for the model"""
    if df is None or len(df) == 0:
        return None, None
    
    df = df.copy()
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values('date')
    
    df['day_of_week'] = df['date'].dt.dayofweek
    df['day_of_month'] = df['date'].dt.day
    df['week_of_year'] = df['date'].dt.isocalendar().week.astype(int)
    
    for lag in [1, 2, 3, 7]:
        df[f'lag_{lag}'] = df['quantity_sold'].shift(lag)
    
    df['rolling_mean_7'] = df['quantity_sold'].rolling(window=7, min_periods=1).mean()
    df['rolling_std_7'] = df['quantity_sold'].rolling(window=7, min_periods=1).std().fillna(0)
    
    df = df.dropna()
    
    if len(df) < 5:
        return None, None
    
    feature_cols = ['day_of_week', 'day_of_month', 'week_of_year', 'lag_1', 'lag_2', 'lag_3', 'lag_7', 'rolling_mean_7', 'rolling_std_7']
    X = df[feature_cols].values
    y = df['quantity_sold'].values
    
    return X, y

def train_model(product_id, branch_id, historical_data):
    """Train a Linear Regression model"""
    if not historical_data or len(historical_data) < 7:
        return None
    
    df = pd.DataFrame(historical_data)
    X, y = create_features(df)
    
    if X is None or len(X) < 5:
        return None
    
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    model = LinearRegression()
    model.fit(X_scaled, y)
    
    score = model.score(X_scaled, y)
    
    key = f"{product_id}_{branch_id}"
    model_storage[key] = {
        'model': model,
        'scaler': scaler,
        'score': score,
        'last_training': datetime.now().isoformat()
    }
    
    return {
        'score': score,
        'samples': len(X)
    }

def predict_demand(product_id, branch_id, historical_data, days=7):
    """Predict demand for next N days"""
    key = f"{product_id}_{branch_id}"
    
    if historical_data and len(historical_data) >= 7:
        train_result = train_model(product_id, branch_id, historical_data)
    elif key in model_storage:
        pass
    else:
        return None
    
    if key not in model_storage:
        return None
    
    storage = model_storage[key]
    model = storage['model']
    scaler = storage['scaler']
    
    df = pd.DataFrame(historical_data)
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values('date')
    
    last_date = df['date'].max()
    predictions = []
    
    for i in range(1, days + 1):
        pred_date = last_date + timedelta(days=i)
        
        day_of_week = pred_date.dayofweek
        day_of_month = pred_date.day
        week_of_year = pred_date.isocalendar()[1]
        
        lag_1 = df.iloc[-1]['quantity_sold'] if len(df) >= 1 else 0
        lag_2 = df.iloc[-2]['quantity_sold'] if len(df) >= 2 else lag_1
        lag_3 = df.iloc[-3]['quantity_sold'] if len(df) >= 3 else lag_2
        lag_7 = df.iloc[-7]['quantity_sold'] if len(df) >= 7 else lag_1
        
        rolling_mean_7 = df['quantity_sold'].tail(7).mean()
        rolling_std_7 = df['quantity_sold'].tail(7).std() if len(df) >= 7 else 0
        
        features = np.array([[day_of_week, day_of_month, week_of_year, lag_1, lag_2, lag_3, lag_7, rolling_mean_7, rolling_std_7]])
        features_scaled = scaler.transform(features)
        
        predicted = model.predict(features_scaled)[0]
        predicted = max(0, round(predicted))
        
        predictions.append({
            'date': pred_date.strftime('%Y-%m-%d'),
            'predicted_demand': predicted,
            'day_of_week': day_of_week
        })
    
    total_predicted = sum(p['predicted_demand'] for p in predictions)
    avg_daily = total_predicted / days
    
    max_demand = max(p['predicted_demand'] for p in predictions)
    safety_stock = int(max_demand * 1.2)
    
    return {
        'product_id': product_id,
        'branch_id': branch_id,
        'predictions': predictions,
        'predicted_weekly_demand': total_predicted,
        'avg_daily_demand': round(avg_daily, 2),
        'max_daily_demand': max_demand,
        'recommended_safety_stock': safety_stock,
        'model_accuracy': round(storage['score'] * 100, 2) if storage['score'] else None,
        'training_samples': len(df)
    }

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'AI Prediction Service',
        'models_loaded': len(model_storage),
        'timestamp': datetime.now().isoformat()
    })

@app.route('/predict', methods=['POST'])
def predict():
    """Predict demand for a product at a branch"""
    try:
        data = request.json
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        product_id = data.get('product_id')
        branch_id = data.get('branch_id')
        historical_data = data.get('historical_data', [])
        days = data.get('days', 7)
        
        if not product_id or not branch_id:
            return jsonify({'error': 'product_id and branch_id are required'}), 400
        
        result = predict_demand(product_id, branch_id, historical_data, days)
        
        if result is None:
            return jsonify({
                'error': 'Insufficient data for prediction',
                'message': 'Need at least 7 days of historical sales data'
            }), 400
        
        return jsonify(result)
    
    except Exception as e:
        print(f"Prediction error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/train', methods=['POST'])
def train():
    """Train the model with provided data"""
    try:
        data = request.json
        historical_data = data.get('historical_data', [])
        
        if not historical_data or len(historical_data) < 7:
            return jsonify({'error': 'Need at least 7 days of data'}), 400
        
        df = pd.DataFrame(historical_data)
        X, y = create_features(df)
        
        if X is None:
            return jsonify({'error': 'Could not create features from data'}), 400
        
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        model = LinearRegression()
        model.fit(X_scaled, y)
        
        score = model.score(X_scaled, y)
        
        joblib.dump(model, os.path.join(MODEL_DIR, 'linear_regression_model.pkl'))
        joblib.dump(scaler, os.path.join(MODEL_DIR, 'scaler.pkl'))
        
        return jsonify({
            'status': 'success',
            'model': 'Linear Regression',
            'accuracy': round(score * 100, 2),
            'samples': len(X),
            'features': X.shape[1],
            'timestamp': datetime.now().isoformat()
        })
    
    except Exception as e:
        print(f"Training error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/models', methods=['GET'])
def list_models():
    """List all trained models"""
    models = []
    for key, value in model_storage.items():
        product_id, branch_id = key.split('_')
        models.append({
            'product_id': int(product_id),
            'branch_id': int(branch_id),
            'accuracy': round(value['score'] * 100, 2) if value['score'] else None,
            'last_training': value['last_training']
        })
    
    return jsonify({
        'total_models': len(models),
        'models': models
    })

@app.route('/models/<int:product_id>/<int:branch_id>', methods=['DELETE'])
def delete_model(product_id, branch_id):
    """Delete a specific model"""
    key = f"{product_id}_{branch_id}"
    if key in model_storage:
        del model_storage[key]
        return jsonify({'status': 'deleted', 'key': key})
    return jsonify({'error': 'Model not found'}), 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)