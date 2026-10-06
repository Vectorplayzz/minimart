import React from 'react';

const AlertBadge = ({ type, count }) => {
  const config = {
    low_stock: { color: 'bg-red-500', label: 'Low Stock' },
    overstock: { color: 'bg-yellow-500', label: 'Overstock' },
    expiry: { color: 'bg-orange-500', label: 'Expiry' },
    success: { color: 'bg-green-500', label: 'Success' },
    info: { color: 'bg-blue-500', label: 'Info' },
  };

  const { color, label } = config[type] || config.info;

  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full ${color} text-white text-sm font-medium`}>
      <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></span>
      {label}
      {count !== undefined && (
        <span className="ml-2 bg-white bg-opacity-20 px-2 py-0.5 rounded-full text-xs">
          {count}
        </span>
      )}
    </div>
  );
};

export default AlertBadge;