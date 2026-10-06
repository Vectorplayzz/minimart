import React, { useState, useEffect } from 'react';
import { TrendingUp, Package, Store, RefreshCw, Lightbulb, AlertCircle } from 'lucide-react';
import PredictionChart from '../components/PredictionChart';
import { predictionAPI, productAPI, branchAPI, salesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Predictions = () => {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [prediction, setPrediction] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [historicalSales, setHistoricalSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [training, setTraining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [prodRes, branchRes] = await Promise.all([
        productAPI.getAll(),
        branchAPI.getAll(),
      ]);
      setProducts(prodRes.data);
      setBranches(branchRes.data.filter(b => !b.is_warehouse));
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const handleGetPrediction = async () => {
    if (!selectedProduct || !selectedBranch) {
      setError('Please select both product and branch');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [predRes, salesRes] = await Promise.all([
        predictionAPI.getPrediction(selectedProduct, selectedBranch),
        salesAPI.getByProductBranch(selectedProduct, selectedBranch, 30),
      ]);

      setPrediction(predRes.data);
      setHistoricalSales(salesRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to get prediction');
      setPrediction(null);
    } finally {
      setLoading(false);
    }
  };

  const handleGetRecommendations = async () => {
    if (!selectedProduct) {
      setError('Please select a product');
      return;
    }

    setLoading(true);

    try {
      const recRes = await predictionAPI.getRecommendation(selectedProduct);
      setRecommendations(recRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to get recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleTrainModel = async () => {
    setTraining(true);
    try {
      await predictionAPI.train();
      alert('Model trained successfully!');
    } catch (err) {
      alert('Failed to train model');
    } finally {
      setTraining(false);
    }
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">AI Demand Prediction</h2>
        
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-600 mb-2">
              <Package className="w-4 h-4 inline mr-1" />
              Select Product
            </label>
            <select
              value={selectedProduct}
              onChange={(e) => {
                setSelectedProduct(e.target.value);
                setPrediction(null);
                setRecommendations(null);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose a product...</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-600 mb-2">
              <Store className="w-4 h-4 inline mr-1" />
              Select Branch
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                setPrediction(null);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose a branch...</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleGetPrediction}
            disabled={loading || !selectedProduct || !selectedBranch}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <TrendingUp className="w-4 h-4" />
            )}
            <span>Get Prediction</span>
          </button>

          {isAdmin && (
            <button
              onClick={handleTrainModel}
              disabled={training}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center space-x-2"
            >
              {training ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Lightbulb className="w-4 h-4" />
              )}
              <span>Train Model</span>
            </button>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        )}
      </div>

      {/* Prediction Results */}
      {prediction && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Prediction Chart */}
          <div className="lg:col-span-2">
            <PredictionChart
              data={prediction.predictions}
              title={`7-Day Demand Forecast - ${prediction.predicted_weekly_demand} units predicted`}
              dataKey="predicted_demand"
              color="#3b82f6"
            />
          </div>

          {/* Stats */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Prediction Statistics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Weekly Demand</p>
                <p className="text-2xl font-bold text-blue-600">{prediction.predicted_weekly_demand}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Avg Daily Demand</p>
                <p className="text-2xl font-bold text-green-600">{prediction.avg_daily_demand}</p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-gray-600">Max Daily Demand</p>
                <p className="text-2xl font-bold text-yellow-600">{prediction.max_daily_demand}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">Safety Stock</p>
                <p className="text-2xl font-bold text-purple-600">{prediction.recommended_safety_stock}</p>
              </div>
            </div>
            
            {prediction.model_accuracy && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  Model Accuracy: <span className="font-semibold text-green-600">{prediction.model_accuracy}%</span>
                  <span className="text-gray-400 ml-2">({prediction.training_samples} samples)</span>
                </p>
              </div>
            )}
          </div>

          {/* Recommendations */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Restock Recommendations</h3>
            <div className="space-y-3">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Current stock at branch</p>
                <p className="text-lg font-semibold text-gray-800">
                  Calculate: Safety Stock - Current Stock
                </p>
              </div>
              
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Recommended Safety Stock</p>
                <p className="text-lg font-semibold text-green-600">
                  {prediction.recommended_safety_stock} units
                </p>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Daily Recommendation</p>
                <p className="text-lg font-semibold text-blue-600">
                  {Math.ceil(prediction.recommended_safety_stock / 7)} units/day
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All Recommendations */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Smart Restock Recommendations</h2>
          <button
            onClick={handleGetRecommendations}
            disabled={loading || !selectedProduct}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
          >
            <Lightbulb className="w-4 h-4" />
            <span>Get All Recommendations</span>
          </button>
        </div>

        {recommendations && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Branch</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Current Stock</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Predicted Demand</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Action</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Quantity</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Priority</th>
                </tr>
              </thead>
              <tbody>
                {recommendations.recommendations.map((rec, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="px-4 py-3 text-sm text-gray-800">{rec.branch_name}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={rec.current_stock < rec.min_stock ? 'text-red-600 font-medium' : 'text-gray-800'}>
                        {rec.current_stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{rec.predicted_demand || '—'}</td>
                    <td className="px-4 py-3">
                      {rec.recommendation?.action === 'restock' && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">Restock</span>
                      )}
                      {rec.recommendation?.action === 'transfer' && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">Transfer</span>
                      )}
                      {!rec.recommendation && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">OK</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {rec.recommendation?.quantity || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {rec.priority === 'high' && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">High</span>
                      )}
                      {rec.priority === 'medium' && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">Medium</span>
                      )}
                      {rec.priority === 'low' && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Low</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!recommendations && !loading && (
          <p className="text-gray-400 text-center py-8">
            Select a product and click "Get All Recommendations" to see restock suggestions across all branches
          </p>
        )}
      </div>
    </div>
  );
};

export default Predictions;