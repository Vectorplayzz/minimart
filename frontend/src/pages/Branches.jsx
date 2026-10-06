import React, { useState, useEffect } from 'react';
import { Store, Plus, MapPin, Package, Edit, Trash2, Building2 } from 'lucide-react';
import { branchAPI, inventoryAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Branches = () => {
  const { isAdmin, isManager } = useAuth();
  const [branches, setBranches] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [form, setForm] = useState({
    name: '',
    location: '',
    is_warehouse: false,
  });
  const [selectedBranch, setSelectedBranch] = useState(null);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const res = await branchAPI.getAll();
      setBranches(res.data);
    } catch (error) {
      console.error('Failed to fetch branches:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranchInventory = async (branchId) => {
    try {
      const res = await branchAPI.getInventory(branchId);
      setInventory(res.data);
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBranch) {
        await branchAPI.update(editingBranch.id, form);
      } else {
        await branchAPI.create(form);
      }
      setShowModal(false);
      setEditingBranch(null);
      setForm({ name: '', location: '', is_warehouse: false });
      fetchBranches();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to save branch');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this branch?')) return;
    try {
      await branchAPI.delete(id);
      fetchBranches();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete branch');
    }
  };

  const handleViewInventory = (branch) => {
    setSelectedBranch(branch);
    fetchBranchInventory(branch.id);
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
      {/* Add Branch Button */}
      {isAdmin && (
        <div className="flex justify-end">
          <button
            onClick={() => {
              setShowModal(true);
              setEditingBranch(null);
              setForm({ name: '', location: '', is_warehouse: false });
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            <span>Add Branch</span>
          </button>
        </div>
      )}

      {/* Branches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {branches.map((branch) => (
          <div key={branch.id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`p-3 rounded-lg ${branch.is_warehouse ? 'bg-purple-100' : 'bg-blue-100'}`}>
                  {branch.is_warehouse ? (
                    <Building2 className="w-6 h-6 text-purple-600" />
                  ) : (
                    <Store className="w-6 h-6 text-blue-600" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{branch.name}</h3>
                  {branch.is_warehouse && (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">Warehouse</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center text-sm text-gray-600 mb-4">
              <MapPin className="w-4 h-4 mr-2" />
              {branch.location}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Products</p>
                <p className="text-lg font-semibold text-gray-800">{branch.product_count || 0}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Total Stock</p>
                <p className="text-lg font-semibold text-gray-800">{branch.total_stock || 0}</p>
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => handleViewInventory(branch)}
                className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                <Package className="w-4 h-4" />
                <span>View Stock</span>
              </button>
              {isAdmin && (
                <>
                  <button
                    onClick={() => {
                      setEditingBranch(branch);
                      setForm({
                        name: branch.name,
                        location: branch.location,
                        is_warehouse: !!branch.is_warehouse,
                      });
                      setShowModal(true);
                    }}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(branch.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Inventory Detail Modal */}
      {selectedBranch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Inventory: {selectedBranch.name}
              </h3>
              <button
                onClick={() => setSelectedBranch(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="overflow-auto flex-1">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Product</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Category</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Quantity</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Min/Max</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100">
                      <td className="px-4 py-3 text-sm text-gray-800">{item.product_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.category}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {item.min_stock} / {item.max_stock}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Branch Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {editingBranch ? 'Edit Branch' : 'Add New Branch'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Branch Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Downtown Store"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 123 Main Street"
                />
              </div>
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={form.is_warehouse}
                    onChange={(e) => setForm({ ...form, is_warehouse: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Is Warehouse</span>
                </label>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingBranch(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingBranch ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Branches;