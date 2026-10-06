import React, { useState, useEffect } from 'react';
import { Truck, Plus, Search, Filter, RefreshCw, Check, Package, ArrowRight, X } from 'lucide-react';
import { transferAPI, productAPI, branchAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Transfers = () => {
  const { isAdmin, isManager } = useAuth();
  const [transfers, setTransfers] = useState([]);
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '' });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeliverModal, setShowDeliverModal] = useState(null);
  const [deliverQty, setDeliverQty] = useState('');
  const [newTransfer, setNewTransfer] = useState({
    product_id: '',
    from_branch_id: '',
    to_branch_id: '',
    quantity: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [transfersRes, productsRes, branchesRes] = await Promise.all([
        transferAPI.getAll(filters),
        productAPI.getAll(),
        branchAPI.getAll(),
      ]);
      setTransfers(transfersRes.data);
      setProducts(productsRes.data);
      setBranches(branchesRes.data.filter(b => b.is_active));
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    try {
      await transferAPI.create(newTransfer);
      setShowCreateModal(false);
      setNewTransfer({ product_id: '', from_branch_id: '', to_branch_id: '', quantity: '', notes: '' });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create transfer');
    }
  };

  const handleApprove = async (id) => {
    try {
      await transferAPI.approve(id);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to approve');
    }
  };

  const handleInTransit = async (id) => {
    try {
      await transferAPI.markInTransit(id);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to mark in transit');
    }
  };

  const handleDeliver = async (id) => {
    try {
      await transferAPI.deliver(id, { received_quantity: parseInt(deliverQty) });
      setShowDeliverModal(null);
      setDeliverQty('');
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to deliver');
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('Are you sure you want to cancel this transfer?')) return;
    try {
      await transferAPI.cancel(id);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to cancel');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      in_transit: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pending',
      approved: 'Approved',
      in_transit: 'In Transit',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    };
    return labels[status] || status;
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
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Truck className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Stock Transfers</h2>
            <p className="text-sm text-gray-500">Manage inter-branch stock transfers</p>
          </div>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          <span>New Transfer</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">Status:</span>
          </div>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="in_transit">In Transit</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
          
          <button onClick={fetchData} className="p-2 hover:bg-gray-100 rounded-lg">
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Transfer List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Transfer #</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Product</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">From</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">To</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Qty</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transfers.map((transfer) => (
              <tr key={transfer.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-800">{transfer.transfer_no}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{transfer.product_name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{transfer.from_branch_name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  <div className="flex items-center">
                    <ArrowRight className="w-4 h-4 text-gray-400 mr-1" />
                    {transfer.to_branch_name}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-800">{transfer.quantity}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transfer.status)}`}>
                    {getStatusLabel(transfer.status)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center space-x-2">
                    {transfer.status === 'pending' && (
                      <>
                        <button onClick={() => handleApprove(transfer.id)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Approve">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleCancel(transfer.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Cancel">
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {transfer.status === 'approved' && (
                      <button onClick={() => handleInTransit(transfer.id)} className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200">
                        Mark In Transit
                      </button>
                    )}
                    {transfer.status === 'in_transit' && (
                      <button 
                        onClick={() => {
                          setShowDeliverModal(transfer.id);
                          setDeliverQty(transfer.quantity.toString());
                        }} 
                        className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                      >
                        Deliver
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {transfers.length === 0 && (
          <div className="p-8 text-center text-gray-400">No transfers found</div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Create Transfer Request</h3>
            <form onSubmit={handleCreateTransfer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product</label>
                <select
                  value={newTransfer.product_id}
                  onChange={(e) => setNewTransfer({ ...newTransfer, product_id: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select product</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From Branch</label>
                <select
                  value={newTransfer.from_branch_id}
                  onChange={(e) => setNewTransfer({ ...newTransfer, from_branch_id: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select source</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">To Branch</label>
                <select
                  value={newTransfer.to_branch_id}
                  onChange={(e) => setNewTransfer({ ...newTransfer, to_branch_id: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select destination</option>
                  {branches.filter(b => b.id !== parseInt(newTransfer.from_branch_id)).map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={newTransfer.quantity}
                  onChange={(e) => setNewTransfer({ ...newTransfer, quantity: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={newTransfer.notes}
                  onChange={(e) => setNewTransfer({ ...newTransfer, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows="2"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Create Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deliver Modal */}
      {showDeliverModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Confirm Delivery</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Received Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={deliverQty}
                  onChange={(e) => setDeliverQty(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button onClick={() => setShowDeliverModal(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                  Cancel
                </button>
                <button onClick={() => handleDeliver(showDeliverModal)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  Confirm Delivery
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transfers;