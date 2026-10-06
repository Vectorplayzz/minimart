import React, { useState, useEffect } from 'react';
import { Lightbulb, TrendingUp, TrendingDown, AlertTriangle, Package, ArrowRight, Clock } from 'lucide-react';
import { insightAPI, productAPI, branchAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Insights = () => {
  const { isAdmin, isManager } = useAuth();
  const [activeTab, setActiveTab] = useState('overstock');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState('');
  const [branch, setBranch] = useState('');
  const [forecast, setForecast] = useState(null);
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    fetchDropdownData();
  }, []);

  useEffect(() => {
    fetchInsight();
  }, [activeTab]);

  const fetchDropdownData = async () => {
    try {
      const [prodRes, branchRes] = await Promise.all([
        productAPI.getAll(),
        branchAPI.getAll(),
      ]);
      setProducts(prodRes.data);
      setBranches(branchRes.data.filter(b => b.is_active && !b.is_warehouse));
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const fetchInsight = async () => {
    setLoading(true);
    try {
      let result;
      switch (activeTab) {
        case 'overstock':
          result = await insightAPI.getOverstock();
          break;
        case 'understock':
          result = await insightAPI.getUnderstock();
          break;
        case 'fast-moving':
          result = await insightAPI.getFastMoving({ days: 30 });
          break;
        case 'slow-moving':
          result = await insightAPI.getSlowMoving({ days: 30 });
          break;
        case 'rebalance':
          result = await insightAPI.getRebalance();
          break;
        case 'expiry-risk':
          result = await insightAPI.getExpiryRisk({ days: 30 });
          break;
        default:
          result = [];
      }
      setData(result.data);
    } catch (error) {
      console.error('Failed to fetch insight:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleForecast = async () => {
    if (!product || !branch) return;
    setLoading(true);
    try {
      const res = await insightAPI.getForecast(product, branch, 7);
      setForecast(res.data);
    } catch (error) {
      console.error('Failed to get forecast:', error);
      alert('Failed to get forecast');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overstock', label: 'Overstock', icon: TrendingUp, color: 'text-yellow-600' },
    { id: 'understock', label: 'Understock', icon: TrendingDown, color: 'text-red-600' },
    { id: 'fast-moving', label: 'Fast Moving', icon: TrendingUp, color: 'text-green-600' },
    { id: 'slow-moving', label: 'Slow Moving', icon: TrendingDown, color: 'text-orange-600' },
    { id: 'rebalance', label: 'Rebalance', icon: ArrowRight, color: 'text-blue-600' },
    { id: 'expiry-risk', label: 'Expiry Risk', icon: Clock, color: 'text-purple-600' },
  ];

  const getColumns = () => {
    switch (activeTab) {
      case 'overstock':
        return ['product_name', 'category', 'branch_name', 'quantity', 'excess'];
      case 'understock':
        return ['product_name', 'category', 'branch_name', 'quantity', 'deficit'];
      case 'fast-moving':
        return ['product_name', 'category', 'total_sold', 'avg_daily_sales', 'branch_count'];
      case 'slow-moving':
        return ['product_name', 'category', 'total_sold', 'avg_daily_sales'];
      case 'rebalance':
        return ['product_name', 'source_branch', 'dest_branch', 'suggested_transfer'];
      case 'expiry-risk':
        return ['product_name', 'category', 'expiry_date', 'days_until_expiry', 'total_stock'];
      default:
        return [];
    }
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Lightbulb className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Smart Insights</h2>
          <p className="text-sm text-gray-500">AI-powered inventory analysis and recommendations</p>
        </div>
      </div>

      {/* Forecasting Tool */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Demand Forecasting</h3>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-600 mb-2">Product</label>
            <select
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Select product</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-600 mb-2">Branch</label>
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Select branch</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleForecast}
            disabled={!product || !branch || loading}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            Get Forecast
          </button>
        </div>

        {forecast && (
          <div className="mt-6 p-4 bg-purple-50 rounded-lg">
            <h4 className="font-semibold text-purple-800 mb-3">7-Day Demand Forecast</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-3 rounded">
                <p className="text-sm text-gray-600">7-Day Avg</p>
                <p className="text-xl font-bold text-purple-600">{forecast.moving_averages?.avg_7_day}</p>
              </div>
              <div className="bg-white p-3 rounded">
                <p className="text-sm text-gray-600">30-Day Avg</p>
                <p className="text-xl font-bold text-purple-600">{forecast.moving_averages?.avg_30_day}</p>
              </div>
              <div className="bg-white p-3 rounded">
                <p className="text-sm text-gray-600">Trend</p>
                <p className="text-xl font-bold text-purple-600 capitalize">{forecast.trend?.direction}</p>
              </div>
              <div className="bg-white p-3 rounded">
                <p className="text-sm text-gray-600">Predicted Total</p>
                <p className="text-xl font-bold text-purple-600">{forecast.predicted_total}</p>
              </div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-purple-100">
                  <tr>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Predicted Demand</th>
                    <th className="px-3 py-2 text-left">Day</th>
                  </tr>
                </thead>
                <tbody>
                  {forecast.forecast?.map((f, i) => (
                    <tr key={i} className="border-b border-purple-100">
                      <td className="px-3 py-2">{f.date}</td>
                      <td className="px-3 py-2 font-medium">{f.predicted_demand}</td>
                      <td className="px-3 py-2">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][f.day_of_week]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Insights Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="flex overflow-x-auto border-b">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className={`w-4 h-4 ${tab.color}`} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : data.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {getColumns().map(col => (
                    <th key={col} className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                      {col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 50).map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    {getColumns().map(col => (
                      <td key={col} className="px-4 py-3 text-sm text-gray-800">
                        {row[col] !== undefined && row[col] !== null ? row[col] : '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-gray-400">No data available</div>
          )}
        </div>
        
        {!loading && data.length > 50 && (
          <div className="p-4 text-center text-sm text-gray-500 border-t">
            Showing first 50 of {data.length} items
          </div>
        )}
      </div>
    </div>
  );
};

export default Insights;