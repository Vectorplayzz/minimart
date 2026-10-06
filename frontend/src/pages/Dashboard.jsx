import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Package, Store, ShoppingCart, AlertTriangle, 
  TrendingUp, TrendingDown, ArrowRight, Clock
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import StatCard from '../components/StatCard';
import { salesAPI, inventoryAPI, alertAPI, productAPI, branchAPI } from '../services/api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalBranches: 0,
    todaySales: 0,
    activeAlerts: 0,
  });
  const [salesTrend, setSalesTrend] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [
        productsRes, 
        branchesRes, 
        salesRes, 
        alertsRes, 
        trendRes, 
        topRes,
        recentRes
      ] = await Promise.all([
        productAPI.getAll(),
        branchAPI.getAll(),
        salesAPI.getDaily(),
        alertAPI.getSummary(),
        salesAPI.getTrend(7),
        salesAPI.getTopProducts(7, 5),
        salesAPI.getHistory(10),
      ]);

      setStats({
        totalProducts: productsRes.data.length,
        totalBranches: branchesRes.data.length,
        todaySales: salesRes.data.summary?.total_quantity_sold || 0,
        activeAlerts: alertsRes.data.total || 0,
      });

      setSalesTrend(trendRes.data);
      setTopProducts(topRes.data);
      setRecentSales(recentRes.data);
      setAlerts(alertsRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Products"
          value={stats.totalProducts}
          icon={Package}
          color="blue"
        />
        <StatCard
          title="Total Branches"
          value={stats.totalBranches}
          icon={Store}
          color="indigo"
        />
        <StatCard
          title="Today's Sales"
          value={stats.todaySales}
          icon={ShoppingCart}
          color="green"
          trend="up"
          trendValue="items sold"
        />
        <StatCard
          title="Active Alerts"
          value={stats.activeAlerts}
          icon={AlertTriangle}
          color={stats.activeAlerts > 0 ? 'red' : 'green'}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Sales Trend (7 Days)</h3>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          {salesTrend.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400">
              No sales data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={salesTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={formatDate} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value) => [`${value} items`, 'Sold']}
                  labelFormatter={formatDate}
                />
                <Line 
                  type="monotone" 
                  dataKey="total_sold" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Products Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Top Products (7 Days)</h3>
            <Package className="w-5 h-5 text-gray-400" />
          </div>
          {topProducts.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400">
              No product data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  tick={{ fontSize: 11 }} 
                  width={100}
                />
                <Tooltip formatter={(value) => [`${value} sold`, 'Total']} />
                <Bar dataKey="total_sold" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Sales & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Recent Sales</h3>
            <Link to="/sales" className="text-blue-600 text-sm hover:underline flex items-center">
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          {recentSales.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400">
              No recent sales
            </div>
          ) : (
            <div className="space-y-3">
              {recentSales.slice(0, 5).map((sale) => (
                <div key={sale.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">{sale.product_name}</p>
                    <p className="text-sm text-gray-500">{sale.branch_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-800">{sale.quantity_sold} items</p>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatDate(sale.date)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alerts Panel */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Alert Summary</h3>
            <Link to="/alerts" className="text-blue-600 text-sm hover:underline flex items-center">
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-3xl font-bold text-red-600">{alerts.low_stock || 0}</p>
              <p className="text-sm text-red-600">Low Stock</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-3xl font-bold text-yellow-600">{alerts.overstock || 0}</p>
              <p className="text-sm text-yellow-600">Overstock</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-3xl font-bold text-orange-600">{alerts.expiry || 0}</p>
              <p className="text-sm text-orange-600">Expiry</p>
            </div>
          </div>
          {alerts.total > 0 && (
            <Link 
              to="/alerts" 
              className="mt-4 block w-full text-center py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              View {alerts.total} Alerts
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;