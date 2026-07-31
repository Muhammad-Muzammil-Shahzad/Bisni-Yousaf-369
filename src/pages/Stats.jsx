// DashboardStats.jsx - Fixed active session invoices filter
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'https://bisni-ms-backend.onrender.com/api';

const DashboardStats = () => {
  const [stats, setStats] = useState(null);
  const [sessionInvoices, setSessionInvoices] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  const [filterType, setFilterType] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterEmployeeCategory, setFilterEmployeeCategory] = useState('');
  const [filterEmployeeName, setFilterEmployeeName] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchActiveSession();
    fetchSessionInvoices();
    const interval = setInterval(() => {
      fetchStats();
      fetchActiveSession();
      fetchSessionInvoices();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchActiveSession = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/session`);
      setActiveSession(response.data.data || null);
    } catch (error) {
      setActiveSession(null);
    }
  };

  const fetchSessionInvoices = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/invoice`);
      setSessionInvoices(response.data.data || response.data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
  };

  // Get only active session invoices
  const getActiveSessionInvoices = () => {
    if (!activeSession || !activeSession.salesDetails) return [];
    const sessionEmployeeNames = activeSession.salesDetails.map(s => s.employeeName);
    return sessionInvoices.filter(inv => sessionEmployeeNames.includes(inv.employeeName));
  };

  const activeSessionInvoices = getActiveSessionInvoices();

  const fetchStats = async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (filters.date) params.append('date', filters.date);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.employeeCategory) params.append('employeeCategory', filters.employeeCategory);
      if (filters.employeeName) params.append('employeeName', filters.employeeName);
      const queryString = params.toString();
      const url = queryString ? `${API_BASE_URL}/stats?${queryString}` : `${API_BASE_URL}/stats`;
      const response = await axios.get(url);
      setStats(response.data.data);
      setSuccess('Statistics updated');
    } catch (error) {
      let errorMessage = 'Failed to load statistics.';
      if (error.response) errorMessage = error.response.data?.message || `Server error (${error.response.status})`;
      else if (error.request) errorMessage = 'Cannot connect to server.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterApply = () => {
    const filters = {};
    if (filterType === 'date' && filterDate) filters.date = filterDate;
    if (filterType === 'range') {
      if (filterStartDate) filters.startDate = filterStartDate;
      if (filterEndDate) filters.endDate = filterEndDate;
    }
    if (filterEmployeeCategory) filters.employeeCategory = filterEmployeeCategory;
    if (filterEmployeeName) filters.employeeName = filterEmployeeName;
    fetchStats(filters);
  };

  const handleClearFilters = () => {
    setFilterType('all'); setFilterDate(''); setFilterStartDate('');
    setFilterEndDate(''); setFilterEmployeeCategory(''); setFilterEmployeeName('');
    fetchStats();
  };

  // Calculate active session stats from ACTIVE SESSION invoices only
  const getActiveSessionStats = () => {
    if (activeSessionInvoices.length === 0) return { totalSales: 0, totalItemsSold: 0, totalCommission: 0, employeeCount: 0 };
    
    const totalSales = activeSessionInvoices.reduce((sum, inv) => sum + (inv.grandTotalAmount || 0), 0);
    const totalItemsSold = activeSessionInvoices.reduce((sum, inv) => 
      sum + (inv.products || []).reduce((pSum, p) => pSum + (p.productQuantity || 0), 0), 0
    );
    
    let totalCommission = 0;
    const uniqueEmployees = new Set();
    activeSessionInvoices.forEach(inv => {
      uniqueEmployees.add(inv.employeeName);
      const sessionEmp = activeSession?.salesDetails?.find(s => s.employeeName === inv.employeeName);
      if (sessionEmp) {
        totalCommission += sessionEmp.commissionEarned || 0;
      }
    });
    
    return { totalSales, totalItemsSold, totalCommission, employeeCount: uniqueEmployees.size };
  };

  // Calculate items sold for a specific category from ALL invoices (for category cards)
  const getCategoryItemsSold = (category) => {
    if (!sessionInvoices.length) return 0;
    return sessionInvoices
      .filter(inv => inv.employeeCategory === category)
      .reduce((sum, inv) => 
        sum + (inv.products || []).reduce((pSum, p) => pSum + (p.productQuantity || 0), 0), 0
      );
  };

  // Calculate total orders for a specific category
  const getCategoryTotalOrders = (category) => {
    if (!sessionInvoices.length) return 0;
    return sessionInvoices.filter(inv => inv.employeeCategory === category).length;
  };

  // Calculate total revenue for a specific category
  const getCategoryTotalRevenue = (category) => {
    if (!sessionInvoices.length) return 0;
    return sessionInvoices
      .filter(inv => inv.employeeCategory === category)
      .reduce((sum, inv) => sum + (inv.grandTotalAmount || 0), 0);
  };

  // Calculate total commission for a specific category
  const getCategoryTotalCommission = (category, data) => {
    return data?.totalCommission || 0;
  };

  const activeSessionStats = getActiveSessionStats();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0);
  };

  const formatNumber = (number) => new Intl.NumberFormat('en-US').format(number || 0);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const clearMessages = () => { setError(null); setSuccess(null); };

  const getMaxSales = (employees) => {
    if (!employees || employees.length === 0) return 1;
    return Math.max(...employees.map(e => e.sales || 0), 1);
  };

  const getMaxCommission = (employees) => {
    if (!employees || employees.length === 0) return 1;
    return Math.max(...employees.map(e => e.commission || 0), 1);
  };

  // Calculate commission for an invoice from active session
  const getInvoiceCommission = (invoice) => {
    const sessionEmp = activeSession?.salesDetails?.find(s => s.employeeName === invoice.employeeName);
    if (!sessionEmp) return 0;
    const empTotalSales = sessionEmp.grandTotalAmount || 1;
    const proportion = (invoice.grandTotalAmount || 0) / empTotalSales;
    return (sessionEmp.commissionEarned || 0) * proportion;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-3 sm:py-4 md:py-5 px-2 sm:px-3 md:px-4 lg:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-5">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">DASHBOARD ANALYTICS</h1>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="mb-3 bg-red-50 border-l-4 border-red-500 p-2 sm:p-2.5 rounded-r-lg text-xs">
            <div className="flex items-start">
              <span className="mr-2 shrink-0">❌</span>
              <p className="text-red-700 flex-1 break-words">{error}</p>
              <button onClick={clearMessages} className="text-red-400 hover:text-red-600 shrink-0 ml-1">✕</button>
            </div>
          </div>
        )}
        {success && (
          <div className="mb-3 bg-green-50 border-l-4 border-green-500 p-2 sm:p-2.5 rounded-r-lg text-xs">
            <div className="flex items-start">
              <span className="mr-2 shrink-0">✅</span>
              <p className="text-green-700 flex-1 break-words">{success}</p>
              <button onClick={clearMessages} className="text-green-400 hover:text-green-600 shrink-0 ml-1">✕</button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && !stats && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="flex justify-center items-center py-12 sm:py-16">
              <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-blue-600"></div>
            </div>
          </div>
        )}

        {/* Stats Content */}
        {stats && (
          <div className="space-y-3 sm:space-y-4">
            {/* Category-wise Sections with Separate Boxes for Orders, Revenue, and Commission */}
            {Object.keys(stats.commissionByCategory).length > 0 ? (
              <div className="space-y-4 sm:space-y-5">
                {Object.entries(stats.commissionByCategory).map(([category, data]) => {
                  const categoryTotalOrders = getCategoryTotalOrders(category);
                  const categoryTotalRevenue = getCategoryTotalRevenue(category);
                  const categoryTotalCommission = getCategoryTotalCommission(category, data);
                  
                  return (
                    <div key={category}>
                      {/* Separate Boxes for Orders, Revenue, and Commission */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                        {/* Total Orders Box */}
                        <div className="bg-white rounded-lg shadow-md overflow-hidden w-full">
                          <div className="bg-blue-500 px-3 sm:px-4 py-2 sm:py-2.5">
                            <h3 className="text-xs font-semibold text-white truncate">Total Orders - {category}</h3>
                          </div>
                          <div className="p-3 sm:p-4 text-center">
                            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-600">{categoryTotalOrders}</p>
                            <p className="text-xs text-gray-600 mt-1">Orders</p>
                          </div>
                        </div>

                        {/* Total Revenue Box */}
                        <div className="bg-white rounded-lg shadow-md overflow-hidden w-full">
                          <div className="bg-blue-500 px-3 sm:px-4 py-2 sm:py-2.5">
                            <h3 className="text-xs font-semibold text-white truncate">Total Revenue - {category}</h3>
                          </div>
                          <div className="p-3 sm:p-4 text-center">
                            <p className="text-base sm:text-xl lg:text-2xl font-bold text-blue-600 truncate">Rs. {formatCurrency(categoryTotalRevenue)}</p>
                            <p className="text-xs text-gray-600 mt-1">Revenue</p>
                          </div>
                        </div>

                        {/* Total Commission Box */}
                        <div className="bg-white rounded-lg shadow-md overflow-hidden w-full">
                          <div className="bg-blue-500 px-3 sm:px-4 py-2 sm:py-2.5">
                            <h3 className="text-xs font-semibold text-white truncate">Total Commission - {category}</h3>
                          </div>
                          <div className="p-3 sm:p-4 text-center">
                            <p className="text-base sm:text-xl lg:text-2xl font-bold text-blue-600 truncate">Rs. {formatCurrency(categoryTotalCommission)}</p>
                            <p className="text-xs text-gray-600 mt-1">Commission</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-6 sm:p-8 text-center">
                <span className="text-2xl">📊</span>
                <p className="mt-2 text-xs text-gray-500">No commission data available</p>
              </div>
            )}

            {/* Employee Performance */}
            {Object.keys(stats.commissionByCategory).length > 0 && (
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-3 sm:px-4 py-2">
                  <h2 className="text-xs sm:text-sm font-semibold text-white">Employee Performance</h2>
                </div>
                <div className="p-2 sm:p-3">
                  <div className="space-y-3 sm:space-y-4">
                    {Object.entries(stats.commissionByCategory).map(([category, data]) => (
                      <div key={category}>
                        <h3 className="text-xs font-semibold text-gray-900 mb-1.5 sm:mb-2 pb-1 sm:pb-1.5 border-b border-gray-200">
                          {category} ({data.employeeCount} employees)
                        </h3>
                        
                        {/* Mobile Card View for Employee Performance */}
                        <div className="block md:hidden space-y-2">
                          {data.employees.map((emp, idx) => (
                            <div key={idx} className="border border-gray-200 rounded-md p-2 bg-gray-50">
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-xs font-medium text-gray-900">{emp.employeeName}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-1 text-xs">
                                <div><span className="text-gray-500">Sales:</span> <span className="text-blue-600 font-medium">Rs. {formatCurrency(emp.sales)}</span></div>
                                <div><span className="text-gray-500">Items:</span> <span className="font-medium">{emp.itemsSold}</span></div>
                                <div className="col-span-2"><span className="text-gray-500">Commission:</span> <span className="text-green-600 font-medium">Rs. {formatCurrency(emp.commission)}</span></div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Desktop Table View for Employee Performance */}
                        <div className="overflow-x-auto hidden md:block">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500">Employee</th>
                                <th className="px-3 py-1.5 text-right text-xs font-medium text-gray-500">Sales</th>
                                <th className="px-3 py-1.5 text-center text-xs font-medium text-gray-500">Items Sold</th>
                                <th className="px-3 py-1.5 text-right text-xs font-medium text-gray-500">Commission</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {data.employees.map((emp, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="px-3 py-1.5 text-xs font-medium text-gray-900">{emp.employeeName}</td>
                                  <td className="px-3 py-1.5 text-xs text-right text-blue-600 font-medium">Rs. {formatCurrency(emp.sales)}</td>
                                  <td className="px-3 py-1.5 text-xs text-center text-gray-900">{emp.itemsSold}</td>
                                  <td className="px-3 py-1.5 text-xs text-right text-green-600 font-medium">Rs. {formatCurrency(emp.commission)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && !stats && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="text-center py-12 sm:py-16">
              <span className="text-3xl">📊</span>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No Statistics Available</h3>
              <button onClick={() => { fetchStats(); fetchActiveSession(); fetchSessionInvoices(); }} 
                className="mt-3 px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs font-medium">
                🔄 Retry
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardStats;
