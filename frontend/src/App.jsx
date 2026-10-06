import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import SalesEntry from './pages/SalesEntry';
import Branches from './pages/Branches';
import Products from './pages/Products';
import Transfers from './pages/Transfers';
import Reports from './pages/Reports';
import Insights from './pages/Insights';
import Alerts from './pages/Alerts';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="sales" element={<SalesEntry />} />
        <Route path="branches" element={<Branches />} />
        <Route path="products" element={<Products />} />
        <Route path="transfers" element={<Transfers />} />
        <Route path="reports" element={<Reports />} />
        <Route path="insights" element={<Insights />} />
        <Route path="alerts" element={<Alerts />} />
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;