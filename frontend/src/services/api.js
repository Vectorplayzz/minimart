import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

export const productAPI = {
  getAll: () => api.get('/products'),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  getCategories: () => api.get('/products/categories'),
};

export const branchAPI = {
  getAll: () => api.get('/branches'),
  getById: (id) => api.get(`/branches/${id}`),
  getInventory: (id) => api.get(`/branches/${id}/inventory`),
  create: (data) => api.post('/branches', data),
  update: (id, data) => api.put(`/branches/${id}`, data),
  delete: (id) => api.delete(`/branches/${id}`),
};

export const inventoryAPI = {
  getAll: (params) => api.get('/inventory', { params }),
  getSummary: () => api.get('/inventory/summary'),
  getByBranch: (branchId) => api.get(`/inventory/branch/${branchId}`),
  update: (data) => api.post('/inventory', data),
  setQuantity: (id, quantity) => api.put(`/inventory/${id}`, { quantity }),
};

export const salesAPI = {
  getAll: (params) => api.get('/sales', { params }),
  getHistory: (limit) => api.get('/sales/history', { params: { limit } }),
  getDaily: (date) => api.get('/sales/daily', { params: { date } }),
  getTrend: (days) => api.get('/sales/trend', { params: { days } }),
  getTopProducts: (days, limit) => api.get('/sales/top', { params: { days, limit } }),
  getByProductBranch: (productId, branchId, days) => api.get(`/sales/${productId}/${branchId}`, { params: { days } }),
  create: (data) => api.post('/sales', data),
};

export const alertAPI = {
  getAll: () => api.get('/alerts'),
  getSummary: () => api.get('/alerts/summary'),
  getLowStock: () => api.get('/alerts/low-stock'),
  getOverstock: () => api.get('/alerts/overstock'),
  getExpiry: () => api.get('/alerts/expiry'),
};

export const predictionAPI = {
  getAll: () => api.get('/predictions/all'),
  getRecommendation: (productId) => api.get(`/predictions/recommendations/${productId}`),
  getPrediction: (productId, branchId) => api.get(`/predictions/${productId}/${branchId}`),
  train: () => api.post('/predictions/train'),
};

export const transferAPI = {
  getAll: (params) => api.get('/transfers', { params }),
  getById: (id) => api.get(`/transfers/${id}`),
  getStats: () => api.get('/transfers/stats'),
  create: (data) => api.post('/transfers', data),
  approve: (id) => api.put(`/transfers/${id}/approve`),
  markInTransit: (id) => api.put(`/transfers/${id}/in-transit`),
  deliver: (id, data) => api.put(`/transfers/${id}/deliver`, data),
  cancel: (id) => api.put(`/transfers/${id}/cancel`),
};

export const reportAPI = {
  getInventoryReport: (params) => api.get('/reports/inventory', { params }),
  getLowStockReport: (params) => api.get('/reports/low-stock', { params }),
  getExpiryReport: (params) => api.get('/reports/expiry', { params }),
  getTransferReport: (params) => api.get('/reports/transfers', { params }),
  getSalesReport: (params) => api.get('/reports/sales', { params }),
};

export const insightAPI = {
  getOverstock: () => api.get('/insights/overstock'),
  getUnderstock: () => api.get('/insights/understock'),
  getFastMoving: (params) => api.get('/insights/fast-moving', { params }),
  getSlowMoving: (params) => api.get('/insights/slow-moving', { params }),
  getRebalance: () => api.get('/insights/rebalance'),
  getForecast: (productId, branchId, days) => api.get(`/insights/forecast/${productId}/${branchId}`, { params: { days } }),
  getDaysUntilStockout: (productId, branchId) => api.get(`/insights/days-until-stockout/${productId}/${branchId}`),
  getExpiryRisk: (params) => api.get('/insights/expiry-risk', { params }),
};

export default api;