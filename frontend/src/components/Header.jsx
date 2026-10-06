import React from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Bell } from 'lucide-react';

const pageNames = {
  '/': 'Dashboard',
  '/inventory': 'Inventory Management',
  '/sales': 'Sales Entry',
  '/predictions': 'Demand Predictions',
  '/branches': 'Branch Management',
  '/alerts': 'Alerts & Notifications',
};

const Header = ({ onMenuClick }) => {
  const location = useLocation();
  const pageName = pageNames[location.pathname] || 'Mini-Mart 2';

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center space-x-4">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-xl font-semibold text-gray-800">{pageName}</h1>
      </div>

      <div className="flex items-center space-x-4">
        <button className="relative p-2 hover:bg-gray-100 rounded-lg">
          <Bell className="w-5 h-5 text-gray-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        <div className="hidden md:flex items-center space-x-2">
          <span className="text-sm text-gray-600">Current Date:</span>
          <span className="text-sm font-medium text-gray-800">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'short', 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            })}
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;