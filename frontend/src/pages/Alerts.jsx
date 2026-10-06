import React, { useState, useEffect } from 'react';
import { AlertTriangle, AlertCircle, Package, Store, Clock, RefreshCw, Filter } from 'lucide-react';
import { alertAPI } from '../services/api';

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const [alertsRes, summaryRes] = await Promise.all([
        alertAPI.getAll(),
        alertAPI.getSummary(),
      ]);
      setAlerts(alertsRes.data);
      setSummary(summaryRes.data);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'all') return true;
    return alert.type === filter;
  });

  const getAlertIcon = (type) => {
    switch (type) {
      case 'low_stock': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'overstock': return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'expiry': return <Clock className="w-5 h-5 text-orange-500" />;
      default: return <AlertTriangle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getAlertColor = (type) => {
    switch (type) {
      case 'low_stock': return 'border-l-red-500 bg-red-50';
      case 'overstock': return 'border-l-yellow-500 bg-yellow-50';
      case 'expiry': return 'border-l-orange-500 bg-orange-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  const getAlertLabel = (type) => {
    switch (type) {
      case 'low_stock': return 'Low Stock';
      case 'overstock': return 'Overstock';
      case 'expiry': return 'Expiry Warning';
      default: return 'Alert';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Alerts</p>
              <p className="text-2xl font-bold text-gray-800">{summary.total || 0}</p>
            </div>
            <div className="p-3 bg-gray-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 border-l-4 border-l-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Low Stock</p>
              <p className="text-2xl font-bold text-red-600">{summary.low_stock || 0}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 border-l-4 border-l-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Overstock</p>
              <p className="text-2xl font-bold text-yellow-600">{summary.overstock || 0}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 border-l-4 border-l-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Expiry</p>
              <p className="text-2xl font-bold text-orange-600">{summary.expiry || 0}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">Filter:</span>
          </div>
          <div className="flex space-x-2">
            {['all', 'low_stock', 'overstock', 'expiry'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f === 'all' ? 'All' : getAlertLabel(f)}
              </button>
            ))}
          </div>
          <button
            onClick={fetchAlerts}
            className="ml-auto p-2 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Alert List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center">
            <div className="p-4 bg-green-100 rounded-full w-16 h-16 mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">All Clear!</h3>
            <p className="text-gray-500">No alerts at the moment. Everything is running smoothly.</p>
          </div>
        ) : (
          filteredAlerts.map((alert, idx) => (
            <div
              key={idx}
              className={`bg-white rounded-lg shadow-sm border border-l-4 p-4 ${getAlertColor(alert.type)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="p-2 bg-white rounded-lg">
                    {getAlertIcon(alert.type)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-semibold text-gray-800">{alert.product_name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        alert.type === 'low_stock' ? 'bg-red-100 text-red-700' :
                        alert.type === 'overstock' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {getAlertLabel(alert.type)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {alert.type === 'expiry' ? (
                        <>Expires on {new Date(alert.quantity).toLocaleDateString()}</>
                      ) : (
                        <>
                          Current: <span className="font-medium">{alert.quantity}</span>
                          {alert.type === 'low_stock' && (
                            <> (Min: {alert.min_stock})</>
                          )}
                          {alert.type === 'overstock' && (
                            <> (Max: {alert.min_stock})</>
                          )}
                        </>
                      )}
                    </p>
                    {alert.branch_name && (
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <Store className="w-3 h-3 mr-1" />
                        {alert.branch_name}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Alerts;