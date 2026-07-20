// EmployeeRead.jsx - Updated to show only active session invoices and calculations
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'https://bisni-ms-backend.onrender.com/api';

const EmployeeRead = () => {
  const [employees, setEmployees] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [sessionInvoices, setSessionInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterSessionId, setFilterSessionId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState('cards');

  useEffect(() => {
    fetchEmployees();
    fetchActiveSession();
  }, []);

  // Fetch session invoices only when active session is loaded
  useEffect(() => {
    if (activeSession) {
      fetchSessionInvoices(activeSession._id);
    }
  }, [activeSession]);

  const fetchActiveSession = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/session`);
      setActiveSession(response.data.data || null);
    } catch (error) {
      console.error('Error fetching active session:', error);
    }
  };

  const fetchSessionInvoices = async (sessionId) => {
    try {
      // Fetch invoices filtered by active session ID
      const response = await axios.get(`${API_BASE_URL}/invoice`, {
        params: { sessionId: sessionId }
      });
      const invoices = response.data.data || response.data || [];
      setSessionInvoices(invoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      // Fallback: fetch all invoices and filter client-side
      try {
        const response = await axios.get(`${API_BASE_URL}/invoice`);
        const allInvoices = response.data.data || response.data || [];
        const filteredInvoices = allInvoices.filter(inv => inv.sessionId === sessionId);
        setSessionInvoices(filteredInvoices);
      } catch (fallbackError) {
        console.error('Error in fallback invoice fetch:', fallbackError);
        setSessionInvoices([]);
      }
    }
  };

  const fetchEmployees = async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      let url = `${API_BASE_URL}/employee`;
      const params = new URLSearchParams();
      
      if (filters.date) params.append('date', filters.date);
      if (filters.month) params.append('month', filters.month);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.sessionId) params.append('sessionId', filters.sessionId);
      
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;
      
      const response = await axios.get(url);
      setEmployees(response.data.data || response.data || []);
      setSuccess(response.data.message || 'Employees loaded');
    } catch (error) {
      console.error('Error fetching employees:', error);
      setError('Failed to load employees.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterApply = () => {
    const filters = {};
    switch (filterType) {
      case 'date': if (filterDate) filters.date = filterDate; break;
      case 'month': if (filterMonth) filters.month = filterMonth; break;
      case 'range':
        if (filterStartDate) filters.startDate = filterStartDate;
        if (filterEndDate) filters.endDate = filterEndDate;
        break;
      case 'session': if (filterSessionId) filters.sessionId = filterSessionId; break;
      default: break;
    }
    fetchEmployees(filters);
  };

  const handleClearFilters = () => {
    setFilterType('all'); setFilterDate(''); setFilterMonth('');
    setFilterStartDate(''); setFilterEndDate(''); setFilterSessionId('');
    setSearchTerm(''); setCategoryFilter('all');
    fetchEmployees();
  };

  const getUniqueCategories = () => {
    const categories = employees.map(emp => emp.employeeCategory);
    return ['all', ...new Set(categories)].filter(Boolean);
  };

  // Get only active session invoices for specific employee
  const getEmployeeActiveSessionInvoices = (employeeName) => {
    return sessionInvoices.filter(inv => 
      inv.employeeName === employeeName && 
      inv.sessionId === activeSession?._id
    );
  };

  const calculateInvoiceCommission = (invoice, employeeCommission) => {
    if (!employeeCommission || employeeCommission.length === 0) return 0;
    let totalCommission = 0;
    invoice.products?.forEach(product => {
      const commission = employeeCommission.find(c => c.productName === product.productName);
      if (commission) {
        totalCommission += commission.commissionAmount * product.productQuantity;
      }
    });
    return totalCommission;
  };

  const getFilteredEmployees = () => {
    let filtered = [...employees];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(emp =>
        emp.employeeName?.toLowerCase().includes(term) ||
        emp.employeeCategory?.toLowerCase().includes(term)
      );
    }
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(emp => emp.employeeCategory === categoryFilter);
    }
    return filtered;
  };

  const filteredEmployees = getFilteredEmployees();

  // Print employee invoices - only active session
  const handlePrintEmployeeInvoices = (employee) => {
    const employeeInvoices = getEmployeeActiveSessionInvoices(employee.employeeName);
    const totalRevenue = employeeInvoices.reduce((sum, inv) => sum + (inv.grandTotalAmount || 0), 0);
    const totalCommission = employeeInvoices.reduce((sum, inv) => 
      sum + calculateInvoiceCommission(inv, employee.employeeCommission), 0
    );

    const formatCur = (amount) => (amount || 0).toFixed(2);
    const formatDt = (dateString) => {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    };

    const invoiceRows = employeeInvoices.map((inv, i) => {
      const invCommission = calculateInvoiceCommission(inv, employee.employeeCommission);
      return `
        <tr>
          <td style="text-align:center;">${i + 1}</td>
          <td>${inv.invoiceId}</td>
          <td>${inv.customerName}</td>
          <td style="text-align:right;">Rs. ${formatCur(invCommission)}</td>
          <td style="text-align:right;">Rs. ${formatCur(inv.grandTotalAmount)}</td>
        </tr>
      `;
    }).join('');

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Employee Report - ${employee.employeeName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; color: #1a1a2e; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 3px solid #0891b2; padding-bottom: 15px; margin-bottom: 20px; }
          .header h1 { color: #0891b2; margin: 0; font-size: 22px; letter-spacing: 1px; }
          .header p { margin: 5px 0; color: #64748b; font-size: 13px; }
          .header .dates { display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; margin-top: 8px; }
          .section { margin-bottom: 18px; }
          .section h3 { color: #06b6d4; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; font-size: 14px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
          .section p { font-size: 12px; margin-bottom: 3px; }
          .section span { font-weight: 500; color: #334155; }
          .info-grid { display: flex; gap: 25px; }
          .info-box { flex: 1; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th { background: #f0fdfa; padding: 9px 10px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #0891b2; color: #0f766e; }
          td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
          .totals { width: 380px; margin-left: auto; margin-top: 8px; }
          .totals td { border: none; padding: 5px 8px; font-size: 13px; }
          .totals .grand-total { font-weight: 700; font-size: 15px; border-top: 2px solid #0891b2; color: #0891b2; }
          .totals .grand-total td { padding-top: 8px; }
          .footer { text-align: center; margin-top: 25px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          @media print { body { padding: 10px; max-width: 100%; } }
          @page { size: A4; margin: 8mm; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📋 EMPLOYEE SALES REPORT</h1>
          <p>Employee: ${employee.employeeName} | Category: ${employee.employeeCategory}</p>
          <div class="dates">
            <span>Generated: ${formatDt(new Date().toISOString())}</span>
            <span>Active Session Invoices: ${employeeInvoices.length}</span>
          </div>
        </div>

        <div class="section">
          <h3>Active Session Invoices</h3>
          <table>
            <thead>
              <tr>
                <th style="text-align:center;width:30px;">#</th>
                <th>Invoice ID</th>
                <th>Customer</th>
                <th style="text-align:right;">Commission</th>
                <th style="text-align:right;">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceRows}
            </tbody>
          </table>
        </div>

        <div class="section">
          <table class="totals">
            <tr>
              <td>Total Commission:</td>
              <td style="text-align:right;font-weight:600;color:#7c3aed;">Rs. ${formatCur(totalCommission)}</td>
            </tr>
            <tr class="grand-total">
              <td>Grand Total Revenue:</td>
              <td style="text-align:right;">Rs. ${formatCur(totalRevenue)}</td>
            </tr>
          </table>
        </div>

        <div class="footer">
          <p>Generated by Sales Management System | Active Session Only</p>
        </div>
        <script>window.onload=function(){window.print();}<\/script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setError('Please allow popups to print the report');
      return;
    }
    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const clearMessages = () => { setError(null); setSuccess(null); };

  // Calculate statistics for active session only
  const getStatistics = () => {
    if (sessionInvoices.length === 0) {
      return { totalEmployees: 0, totalRevenue: 0, totalItemsSold: 0, totalCommission: 0 };
    }
    const totalRevenue = sessionInvoices.reduce((sum, inv) => sum + (inv.grandTotalAmount || 0), 0);
    const totalItemsSold = sessionInvoices.reduce((sum, inv) => 
      sum + (inv.products || []).reduce((pSum, p) => pSum + (p.productQuantity || 0), 0), 0
    );
    let totalCommission = 0;
    sessionInvoices.forEach(invoice => {
      const emp = employees.find(e => e.employeeName === invoice.employeeName);
      if (emp) totalCommission += calculateInvoiceCommission(invoice, emp.employeeCommission);
    });
    const employeeNames = [...new Set(sessionInvoices.map(inv => inv.employeeName))];
    return { totalEmployees: employeeNames.length, totalRevenue, totalItemsSold, totalCommission };
  };

  const stats = getStatistics();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-5 px-3 sm:px-4 lg:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-5">
          <h1 className="text-xl font-bold text-gray-900 mb-1">EMPLOYEE REPORTS</h1>
          {/* {activeSession && (
            <p className="text-xs text-blue-600 mt-1 font-semibold">
              Active Session: {activeSession.sessionId || activeSession._id}
            </p>
          )} */}
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="mb-3 bg-red-50 border-l-4 border-red-500 p-2.5 rounded-r-lg text-xs">
            <div className="flex"><span className="mr-2">❌</span><p className="text-red-700 flex-1">{error}</p><button onClick={clearMessages} className="text-red-400 hover:text-red-600">✕</button></div>
          </div>
        )}
        {success && (
          <div className="mb-3 bg-green-50 border-l-4 border-green-500 p-2.5 rounded-r-lg text-xs">
            <div className="flex"><span className="mr-2">✅</span><p className="text-green-700 flex-1">{success}</p><button onClick={clearMessages} className="text-green-400 hover:text-green-600">✕</button></div>
          </div>
        )}

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2">
            <h2 className="text-sm font-semibold text-white flex items-center">
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters & Search
            </h2>
          </div>
          <div className="p-3">
            {/* Responsive Grid: 1 col mobile, 2 col tablet, 3 col desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mb-3">
              <div className="relative">
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, category..."
                  className="w-full pl-8 pr-2.5 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 text-xs" />
                <svg className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 text-xs">
                <option value="all">All Categories</option>
                {getUniqueCategories().filter(c => c !== 'all').map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <div className="flex space-x-1.5 sm:col-span-2 lg:col-span-1">
                <button onClick={() => setViewMode('cards')}
                  className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium ${viewMode === 'cards' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}>📋 Cards</button>
                <button onClick={() => setViewMode('table')}
                  className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}>📊 Table</button>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Empty State */}
        {!loading && employees.length === 0 && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="text-center py-12">
              <span className="text-3xl">👥</span>
              <h3 className="mt-2 text-base font-medium text-gray-900">No employees found</h3>
              <p className="mt-1 text-xs text-gray-500">There are no employees to display.</p>
            </div>
          </div>
        )}

        {/* Cards View */}
        {!loading && filteredEmployees.length > 0 && viewMode === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredEmployees.map((employee) => {
              // Only active session invoices for this employee
              const employeeInvoices = getEmployeeActiveSessionInvoices(employee.employeeName);
              const totalEmployeeRevenue = employeeInvoices.reduce((sum, inv) => sum + (inv.grandTotalAmount || 0), 0);
              const totalEmployeeCommission = employeeInvoices.reduce((sum, inv) => 
                sum + calculateInvoiceCommission(inv, employee.employeeCommission), 0
              );
              
              return (
                <div key={employee._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition duration-200">
                  <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="flex-shrink-0 h-9 w-9 bg-white bg-opacity-20 rounded-full flex items-center justify-center border-2 border-white">
                          <span className="text-black font-bold text-sm">{employee.employeeName.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-white">{employee.employeeName}</h3>
                          <span className="px-1.5 py-0.5 bg-white bg-opacity-20 text-black text-xs rounded-full">{employee.employeeCategory}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handlePrintEmployeeInvoices(employee)}
                          className="text-white hover:text-blue-200 p-1" title="Print Report">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                        </button>
                        <button onClick={() => setSelectedEmployee(selectedEmployee?._id === employee._id ? null : employee)}
                          className="text-white hover:text-blue-200">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={selectedEmployee?._id === employee._id ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-3">
                    {/* Stats Grid: 3 columns on all screens */}
                    <div className="bg-gray-50 rounded-md p-2.5 mb-3">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-base font-bold text-blue-600">{employeeInvoices.length}</p>
                          <p className="text-[10px] sm:text-xs text-gray-600">Active Invoices</p>
                        </div>
                        <div>
                          <p className="text-base font-bold text-green-600">Rs. {formatCurrency(totalEmployeeRevenue)}</p>
                          <p className="text-[10px] sm:text-xs text-gray-600">Session Revenue</p>
                        </div>
                        <div>
                          <p className="text-base font-bold text-purple-600">Rs. {formatCurrency(totalEmployeeCommission)}</p>
                          <p className="text-[10px] sm:text-xs text-gray-600">Session Commission</p>
                        </div>
                      </div>
                    </div>

                    {selectedEmployee?._id === employee._id && (
                      <div className="border-t border-gray-200 pt-3 space-y-3">
                        <div>
                          <h4 className="text-xs font-semibold text-gray-700 mb-2">
                            Current Session Invoices ({employeeInvoices.length})
                          </h4>
                          {employeeInvoices.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-md">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500">Invoice ID</th>
                                    <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500">Customer</th>
                                    <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-500">Commission</th>
                                    <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-500">Grand Total</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {employeeInvoices.map((invoice, idx) => {
                                    const invCommission = calculateInvoiceCommission(invoice, employee.employeeCommission);
                                    return (
                                      <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-2 py-1.5 text-xs font-medium text-gray-900">{invoice.invoiceId}</td>
                                        <td className="px-2 py-1.5 text-xs text-gray-600">{invoice.customerName}</td>
                                        <td className="px-2 py-1.5 text-xs text-right font-medium text-purple-600">Rs. {formatCurrency(invCommission)}</td>
                                        <td className="px-2 py-1.5 text-xs text-right font-bold text-green-600">Rs. {formatCurrency(invoice.grandTotalAmount)}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500">No invoices found for this employee in active session</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Table View */}
        {!loading && filteredEmployees.length > 0 && viewMode === 'table' && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Category</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Active Invoices</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Session Revenue</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Session Commission</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-20">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredEmployees.map((employee) => {
                    const employeeInvoices = getEmployeeActiveSessionInvoices(employee.employeeName);
                    const totalRevenue = employeeInvoices.reduce((sum, inv) => sum + (inv.grandTotalAmount || 0), 0);
                    const totalCommission = employeeInvoices.reduce((sum, inv) => 
                      sum + calculateInvoiceCommission(inv, employee.employeeCommission), 0
                    );
                    
                    return (
                      <React.Fragment key={employee._id}>
                        <tr className="hover:bg-gray-50 transition duration-150">
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-7 w-7 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                                <span className="text-white font-medium text-xs">{employee.employeeName.charAt(0).toUpperCase()}</span>
                              </div>
                              <div className="ml-2">
                                <span className="text-xs font-medium text-gray-900">{employee.employeeName}</span>
                                {/* Show category on mobile inline */}
                                <span className="sm:hidden block text-[10px] text-gray-500">{employee.employeeCategory}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap hidden sm:table-cell">
                            <span className="px-1.5 py-0.5 inline-flex text-xs font-semibold rounded-full bg-blue-100 text-blue-800">{employee.employeeCategory}</span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-center text-xs font-medium">{employeeInvoices.length}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-right text-xs font-bold text-green-600 hidden md:table-cell">Rs. {formatCurrency(totalRevenue)}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-right text-xs font-bold text-purple-600 hidden md:table-cell">Rs. {formatCurrency(totalCommission)}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button onClick={() => handlePrintEmployeeInvoices(employee)}
                                className="text-green-600 hover:text-green-800" title="Print Report">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                              </button>
                              <button onClick={() => setSelectedEmployee(selectedEmployee?._id === employee._id ? null : employee)}
                                className="text-xs text-blue-600 hover:text-blue-900 font-medium">
                                {selectedEmployee?._id === employee._id ? 'Hide' : 'View'}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {selectedEmployee?._id === employee._id && (
                          <tr>
                            <td colSpan="6" className="px-3 py-3 bg-gray-50">
                              <div className="grid grid-cols-1 gap-4">
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-700 mb-2">
                                    Current Session Invoices ({employeeInvoices.length})
                                  </h4>
                                  {employeeInvoices.length > 0 ? (
                                    <div className="overflow-x-auto">
                                      <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-md">
                                        <thead className="bg-white">
                                          <tr><th className="px-2 py-1 text-left text-xs font-medium text-gray-500">Invoice ID</th><th className="px-2 py-1 text-left text-xs font-medium text-gray-500">Customer</th><th className="px-2 py-1 text-right text-xs font-medium text-gray-500">Commission</th><th className="px-2 py-1 text-right text-xs font-medium text-gray-500">Total</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                          {employeeInvoices.map((invoice, idx) => {
                                            const invCommission = calculateInvoiceCommission(invoice, employee.employeeCommission);
                                            return (
                                              <tr key={idx} className="bg-white hover:bg-gray-50">
                                                <td className="px-2 py-1 text-xs font-medium text-gray-900">{invoice.invoiceId}</td>
                                                <td className="px-2 py-1 text-xs text-gray-600">{invoice.customerName}</td>
                                                <td className="px-2 py-1 text-xs text-right font-medium text-purple-600">Rs. {formatCurrency(invCommission)}</td>
                                                <td className="px-2 py-1 text-xs text-right font-bold text-green-600">Rs. {formatCurrency(invoice.grandTotalAmount)}</td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : <p className="text-xs text-gray-500">No invoices found in active session</p>}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeRead;