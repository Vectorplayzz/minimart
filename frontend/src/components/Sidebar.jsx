import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Store,
  Bell,
  LogOut,
  Menu,
  X,
  Truck,
  FileText,
  Lightbulb,
  Users,
  Boxes
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user, logout, isAdmin, isManager } = useAuth();

  const isStaff = user?.role === 'staff';
  const canAccess = isAdmin || isManager;

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'manager', 'staff'] },
    { path: '/inventory', icon: Package, label: 'Inventory', roles: ['admin', 'manager', 'staff'] },
    { path: '/sales', icon: ShoppingCart, label: 'Sales', roles: ['admin', 'manager', 'staff'] },
    { path: '/branches', icon: Store, label: 'Branches', roles: ['admin', 'manager'] },
    { path: '/products', icon: Boxes, label: 'Products', roles: ['admin'] },
    { path: '/transfers', icon: Truck, label: 'Transfers', roles: ['admin', 'manager'] },
    { path: '/reports', icon: FileText, label: 'Reports', roles: ['admin', 'manager'] },
    { path: '/insights', icon: Lightbulb, label: 'Insights', roles: ['admin', 'manager'] },
    { path: '/alerts', icon: Bell, label: 'Alerts', roles: ['admin', 'manager'] },
  ];

  const isActive = (path) => location.pathname === path;

  const visibleNavItems = navItems.filter(item => 
    item.roles.includes(user?.role)
  );

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      <aside className={`
        fixed top-0 left-0 h-full w-64 sidebar z-50 transform transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="flex items-center justify-between p-4 border-b border-blue-800">
          <div className="flex items-center space-x-2">
            <Package className="w-8 h-8 text-white" />
            <span className="text-xl font-bold text-white">Mini-Mart</span>
          </div>
          <button onClick={onClose} className="lg:hidden text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-180px)]">
          {visibleNavItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={`
                flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200
                ${isActive(item.path) 
                  ? 'bg-blue-600 text-white' 
                  : 'text-blue-100 hover:bg-blue-800 hover:text-white'
                }
              `}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-blue-800">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-medium">{user?.username}</p>
              <p className="text-blue-200 text-xs capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center space-x-2 text-blue-200 hover:text-white transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;