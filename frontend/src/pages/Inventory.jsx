import React, { useState, useEffect } from 'react';
import { Package, Search, Filter, RefreshCw, AlertTriangle, ArrowUpDown } from 'lucide-react';
import { inventoryAPI, productAPI, branchAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Inventory = () => {
  const { isAdmin, isManager } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    product: '',
    branch: '',
    lowStock: false,
    overstock: false,
  });
  const [editModal, setEditModal] = useState({ open: false, item: null, quantity: '' });
  const [transferModal, setTransferModal] = useState({ open: false, item: null });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [invRes, prodRes, branchRes] = await Promise.all([
        inventoryAPI.getAll(),
        productAPI.getAll(),
        branchAPI.getAll(),
      ]);
      setInventory(invRes.data);
      setProducts(prodRes.data);
      setBranches(branchRes.data);
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInventory = inventory.filter(item => {
    if (filters.product && item.product_id !== parseInt(filters.product)) return false;
    if (filters.branch && item.branch_id !== parseInt(filters.branch)) return false;
    if (filters.lowStock && item.quantity >= item.min_stock) return false;
    if (filters.overstock && item.quantity <= item.max_stock) return false;
    return true;
  });

  const handleUpdateQuantity = async () => {
    try {
      await inventoryAPI.setQuantity(editModal.item.id, parseInt(editModal.quantity));
      setEditModal({ open: false, item: null, quantity: '' });
      fetchData();
    } catch (error) {
      alert('Failed to update quantity');
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    try {
      await inventoryAPI.transfer({
        from_branch_id: transferModal.item.branch_id,
        to_branch_id: parseInt(transferModal.form.toBranch),
        product_id: transferModal.item.product_id,
        quantity: parseInt(transferModal.form.quantity),
      });
      setTransferModal({ open: false, item: null, form: {} });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || 'Transfer failed');
    }
  };

  const getStockStatus = (item) => {
    if (item.quantity < item.min_stock) return 'low';
    if (item.quantity > item.max_stock) return 'overstock';
    return 'normal';
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
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <select
            value={filters.product}
            onChange={(e) => setFilters({ ...filters, product: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Products</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select
            value={filters.branch}
            onChange={(e) => setFilters({ ...filters, branch: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Branches</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={filters.lowStock}
              onChange={(e) => setFilters({ ...filters, lowStock: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-600">Low Stock Only</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={filters.overstock}
              onChange={(e) => setFilters({ ...filters, overstock: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-600">Overstock Only</span>
          </label>

          <button
            onClick={fetchData}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Product</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Category</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Branch</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Quantity</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Min/Max</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Status</th>
                {isManager && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredInventory.map((item) => {
                const status = getStockStatus(item);
                return (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-3">
                        <Package className="w-5 h-5 text-gray-400" />
                        <span className="font-medium text-gray-800">{item.product_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.category}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.branch_name}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${
                        status === 'low' ? 'text-red-600' :
                        status === 'overstock' ? 'text-yellow-600' : 'text-gray-800'
                      }`}>
                        {item.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {item.min_stock} / {item.max_stock}
                    </td>
                    <td className="px-4 py-3">
                      {status === 'low' && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <AlertTriangle className="w-3 h-3 mr-1" /> Low Stock
                        </span>
                      )}
                      {status === 'overstock' && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Overstock
                        </span>
                      )}
                      {status === 'normal' && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Normal
                        </span>
                      )}
                    </td>
                    {isManager && (
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setEditModal({ open: true, item, quantity: item.quantity })}
                            className="px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setTransferModal({ open: true, item, form: { quantity: 10 } })}
                            className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                          >
                            Transfer
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredInventory.length === 0 && (
          <div className="p-8 text-center text-gray-400">
            No inventory items found
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Update Quantity</h3>
            <p className="text-sm text-gray-600 mb-4">
              {editModal.item?.product_name} at {editModal.item?.branch_name}
            </p>
            <input
              type="number"
              value={editModal.quantity}
              onChange={(e) => setEditModal({ ...editModal, quantity: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setEditModal({ open: false, item: null, quantity: '' })}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateQuantity}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {transferModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <form onSubmit={handleTransfer} className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Transfer Stock</h3>
            <p className="text-sm text-gray-600 mb-4">
              Transfer {transferModal.item?.product_name} from {transferModal.item?.branch_name}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">To Branch</label>
                <select
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  onChange={(e) => setTransferModal({
                    ...transferModal,
                    form: { ...transferModal.form, toBranch: e.target.value }
                  })}
                >
                  <option value="">Select branch</option>
                  {branches.filter(b => b.id !== transferModal.item?.branch_id).map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  max={transferModal.item?.quantity}
                  required
                  value={transferModal.form?.quantity || ''}
                  onChange={(e) => setTransferModal({
                    ...transferModal,
                    form: { ...transferModal.form, quantity: e.target.value }
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setTransferModal({ open: false, item: null, form: {} })}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Transfer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Inventory;