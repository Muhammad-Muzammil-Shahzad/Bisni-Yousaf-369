import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import EmployeeDelete from './pages/Employee.delete';
import EmployeeRead from './pages/Employee.read';
import EmployeeUpdate from './pages/Employee.update';
import InvoiceCreate from './pages/Invoice.create';
import InvoiceRead from './pages/Invoice.read';
import InvoiceUpdate from './pages/Invoice.Update';
import InvoiceDelete from './pages/Invoice.delete';
import StockRead from './pages/Stock.read';
import StockDelete from './pages/Stock.delete';
import StockUpdate from './pages/Stock.update';
import Session from './pages/Session';
import Stats from './pages/Stats';

const App = () => {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Navigation Sidebar */}
      <Navigation />
      
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <Routes>
            <Route path="/" element={<Navigate to="/stats" replace />} />
            <Route path="/delete_employee" element={<EmployeeDelete />} />
            <Route path="/read_employee" element={<EmployeeRead />} />
            <Route path="/update_employee" element={<EmployeeUpdate />} />
            <Route path="/create_invoice" element={<InvoiceCreate />} />
            <Route path="/read_invoice" element={<InvoiceRead />} />
            <Route path="/update_invoice" element={<InvoiceUpdate />} />
            <Route path="/delete_invoice" element={<InvoiceDelete />} />
            <Route path="/read_stock" element={<StockRead />} />
            <Route path="/delete_stock" element={<StockDelete />} />
            <Route path="/update_stock" element={<StockUpdate />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/session" element={<Session />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default App;