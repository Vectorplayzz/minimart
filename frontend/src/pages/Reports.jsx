import React, { useState, useEffect } from 'react';
import { FileText, Download, Package, AlertTriangle, Clock, Truck, ShoppingCart } from 'lucide-react';
import { reportAPI, branchAPI } from '../services/api';

const Reports = () => {
  const [activeTab, setActiveTab] = useState('inventory');
  const [reports, setReports] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ branch_id: '' });

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [activeTab, filters]);

  const fetchBranches = async () => {
    try {
      const res = await branchAPI.getAll();
      setBranches(res.data.filter(b => b.is_active));
    } catch (error) {
      console.error('Failed to fetch branches:', error);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      let data;
      const params = { ...filters, format: 'csv' };
      delete params.format; // Remove format for JSON, handle separately
      
      switch (activeTab) {
        case 'inventory':
          data = await reportAPI.getInventoryReport(filters);
          break;
        case 'low-stock':
          data = await reportAPI.getLowStockReport(filters);
          break;
        case 'expiry':
          data = await reportAPI.getExpiryReport(filters);
          break;
        case 'transfers':
          data = await reportAPI.getTransferReport(filters);
          break;
        case 'sales':
          data = await reportAPI.getSalesReport(filters);
          break;
        default:
          data = [];
      }
      setReports(data.report || data);
    } catch (error) {
      console.error('Failed to fetch report:', error);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const getEndpoint = () => {
      switch (activeTab) {
        case 'inventory': return 'inventory';
        case 'low-stock': return 'low-stock';
        case 'expiry': return 'expiry';
        case 'transfers': return 'transfers';
        case 'sales': return 'sales';
        default: return 'inventory';
      }
    };

    const params = new URLSearchParams(filters);
    params.set('format', 'csv');
    
    const token = localStorage.getItem('token');
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    window.open(`${baseUrl}/reports/${getEndpoint()}?${params.toString()}`, '_blank');
  };

  const tabs = [
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'low-stock', label: 'Low Stock', icon: AlertTriangle },
    { id: 'expiry', label: 'Expiry', icon: Clock },
    { id: 'transfers', label: 'Transfers', icon: Truck },
    { id: 'sales', label: 'Sales', icon: ShoppingCart },
  ];

  const getColumns = () => {
    switch (activeTab) {
      case 'inventory':
        return ['product_name', 'category', 'branch_name', 'quantity', 'reserved_quantity', 'available_quantity', 'stock_status'];
      case 'low-stock':
        return ['product_name', 'category', 'branch_name', 'quantity', 'min_stock', 'deficit'];
      case 'expiry':
        return ['product_name', 'category', 'expiry_date', 'days_until_expiry', 'total_stock'];
      case 'transfers':
        return ['transfer_no', 'product_name', 'from_branch', 'to_branch', 'quantity', 'status', 'requested_at'];
      case 'sales':
        return ['date', 'product_name', 'branch_name', 'quantity_sold'];
      default:
        return [];
    }
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Reports</h2>
            <p className="text-sm text-gray-500">View and export system reports</p>
          </div>
        </div>
        
        <button onClick={handleExport} className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Branch</label>
            <select
              value={filters.branch_id}
              onChange={(e) => setFilters({ ...filters, branch_id: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
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
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : reports.length > 0 ? (
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
                {reports.slice(0, 100).map((row, idx) => (
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
        
        {!loading && reports.length > 100 && (
          <div className="p-4 text-center text-sm text-gray-500 border-t">
            Showing first 100 of {reports.length} rows. Export to CSV for full data.
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;