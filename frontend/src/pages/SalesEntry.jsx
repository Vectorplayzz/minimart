import React, { useState, useEffect } from 'react';
import { ShoppingCart, Calendar, Package, Store, Plus, Trash2 } from 'lucide-react';
import { salesAPI, productAPI, branchAPI } from '../services/api';

const SalesEntry = () => {
  const [sales, setSales] = useState([]);
  const [todaySales, setTodaySales] = useState({ sales: [], summary: {} });
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    product_id: '',
    branch_id: '',
    quantity: 1,
    sale_date: new Date().toISOString().split('T')[0],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [salesRes, dailyRes, prodRes, branchRes] = await Promise.all([
        salesAPI.getHistory(20),
        salesAPI.getDaily(),
        productAPI.getAll(),
        branchAPI.getAll(),
      ]);
      setSales(salesRes.data);
      setTodaySales(dailyRes.data);
      setProducts(prodRes.data);
      setBranches(branchRes.data);
      
      // Set default branch if user has one assigned
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.branch_id) {
        setForm(prev => ({ ...prev, branch_id: user.branch_id.toString() }));
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await salesAPI.create({
        product_id: parseInt(form.product_id),
        branch_id: parseInt(form.branch_id),
        quantity: parseInt(form.quantity),
        date: form.sale_date,
      });

      setForm({
        ...form,
        quantity: 1,
      });

      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record sale');
    } finally {
      setSubmitting(false);
    }
  };

  const getProductStock = (productId, branchId) => {
    // This would ideally come from the API
    return '—';
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Entry Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Record New Sale</h2>
                <p className="text-sm text-gray-500">Enter sale details below</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Package className="w-4 h-4 inline mr-1" />
                    Product
                  </label>
                  <select
                    value={form.product_id}
                    onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select product</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Store className="w-4 h-4 inline mr-1" />
                    Branch
                  </label>
                  <select
                    value={form.branch_id}
                    onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select branch</option>
                    {branches.filter(b => !b.is_warehouse).map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Date
                  </label>
                  <input
                    type="date"
                    value={form.sale_date}
                    onChange={(e) => setForm({ ...form, sale_date: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity Sold
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Recording...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    <span>Record Sale</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Recent Sales */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 mt-6">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">Recent Sales</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Product</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Branch</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Quantity</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <Package className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-800">{sale.product_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{sale.branch_name}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-gray-800">{sale.quantity_sold}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(sale.date).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sales.length === 0 && (
              <div className="p-8 text-center text-gray-400">
                No sales recorded yet
              </div>
            )}
          </div>
        </div>

        {/* Today's Summary */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Today's Summary</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-sm text-gray-600">Total Transactions</span>
                <span className="text-xl font-bold text-blue-600">
                  {todaySales.summary?.total_transactions || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm text-gray-600">Items Sold</span>
                <span className="text-xl font-bold text-green-600">
                  {todaySales.summary?.total_items_sold || 0}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Today's Sales Details</h3>
            {todaySales.sales?.length > 0 ? (
              <div className="space-y-3">
                {todaySales.sales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{sale.product_name}</p>
                      <p className="text-xs text-gray-500">{sale.branch_name}</p>
                    </div>
                    <span className="font-semibold text-gray-800">{sale.quantity_sold}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-4">No sales today</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesEntry;