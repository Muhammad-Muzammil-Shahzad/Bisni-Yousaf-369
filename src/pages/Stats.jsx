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
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 py-3 sm:py-4 md:py-5 px-2 sm:px-3 md:px-4 lg:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-5">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">DASHBOARD ANALYTICS</h1>
          <div className="mt-2 sm:mt-3 flex flex-col xs:flex-row justify-center gap-2">
            <button onClick={() => { fetchStats(); fetchActiveSession(); fetchSessionInvoices(); }}
              className="w-full xs:w-auto px-3 py-1.5 bg-white text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 text-xs font-medium">
              🔄 Refresh
            </button>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`w-full xs:w-auto px-3 py-1.5 border rounded-md text-xs font-medium ${
                showFilters ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}>
              🔍 {showFilters ? 'Hide' : 'Filters'}
            </button>
          </div>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="mb-3 bg-red-50 border-l-4 border-red-500 p-2 sm:p-2.5 rounded-r-lg text-xs">
            <div className="flex items-start">
              <span className="mr-2 shrink-0">❌</span>
              <p className="text-red-700 flex-1 wrap-break">{error}</p>
              <button onClick={clearMessages} className="text-red-400 hover:text-red-600 shrink-0 ml-1">✕</button>
            </div>
          </div>
        )}
        {success && (
          <div className="mb-3 bg-green-50 border-l-4 border-green-500 p-2 sm:p-2.5 rounded-r-lg text-xs">
            <div className="flex items-start">
              <span className="mr-2 shrink-0">✅</span>
              <p className="text-green-700 flex-1 wrap-break">{success}</p>
              <button onClick={clearMessages} className="text-green-400 hover:text-green-600 shrink-0 ml-1">✕</button>
            </div>
          </div>
        )}

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-3 sm:mb-4">
            <div className="bg-linear-to-r from-blue-600 to-cyan-600 px-3 sm:px-4 py-2">
              <h2 className="text-xs sm:text-sm font-semibold text-white">Filter Statistics</h2>
            </div>
            <div className="p-2 sm:p-3">
              <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)} 
                  className="px-2 py-1.5 border border-gray-300 rounded-md text-xs w-full">
                  <option value="all">All Time</option>
                  <option value="date">Specific Date</option>
                  <option value="range">Date Range</option>
                </select>
                {filterType === 'date' && (
                  <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} 
                    className="px-2 py-1.5 border border-gray-300 rounded-md text-xs w-full" />
                )}
                {filterType === 'range' && (
                  <>
                    <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} 
                      className="px-2 py-1.5 border border-gray-300 rounded-md text-xs w-full" />
                    <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} 
                      className="px-2 py-1.5 border border-gray-300 rounded-md text-xs w-full" />
                  </>
                )}
                <input type="text" value={filterEmployeeCategory} onChange={(e) => setFilterEmployeeCategory(e.target.value)} 
                  placeholder="Category" className="px-2 py-1.5 border border-gray-300 rounded-md text-xs w-full" />
                <input type="text" value={filterEmployeeName} onChange={(e) => setFilterEmployeeName(e.target.value)} 
                  placeholder="Employee name" className="px-2 py-1.5 border border-gray-300 rounded-md text-xs w-full" />
              </div>
              <div className="flex flex-col xs:flex-row justify-end gap-2">
                <button onClick={handleClearFilters} 
                  className="w-full xs:w-auto px-3 py-1.5 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 text-xs">
                  Clear
                </button>
                <button onClick={handleFilterApply} 
                  className="w-full xs:w-auto px-4 py-1.5 bg-linear-to-r from-blue-600 to-cyan-600 text-white rounded-md hover:from-blue-700 hover:to-cyan-700 text-xs">
                  Apply
                </button>
              </div>
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
            {/* Category-wise Sections with Stats and Graphs */}
            {Object.keys(stats.commissionByCategory).length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {Object.entries(stats.commissionByCategory).map(([category, data]) => {
                  const categoryItemsSold = getCategoryItemsSold(category);
                  
                  return (
                    <div key={category} className="bg-white rounded-lg shadow-md overflow-hidden">
                      <div className="bg-linear-to-r from-blue-600 to-cyan-600 px-3 sm:px-4 py-2 sm:py-2.5">
                        <div className="flex items-center justify-between">
                          <h2 className="text-xs sm:text-sm font-semibold text-white truncate mr-2">{category} ({data.employeeCount} employees)</h2>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-center justify-evenly gap-2 sm:gap-3 p-2 sm:p-3">
                        <div className="bg-gray-50 w-full sm:w-70 rounded-md p-2 sm:p-2.5 text-center border-l-4 border-blue-500">
                          <p className="text-xs text-gray-600">Total Orders</p>
                          <p className="text-base sm:text-lg font-bold text-gray-900">
                            {sessionInvoices.filter(inv => inv.employeeCategory === category).length}
                          </p>
                        </div>
                        <div className="bg-gray-50 w-full sm:w-70 rounded-md p-2 sm:p-2.5 text-center border-l-4 border-green-500">
                          <p className="text-xs text-gray-600">Total Revenue</p>
                          <p className="text-base sm:text-lg font-bold text-green-600">Rs. {formatCurrency(data.totalSales)}</p>
                        </div>
                        <div className="bg-gray-50 w-full sm:w-70 rounded-md p-2 sm:p-2.5 text-center border-l-4 border-purple-500">
                          <p className="text-xs text-gray-600">Total Commission</p>
                          <p className="text-base sm:text-lg font-bold text-purple-600">Rs. {formatCurrency(data.totalCommission)}</p>
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

            {/* Commission by Category */}
            {Object.keys(stats.commissionByCategory).length > 0 && (
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-linear-to-r from-blue-600 to-cyan-600 px-3 sm:px-4 py-2">
                  <h2 className="text-xs sm:text-sm font-semibold text-white">Commission by Category</h2>
                </div>
                <div className="p-2 sm:p-3">
                  <div className="space-y-2 sm:space-y-3">
                    {Object.entries(stats.commissionByCategory).map(([category, data]) => (
                      <div key={category} className="bg-gray-50 rounded-md p-2 sm:p-3">
                        <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-1 mb-2">
                          <h4 className="text-xs font-semibold text-gray-900">{category}</h4>
                          <span className="text-xs text-gray-500">{data.employeeCount} employee(s)</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-xs text-gray-600">Sales Amount</p>
                            <p className="text-sm font-bold text-blue-600 truncate">Rs. {formatCurrency(data.totalSales)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Commission</p>
                            <p className="text-sm font-bold text-green-600 truncate">Rs. {formatCurrency(data.totalCommission)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Rate</p>
                            <p className="text-sm font-bold text-purple-600">{data.totalSales > 0 ? ((data.totalCommission / data.totalSales) * 100).toFixed(1) : 0}%</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Top Selling Products */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-linear-to-r from-blue-600 to-cyan-600 px-3 sm:px-4 py-2">
                <h2 className="text-xs sm:text-sm font-semibold text-white">Top 10 Selling Products</h2>
              </div>
              <div className="p-2 sm:p-3">
                {stats.topSellingProducts.length === 0 ? (
                  <div className="text-center py-6">
                    <span className="text-xl">🏆</span>
                    <p className="mt-1 text-xs text-gray-500">No product sales data available</p>
                  </div>
                ) : (
                  <>
                    {/* Mobile Card View */}
                    <div className="block lg:hidden space-y-2">
                      {stats.topSellingProducts.map((product, index) => {
                        const maxQty = stats.topSellingProducts[0]?.totalQuantitySold || 1;
                        const percentage = (product.totalQuantitySold / maxQty) * 100;
                        return (
                          <div key={index} className="border border-gray-200 rounded-md p-2 bg-gray-50">
                            <div className="flex justify-between items-start mb-1">
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                  index === 0 ? 'bg-yellow-100 text-yellow-800' : 
                                  index === 1 ? 'bg-gray-100 text-gray-800' :
                                  index === 2 ? 'bg-orange-100 text-orange-800' : 'bg-blue-50 text-blue-800'
                                }`}>
                                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                                </span>
                                <span className="text-xs font-medium text-gray-900">{product.productName}</span>
                              </div>
                              <span className="text-xs font-bold text-green-600">Rs. {formatCurrency(product.totalRevenue)}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-1 text-xs">
                              <div><span className="text-gray-500">Category:</span> {product.productCategory}</div>
                              <div><span className="text-gray-500">Qty Sold:</span> <span className="font-bold">{product.totalQuantitySold}</span></div>
                            </div>
                            <div className="mt-1.5 w-full bg-gray-200 rounded-full h-1.5">
                              <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${percentage}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop Table View */}
                    <div className="overflow-x-auto hidden lg:block">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Rank</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 hidden md:table-cell">Category</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Qty Sold</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Revenue</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 hidden lg:table-cell">Progress</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {stats.topSellingProducts.map((product, index) => {
                            const maxQty = stats.topSellingProducts[0]?.totalQuantitySold || 1;
                            const percentage = (product.totalQuantitySold / maxQty) * 100;
                            return (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-3 py-2 whitespace-nowrap">
                                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                                    index === 0 ? 'bg-yellow-100 text-yellow-800' : 
                                    index === 1 ? 'bg-gray-100 text-gray-800' :
                                    index === 2 ? 'bg-orange-100 text-orange-800' : 'bg-blue-50 text-blue-800'
                                  }`}>
                                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                                  </span>
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900">{product.productName}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500 hidden md:table-cell">{product.productCategory}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-center text-xs font-bold">{product.totalQuantitySold}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-right text-xs font-bold text-green-600">Rs. {formatCurrency(product.totalRevenue)}</td>
                                <td className="px-3 py-2 whitespace-nowrap hidden lg:table-cell">
                                  <div className="w-20 bg-gray-200 rounded-full h-2 mx-auto">
                                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Employee Performance */}
            {Object.keys(stats.commissionByCategory).length > 0 && (
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-linear-to-r from-blue-600 to-cyan-600 px-3 sm:px-4 py-2">
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

      {/* Custom CSS for extra small screens */}
      <style jsx='true'>{`
        @media (min-width: 480px) {
          .xs\\:grid-cols-2 {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .xs\\:flex-row {
            flex-direction: row;
          }
          .xs\\:w-auto {
            width: auto;
          }
          .xs\\:items-center {
            align-items: center;
          }
        }
        .w-70 {
          width: 17.5rem;
        }
        @media (max-width: 639px) {
          .w-70 {
            width: 100%;
          }
        }
        .text-2xs {
          font-size: 0.65rem;
        }
      `}</style>
    </div>
  );
};

export default DashboardStats;