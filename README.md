# Mini-Mart 2 - Inventory Management System

A comprehensive inventory management system with AI-powered demand prediction, stock transfers, and smart insights for multi-branch retail chains.

## Features

### 1. Authentication & Roles
- JWT-based login system
- Three roles: **Admin**, **Manager**, **Staff**
- Role-based access control

### 2. Product Management (Admin Only)
- Add/Edit/Delete products
- Track SKU, category, expiry dates
- Set min/max stock levels per product

### 3. Branch Management (Admin Only)
- Create and manage multiple branches
- Mark branches as warehouse
- Each branch maintains independent inventory

### 4. Inventory Management
- Track product stock per branch
- Track reserved quantity (for pending transfers)
- Auto-detect low stock (quantity < min_stock)
- Auto-detect overstock (quantity > max_stock)
- Expiry date tracking

### 5. Inter-Branch Stock Transfers
- Request stock from other branches
- Transfer workflow: **Pending → Approved → In Transit → Delivered**
- Stock rules:
  - On **approve**: Reserve stock at source
  - On **in transit**: Deduct from source
  - On **delivered**: Add to destination

### 6. Sales Tracking
- Record daily product sales per branch
- Maintain sales history per product and branch
- Daily sales summary

### 7. Reports (Admin/Manager)
- Inventory report per branch
- Low stock report
- Expiry report
- Transfer history report
- Sales summary report
- **CSV Export** for all reports

### 8. Smart Inventory Insights (Admin/Manager)
- Overstock detection
- Understock detection
- Fast-moving products analysis
- Slow-moving products analysis
- Rebalance suggestions

### 9. ML-Based Forecasting (Admin/Manager)
- 7-day moving average
- 30-day moving average
- Demand trend analysis
- Days until stockout prediction
- 7-day demand forecast

## Tech Stack

- **Frontend**: React 18 + Tailwind CSS + Recharts
- **Backend**: Node.js + Express.js
- **Database**: MySQL
- **AI Module**: Python Flask (optional)

## Project Structure

```
mini-mart-2/
├── backend/           # Node.js API server
│   ├── config/       # Database configuration
│   ├── controllers/   # API route handlers
│   ├── middleware/   # Auth middleware
│   ├── routes/       # API routes
│   ├── models/       # Database initialization
│   ├── seed.js       # Database seeding script
│   └── server.js     # Main server file
├── frontend/         # React application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/ # API services
│   │   └── context/  # Auth context
└── database/         # SQL schemas
```

## Database Configuration

The system connects to a remote MySQL database:
```
DB_HOST=your-mysql-host
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
```

## Setup Instructions

### 1. Backend Setup

```bash
cd backend
npm install
npm start
```

The API will run on `http://localhost:5000`

### 2. Database Seeding (First Run)

```bash
cd backend
node seed.js
```

This creates:
- Default users (admin/manager/staff)
- Sample branches
- Sample products
- Sample inventory
- Sample sales data

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Products (Admin)
- `GET /api/products` - List all products
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Branches (Admin)
- `GET /api/branches` - List branches
- `POST /api/branches` - Create branch
- `PUT /api/branches/:id` - Update branch
- `DELETE /api/branches/:id` - Delete branch

### Inventory
- `GET /api/inventory` - List inventory
- `GET /api/inventory/branch/:branchId` - Branch inventory
- `POST /api/inventory` - Create/Update inventory
- `PUT /api/inventory/:id` - Update quantity

### Stock Transfers (Admin/Manager)
- `GET /api/transfers` - List transfers
- `POST /api/transfers` - Create transfer
- `PUT /api/transfers/:id/approve` - Approve
- `PUT /api/transfers/:id/in-transit` - Mark in transit
- `PUT /api/transfers/:id/deliver` - Confirm delivery

### Sales
- `GET /api/sales` - List sales
- `GET /api/sales/daily` - Today's sales
- `POST /api/sales` - Record sale

### Reports (Admin/Manager)
- `GET /api/reports/inventory` - Inventory report
- `GET /api/reports/low-stock` - Low stock report
- `GET /api/reports/expiry` - Expiry report
- `GET /api/reports/transfers` - Transfer report
- `GET /api/reports/sales` - Sales report

### Insights (Admin/Manager)
- `GET /api/insights/overstock` - Overstock items
- `GET /api/insights/understock` - Understock items
- `GET /api/insights/fast-moving` - Fast-moving products
- `GET /api/insights/slow-moving` - Slow-moving products
- `GET /api/insights/rebalance` - Rebalance suggestions
- `GET /api/insights/forecast/:productId/:branchId` - Demand forecast
- `GET /api/insights/days-until-stockout/:productId/:branchId` - Stockout prediction

## Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Manager | manager | manager123 |
| Staff | staff | staff123 |

## Role Permissions

### Admin
- Full access to all features
- Manage users, products, branches
- Approve/manage transfers
- View all reports and insights

### Manager
- Manage inventory
- Create transfers
- View reports and insights
- Record sales

### Staff
- View inventory (own branch only)
- Record sales
- No access to transfers, reports, insights, products, branches

## Running the Full System

1. Start backend: `cd backend && npm start`
2. Seed database: `cd backend && node seed.js`
3. Start frontend: `cd frontend && npm run dev`

Open `http://localhost:3000` in your browser.

## License

MIT