// SessionManagement.jsx - Fixed: active session detection, invoice filtering, and session history
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = 'https://bisni-ms-backend.onrender.com/api';
const DEBUG = true;

const createDebugger = (componentName) => {
  const styles = {
    INFO: 'color: #0ea5e9; font-weight: bold;',
    SUCCESS: 'color: #10b981; font-weight: bold;',
    WARN: 'color: #f59e0b; font-weight: bold;',
    ERROR: 'color: #ef4444; font-weight: bold;',
    FETCH: 'color: #8b5cf6; font-weight: bold;',
    STATE: 'color: #ec4899; font-weight: bold;',
  };

  return {
    log: (type, message, data = null) => {
      if (!DEBUG) return;
      const timestamp = new Date().toLocaleTimeString();
      const prefix = `[${timestamp}][${componentName}][${type}]`;
    },
    error: (message, error) => {
      console.error(`[${componentName}][ERROR] ${message}`, {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
        stack: error?.stack
      });
    },
    groupStart: (label) => DEBUG && console.group(`[${componentName}] ${label}`),
    groupEnd: () => DEBUG && console.groupEnd(),
  };
};

const debug = createDebugger('SessionMgmt');

const apiService = {
  fetchEmployees: async () => {
    debug.log('FETCH', 'Fetching employees...');
    const response = await axios.get(`${API_BASE_URL}/employee`, { timeout: 10000 });
    debug.log('SUCCESS', `Loaded ${response.data?.data?.length || 0} employees`);
    return response.data.data || [];
  },

  fetchAllInvoices: async () => {
    debug.log('FETCH', 'Fetching all invoices...');
    const response = await axios.get(`${API_BASE_URL}/invoice`, { timeout: 10000 });
    debug.log('SUCCESS', `Loaded ${response.data?.data?.length || 0} invoices`);
    return response.data.data || [];
  },

  fetchActiveSession: async () => {
    debug.log('FETCH', 'Fetching active session via /session...');
    try {
      const response = await axios.get(`${API_BASE_URL}/session`, { timeout: 10000 });
      const session = response.data.data || null;
      if (session) {
        debug.log('SUCCESS', `Active session found: ${session.sessionIdentifier || session._id}`, {
          status: session.sessionStatus,
          salesCount: session.salesDetails?.length || 0
        });
      } else {
        debug.log('INFO', 'No active session found (null data)');
      }
      return session;
    } catch (error) {
      if (error.response?.status === 404) {
        debug.log('INFO', 'No active session (404 response)');
        return null;
      }
      throw error;
    }
  },

  fetchAllSessions: async (page = 1, limit = 10, filterParams = {}) => {
    debug.log('FETCH', `Fetching sessions page ${page}`, filterParams);
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('limit', limit);
    if (filterParams.status) params.append('status', filterParams.status);
    if (filterParams.startDate) params.append('startDate', filterParams.startDate);
    if (filterParams.endDate) params.append('endDate', filterParams.endDate);
    
    const response = await axios.get(`${API_BASE_URL}/sessions?${params.toString()}`, { timeout: 10000 });
    debug.log('SUCCESS', `Loaded ${response.data?.data?.length || 0} sessions`);
    return {
      sessions: response.data.data || [],
      pagination: response.data.pagination || null
    };
  },

  fetchSessionDetails: async (sessionId) => {
    debug.log('FETCH', `Fetching session details: ${sessionId}`);
    const response = await axios.get(`${API_BASE_URL}/session/details/${sessionId}`, { timeout: 10000 });
    debug.log('SUCCESS', 'Session details loaded');
    return response.data.data;
  },

  startSession: async () => {
    debug.log('ACTION', 'Starting new session...');
    const response = await axios.post(`${API_BASE_URL}/session/start`, {}, { timeout: 10000 });
    debug.log('SUCCESS', 'Session started', response.data.data);
    return response.data.data;
  },

  endSession: async () => {
    debug.log('ACTION', 'Ending current session...');
    const response = await axios.post(`${API_BASE_URL}/session/end`, {}, { timeout: 10000 });
    debug.log('SUCCESS', 'Session ended', response.data.data?.duration);
    return response.data.data;
  },

  deleteSession: async (sessionId) => {
    debug.log('ACTION', `Deleting session: ${sessionId}`);
    const response = await axios.delete(`${API_BASE_URL}/session/${sessionId}`, { timeout: 10000 });
    debug.log('SUCCESS', 'Session deleted');
    return response.data;
  },
};

const SessionManagement = () => {
  // ---------- STATE ----------
  const [activeSession, setActiveSession] = useState(null);
  const [allSessions, setAllSessions] = useState([]);
  const [allInvoices, setAllInvoices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetails, setSessionDetails] = useState(null);
  const [selectedSessionInvoices, setSelectedSessionInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [endConfirm, setEndConfirm] = useState(false);
  const [timer, setTimer] = useState(null);
  const [activeTab, setActiveTab] = useState('active');
  const [showDebug, setShowDebug] = useState(false);
  
  const [pagination, setPagination] = useState({ 
    currentPage: 1, totalPages: 1, totalSessions: 0, limit: 10 
  });
  const [filters, setFilters] = useState({ status: '', startDate: '', endDate: '' });

  // ---------- ERROR HANDLER ----------
  const handleError = useCallback((error, fallbackMessage = 'An error occurred') => {
    let message = fallbackMessage;
    
    if (error.response) {
      const { status, data } = error.response;
      debug.error(`Server error (${status})`, error);
      
      switch (status) {
        case 400: message = data?.message || 'Invalid request. Please check your input.'; break;
        case 404: message = data?.message || 'Resource not found.'; break;
        case 500: message = 'Server error. Please try again later.'; break;
        default: message = data?.message || `Error (${status})`;
      }
    } else if (error.request) {
      debug.error('Network error - no response', error);
      message = 'Cannot connect to server. Please check if backend is running on port 5000.';
    } else {
      debug.error('Request setup error', error);
      message = error.message || fallbackMessage;
    }
    
    setError(message);
    return message;
  }, []);

  // ---------- DATA FETCHING ----------
  const loadInitialData = useCallback(async () => {
    debug.groupStart('Initial Data Load');
    setFetchLoading(true);
    setError(null);
    
    try {
      const [employeesData, invoicesData, sessionData, sessionsResult] = await Promise.all([
        apiService.fetchEmployees(),
        apiService.fetchAllInvoices(),
        apiService.fetchActiveSession(),
        apiService.fetchAllSessions(1, pagination.limit, filters),
      ]);
      
      setEmployees(employeesData);
      setAllInvoices(invoicesData);
      
      if (sessionData && sessionData.sessionStatus === 'Active') {
        debug.log('STATE', 'Setting active session', { id: sessionData._id, status: sessionData.sessionStatus });
        setActiveSession(sessionData);
      } else {
        debug.log('STATE', 'No active session - clearing state');
        setActiveSession(null);
      }
      
      setAllSessions(sessionsResult.sessions);
      if (sessionsResult.pagination) setPagination(sessionsResult.pagination);
      
      debug.log('SUCCESS', 'All initial data loaded successfully');
    } catch (error) {
      handleError(error, 'Failed to load initial data');
    } finally {
      setFetchLoading(false);
      debug.groupEnd();
    }
  }, [pagination.limit, filters, handleError]);

  useEffect(() => {
    loadInitialData();
  }, []);

  // ---------- TIMER ----------
  useEffect(() => {
    if (!activeSession || activeSession.sessionStatus !== 'Active') {
      debug.log('TIMER', 'No active session for timer');
      return;
    }
    
    debug.log('TIMER', 'Starting session timer');
    const interval = setInterval(() => {
      if (activeSession?.sessionStartDateTime) {
        const duration = new Date() - new Date(activeSession.sessionStartDateTime);
        setTimer({
          days: Math.floor(duration / 86400000),
          hours: Math.floor((duration % 86400000) / 3600000),
          minutes: Math.floor((duration % 3600000) / 60000),
          seconds: Math.floor((duration % 60000) / 1000)
        });
      }
    }, 1000);
    
    return () => {
      debug.log('TIMER', 'Clearing session timer');
      clearInterval(interval);
    };
  }, [activeSession]);

  // ---------- COMPUTED VALUES ----------
  const getActiveSessionInvoices = useCallback(() => {
    if (!activeSession?._id) {
      debug.log('FILTER', 'No active session ID, returning empty');
      return [];
    }
    const filtered = allInvoices.filter(inv => {
      const match = inv.sessionId === activeSession._id;
      return match;
    });
    debug.log('FILTER', `Active session invoices: ${filtered.length}/${allInvoices.length}`, {
      activeSessionId: activeSession._id,
      firstFewInvoiceSessionIds: allInvoices.slice(0, 5).map(inv => inv.sessionId)
    });
    return filtered;
  }, [activeSession, allInvoices]);

  const getInvoicesForSession = useCallback((session) => {
    if (!session?._id) return [];
    const filtered = allInvoices.filter(inv => inv.sessionId === session._id);
    debug.log('FILTER', `Session ${session.sessionIdentifier || session._id} invoices: ${filtered.length}`);
    return filtered;
  }, [allInvoices]);

  const sessionHasInvoices = useCallback((session) => {
    if (!session?._id) return false;
    return getInvoicesForSession(session).length > 0;
  }, [getInvoicesForSession]);

  const calculateInvoiceCommission = useCallback((invoice) => {
    if (!invoice) return 0;
    const emp = employees.find(e => e.employeeName === invoice.employeeName);
    if (!emp?.employeeCommission?.length) return 0;
    
    return invoice.products?.reduce((total, p) => {
      const comm = emp.employeeCommission.find(c => c.productName === p.productName);
      return total + (comm ? comm.commissionAmount * (p.productQuantity || 0) : 0);
    }, 0) || 0;
  }, [employees]);

  const computeStats = useCallback((invoices) => {
    if (!invoices?.length) return { totalSales: 0, totalItemsSold: 0, totalCommission: 0, employeeCount: 0 };
    
    const totalSales = invoices.reduce((sum, inv) => sum + (inv.grandTotalAmount || 0), 0);
    
    const totalItemsSold = invoices.reduce((sum, inv) => 
      sum + (inv.products || []).reduce((s, p) => s + (p.productQuantity || 0), 0), 0);
    
    let totalCommission = 0;
    const uniqueEmployees = new Set();
    
    invoices.forEach(inv => {
      uniqueEmployees.add(inv.employeeName);
      totalCommission += calculateInvoiceCommission(inv);
    });
    
    return { totalSales, totalItemsSold, totalCommission, employeeCount: uniqueEmployees.size };
  }, [calculateInvoiceCommission]);

  const activeSessionInvoices = getActiveSessionInvoices();
  const activeStats = computeStats(activeSessionInvoices);
  const selectedStats = computeStats(selectedSessionInvoices);

  // ---------- ACTIONS ----------
  const refreshData = useCallback(async () => {
    debug.log('ACTION', 'Refreshing data...');
    try {
      const [sessionData, invoicesData] = await Promise.all([
        apiService.fetchActiveSession(),
        apiService.fetchAllInvoices(),
      ]);
      
      if (sessionData && sessionData.sessionStatus === 'Active') {
        setActiveSession(sessionData);
      } else {
        setActiveSession(null);
      }
      
      setAllInvoices(invoicesData);
      setSuccess('Data refreshed');
    } catch (error) {
      handleError(error, 'Failed to refresh data');
    }
  }, [handleError]);

  const handleStartSession = async () => {
    setLoading(true); setError(null); setSuccess(null);
    try {
      const session = await apiService.startSession();
      setActiveSession(session);
      setSuccess(`Session ${session.sessionIdentifier || 'started'} successfully!`);
      
      const result = await apiService.fetchAllSessions(pagination.currentPage, pagination.limit, filters);
      setAllSessions(result.sessions);
      if (result.pagination) setPagination(result.pagination);
    } catch (error) {
      handleError(error, 'Failed to start session');
    } finally { setLoading(false); }
  };

  const handleEndSession = async () => {
    setLoading(true); setError(null); setSuccess(null);
    try {
      const result = await apiService.endSession();
      const dur = result?.duration;
      setSuccess(`Session ended! Duration: ${dur?.hours || 0}h ${dur?.minutes || 0}m`);
      
      setActiveSession(null);
      setTimer(null);
      setEndConfirm(false);
      
      const [sessionList, invoices] = await Promise.all([
        apiService.fetchAllSessions(pagination.currentPage, pagination.limit, filters),
        apiService.fetchAllInvoices(),
      ]);
      setAllSessions(sessionList.sessions);
      if (sessionList.pagination) setPagination(sessionList.pagination);
      setAllInvoices(invoices);
    } catch (error) {
      handleError(error, 'Failed to end session');
    } finally { setLoading(false); }
  };

  const handleViewSession = async (sessionId) => {
    setLoading(true); setError(null);
    try {
      const details = await apiService.fetchSessionDetails(sessionId);
      setSessionDetails(details);
      setSelectedSession(details);
      
      const session = allSessions.find(s => s._id === sessionId);
      const invoices = session ? getInvoicesForSession(session) : [];
      setSelectedSessionInvoices(invoices);
      
      debug.log('INFO', `Viewing session ${sessionId}: ${invoices.length} invoices found`);
    } catch (error) {
      handleError(error, 'Failed to load session details');
    } finally { setLoading(false); }
  };

  const handleDeleteSession = async (sessionId) => {
    setLoading(true); setError(null); setSuccess(null);
    try {
      await apiService.deleteSession(sessionId);
      setSuccess('Session deleted successfully!');
      setAllSessions(prev => prev.filter(s => s._id !== sessionId));
      setDeleteConfirm(null); setSessionDetails(null); 
      setSelectedSession(null); setSelectedSessionInvoices([]);
      
      const result = await apiService.fetchAllSessions(pagination.currentPage, pagination.limit, filters);
      setAllSessions(result.sessions);
      if (result.pagination) setPagination(result.pagination);
    } catch (error) {
      handleError(error, 'Failed to delete session');
    } finally { setLoading(false); }
  };

  const handleFetchSessions = async (page = 1, filterParams = filters) => {
    setFetchLoading(true); setError(null);
    try {
      const result = await apiService.fetchAllSessions(page, pagination.limit, filterParams);
      setAllSessions(result.sessions);
      if (result.pagination) setPagination(result.pagination);
    } catch (error) {
      handleError(error, 'Failed to load sessions');
    } finally { setFetchLoading(false); }
  };

  // ---------- RENDER HELPERS ----------
  const formatCurrency = (amount) => 
    new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', { 
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
  };

  const formatTimerValue = (value) => value < 10 ? `0${value}` : value;

  const getSessionDuration = (session) => {
    if (session?.duration) {
      const { days, hours, minutes } = session.duration;
      if (days > 0) return `${days}d ${hours}h ${minutes}m`;
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}m`;
    }
    if (session?.sessionEndDateTime && session?.sessionStartDateTime) {
      const duration = new Date(session.sessionEndDateTime) - new Date(session.sessionStartDateTime);
      const hours = Math.floor(duration / 3600000);
      const minutes = Math.floor((duration % 3600000) / 60000);
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}m`;
    }
    return 'Active';
  };

  const clearMessages = () => { setError(null); setSuccess(null); };

  const handlePrintInvoices = (invoices, stats, title) => {
    if (!invoices?.length) { setError('No invoices to print'); return; }
    const fc = (a) => (a || 0).toFixed(2);
    const fd = (ds) => ds ? new Date(ds).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';
    
    const rows = invoices.map((inv, i) => {
      const comm = calculateInvoiceCommission(inv);
      return `<tr><td style="text-align:center;">${i+1}</td><td>${inv.invoiceId}</td><td>${inv.customerName}</td><td>${inv.customerMobileNumber1}</td><td>${inv.employeeName}</td><td style="text-align:right;">Rs. ${fc(inv.grandTotalAmount)}</td><td style="text-align:right;">Rs. ${fc(comm)}</td></tr>`;
    }).join('');

    const es = {};
    invoices.forEach(inv => {
      if (!es[inv.employeeName]) es[inv.employeeName] = { total: 0, commission: 0 };
      es[inv.employeeName].total += inv.grandTotalAmount || 0;
      es[inv.employeeName].commission += calculateInvoiceCommission(inv);
    });
    const eRows = Object.entries(es).map(([n, d]) => `<tr><td>${n}</td><td style="text-align:right;">Rs. ${fc(d.total)}</td><td style="text-align:right;">Rs. ${fc(d.commission)}</td></tr>`).join('');

    const html = `<!DOCTYPE html><html><head><title>${title}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;padding:20px;color:#1a1a2e;max-width:900px;margin:0 auto}.header{text-align:center;border-bottom:3px solid #0891b2;padding-bottom:12px;margin-bottom:18px}.header h1{color:#0891b2;font-size:22px}.header p{margin:4px 0;color:#64748b;font-size:12px}.section{margin-bottom:16px}.section h3{color:#06b6d4;border-bottom:1px solid #e2e8f0;padding-bottom:4px;font-size:13px;margin-bottom:6px;text-transform:uppercase}table{width:100%;border-collapse:collapse;margin-top:6px}th{background:#f0fdfa;padding:7px 8px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #0891b2;color:#0f766e}td{padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:12px}.grand-total{font-weight:700;font-size:14px;border-top:2px solid #0891b2;color:#0891b2}.footer{text-align:center;margin-top:20px;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px}@media print{body{padding:8px;max-width:100%}}@page{size:A4;margin:8mm}</style></head><body><div class="header"><h1>${title}</h1><p>Invoices: ${invoices.length} | ${fd(new Date().toISOString())}</p></div><div class="section"><h3>All Invoices</h3><table><thead><tr><th style="text-align:center;width:25px">#</th><th>Invoice ID</th><th>Customer</th><th>Mobile</th><th>Employee</th><th style="text-align:right">Total</th><th style="text-align:right">Commission</th></tr></thead><tbody>${rows}</tbody><tfoot><tr class="grand-total"><td colspan="5" style="text-align:right">Totals:</td><td style="text-align:right">Rs. ${fc(stats.totalSales)}</td><td style="text-align:right">Rs. ${fc(stats.totalCommission)}</td></tr></tfoot></table></div><div class="section"><h3>Employee Summary</h3><table><thead><tr><th>Employee</th><th style="text-align:right">Total</th><th style="text-align:right">Commission</th></tr></thead><tbody>${eRows}</tbody></table></div><div class="footer"><p>Sales Management System</p></div><script>window.onload=function(){window.print()}</script></body></html>`;

    const pw = window.open('', '_blank');
    if (!pw) { setError('Please allow popups'); return; }
    pw.document.write(html); pw.document.close();
  };

  // ==================== RENDER ====================
  return (
    <div className="min-h-screen bg-linea-to-br from-gray-50 to-gray-100 py-3 sm:py-4 md:py-5 px-2 sm:px-3 md:px-4 lg:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-5">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">SESSION MANAGEMENT</h1>
        </div>

        {/* Debug Panel */}
        {showDebug && (
          <div className="mb-4 bg-gray-900 text-green-400 rounded-lg shadow-md overflow-hidden font-mono text-xs">
            <div className="bg-gray-800 px-3 sm:px-4 py-2 flex justify-between items-center">
              <h3 className="text-white font-semibold text-xs">Debug Info</h3>
              <button onClick={() => setShowDebug(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="p-2 sm:p-3 max-h-40 overflow-y-auto space-y-1">
              <p className="text-yellow-400 break-all">Active Session: {activeSession ? `${activeSession.sessionIdentifier || activeSession._id?.slice(-8)} (${activeSession.sessionStatus})` : '❌ None'}</p>
              <p className="text-blue-400">All Invoices in DB: {allInvoices.length}</p>
              <p className="text-green-400">Active Session Invoices: {activeSessionInvoices.length}</p>
              <p className="text-blue-400">Employees: {employees.length}</p>
              <p className="text-blue-400">All Sessions: {allSessions.length}</p>
              <p className="text-purple-400">Active Tab: {activeTab}</p>
              <p className="text-gray-500">Open browser console (F12) for detailed logs</p>
            </div>
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className="mb-3 bg-red-50 border-l-4 border-red-500 p-2 sm:p-2.5 rounded-r-lg text-xs">
            <div className="flex items-start"><span className="mr-2 shrink-0">❌</span><p className="text-red-700 flex-1 wrap-break">{error}</p><button onClick={clearMessages} className="text-red-400 hover:text-red-600 shrink-0 ml-1">✕</button></div>
          </div>
        )}
        {success && (
          <div className="mb-3 bg-green-50 border-l-4 border-green-500 p-2 sm:p-2.5 rounded-r-lg text-xs">
            <div className="flex items-start"><span className="mr-2 shrink-0">✅</span><p className="text-green-700 flex-1 wrap-break">{success}</p><button onClick={clearMessages} className="text-green-400 hover:text-green-600 shrink-0 ml-1">✕</button></div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-3 sm:mb-4 border-b border-gray-200">
          <nav className="flex flex-col xs:flex-row xs:space-x-6">
            {['active', 'history'].map(tab => (
              <button key={tab} onClick={() => { setActiveTab(tab); if (tab === 'history') handleFetchSessions(); }}
                className={`py-2 sm:py-2.5 px-1 border-b-2 font-medium text-xs transition text-center ${
                  activeTab === tab ? 'border-cyan-600 text-cyan-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                {tab === 'active' ? '⏱️ Active Session' : '📋 Session History'}
              </button>
            ))}
          </nav>
        </div>

        {/* Active Session Tab */}
        {activeTab === 'active' && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-linear-to-r from-blue-600 to-cyan-600 px-3 sm:px-4 py-2 sm:py-2.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <h2 className="text-xs sm:text-sm font-semibold text-white">
                Active Session Control
                {activeSession && <span className="ml-2 text-blue-100 text-xs">({activeSession.sessionIdentifier || activeSession._id?.slice(-8)})</span>}
              </h2>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {!activeSession ? (
                  <button onClick={handleStartSession} disabled={loading} className="w-full sm:w-auto px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 text-xs font-medium disabled:opacity-50">
                    {loading ? 'Starting...' : '▶ Start Session'}
                  </button>
                ) : (
                  <button onClick={() => setEndConfirm(true)} disabled={loading} className="w-full sm:w-auto px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 text-xs font-medium disabled:opacity-50">
                    ⏹ End Session
                  </button>
                )}
                <button onClick={refreshData} className="px-2.5 py-1.5 bg-white text-blue-600 rounded-md hover:bg-gray-100 text-xs shrink-0">🔄</button>
              </div>
            </div>

            <div className="p-3 sm:p-4">
              {activeSession ? (
                <div>
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <div className="bg-linear-to-br from-blue-50 to-cyan-50 rounded-md p-2 sm:p-3 border border-blue-200 text-center">
                      <p className="text-xs text-gray-600">Session Timer</p>
                      {timer ? (
                        <p className="text-lg sm:text-xl font-bold text-blue-600 font-mono truncate">
                          {timer.days > 0 && `${formatTimerValue(timer.days)}:`}
                          {formatTimerValue(timer.hours)}:{formatTimerValue(timer.minutes)}:{formatTimerValue(timer.seconds)}
                        </p>
                      ) : (
                        <p className="text-lg sm:text-xl font-bold text-blue-600 font-mono">--:--:--</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1 break-all">Started: {formatDate(activeSession.sessionStartDateTime)}</p>
                    </div>
                    <div className="bg-linear-to-br from-green-50 to-emerald-50 rounded-md p-2 sm:p-3 border border-green-200 text-center">
                      <p className="text-xs text-gray-600">Status</p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 mt-1">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>Active
                      </span>
                    </div>
                    <div className="bg-linear-to-br from-yellow-50 to-orange-50 rounded-md p-2 sm:p-3 border border-yellow-200 text-center">
                      <p className="text-xs text-gray-600">Total Sales</p>
                      <p className="text-base sm:text-lg font-bold text-yellow-600">Rs. {formatCurrency(activeStats.totalSales)}</p>
                      <p className="text-xs text-gray-500">{activeStats.totalItemsSold} items sold</p>
                    </div>
                    <div className="bg-linear-to-br from-purple-50 to-pink-50 rounded-md p-2 sm:p-3 border border-purple-200 text-center">
                      <p className="text-xs text-gray-600">Total Commission</p>
                      <p className="text-base sm:text-lg font-bold text-purple-600">Rs. {formatCurrency(activeStats.totalCommission)}</p>
                      <p className="text-xs text-gray-500">{activeStats.employeeCount} employees</p>
                    </div>
                  </div>

                  {/* Active Session Invoices */}
                  <div>
                    <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-2 mb-2">
                      <h3 className="text-xs font-semibold text-gray-700">Active Session Invoices ({activeSessionInvoices.length})</h3>
                      <button onClick={() => handlePrintInvoices(activeSessionInvoices, activeStats, 'ACTIVE SESSION INVOICES')} 
                        className="w-full xs:w-auto px-2.5 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-xs">
                        🖨️ Print
                      </button>
                    </div>
                    
                    {/* Mobile Card View */}
                    <div className="block md:hidden max-h-64 overflow-y-auto space-y-2">
                      {activeSessionInvoices.length === 0 ? (
                        <div className="text-center py-4 text-gray-500 text-xs">No invoices created in this session yet</div>
                      ) : (
                        activeSessionInvoices.map((inv, idx) => (
                          <div key={idx} className="border border-gray-200 rounded-md p-2 bg-gray-50">
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-xs font-medium">{inv.invoiceId}</span>
                              <span className="text-xs font-bold text-green-600">Rs. {formatCurrency(inv.grandTotalAmount)}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-1 text-xs">
                              <div><span className="text-gray-500">Customer:</span> {inv.customerName}</div>
                              <div><span className="text-gray-500">Mobile:</span> {inv.customerMobileNumber1}</div>
                              <div><span className="text-gray-500">Employee:</span> {inv.employeeName}</div>
                              <div><span className="text-gray-500">Commission:</span> <span className="text-purple-600">Rs. {formatCurrency(calculateInvoiceCommission(inv))}</span></div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Desktop Table View */}
                    <div className="overflow-x-auto max-h-64 overflow-y-auto hidden md:block">
                      <table className="min-w-full divide-y divide-gray-200 text-xs">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr><th className="px-2 py-1.5 text-left">Invoice ID</th><th className="px-2 py-1.5 text-left">Customer</th><th className="px-2 py-1.5 text-left hidden md:table-cell">Mobile</th><th className="px-2 py-1.5 text-left">Employee</th><th className="px-2 py-1.5 text-right">Total</th><th className="px-2 py-1.5 text-right">Commission</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {activeSessionInvoices.length === 0 ? (
                            <tr><td colSpan="6" className="px-2 py-4 text-center text-gray-500">No invoices created in this session yet</td></tr>
                          ) : (
                            activeSessionInvoices.map((inv, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-2 py-1 font-medium">{inv.invoiceId}</td>
                                <td className="px-2 py-1">{inv.customerName}</td>
                                <td className="px-2 py-1 hidden md:table-cell">{inv.customerMobileNumber1}</td>
                                <td className="px-2 py-1">{inv.employeeName}</td>
                                <td className="px-2 py-1 text-right font-medium text-green-600">Rs. {formatCurrency(inv.grandTotalAmount)}</td>
                                <td className="px-2 py-1 text-right text-purple-600">Rs. {formatCurrency(calculateInvoiceCommission(inv))}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 sm:py-8">
                  <span className="text-2xl">⏱️</span>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No Active Session</h3>
                  <p className="mt-1 text-xs text-gray-500">Start a new session to begin tracking sales.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div>
            {/* Filters */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-3 sm:mb-4">
              <div className="bg-linear-to-r from-blue-600 to-cyan-600 px-3 sm:px-4 py-2">
                <h2 className="text-xs sm:text-sm font-semibold text-white">Filters</h2>
              </div>
              <div className="p-2 sm:p-3">
                <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-2">
                  <select name="status" value={filters.status} onChange={e => setFilters(p => ({...p, status: e.target.value}))} 
                    className="px-2 py-1.5 border rounded-md text-xs w-full">
                    <option value="">All Status</option><option value="Active">Active</option><option value="Completed">Completed</option>
                  </select>
                  <input type="date" name="startDate" value={filters.startDate} onChange={e => setFilters(p => ({...p, startDate: e.target.value}))} 
                    className="px-2 py-1.5 border rounded-md text-xs w-full" />
                  <input type="date" name="endDate" value={filters.endDate} onChange={e => setFilters(p => ({...p, endDate: e.target.value}))} 
                    className="px-2 py-1.5 border rounded-md text-xs w-full" />
                  <div className="flex gap-2">
                    <button onClick={() => handleFetchSessions(1, filters)} 
                      className="flex-1 px-3 py-1.5 bg-linear-to-r from-blue-600 to-cyan-600 text-white rounded-md text-xs">
                      Apply
                    </button>
                    <button onClick={() => { setFilters({status:'',startDate:'',endDate:''}); handleFetchSessions(1, {}); }} 
                      className="flex-1 px-3 py-1.5 bg-white border rounded-md text-xs">
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Session History */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {/* Mobile Card View */}
              <div className="block lg:hidden">
                {allSessions.map(session => {
                  const sessionInvoices = getInvoicesForSession(session);
                  const hasInv = sessionInvoices.length > 0;
                  return (
                    <div key={session._id} className="border-b border-gray-200 p-3 hover:bg-gray-50 transition duration-150">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-900 truncate">
                            {session.sessionIdentifier || formatDate(session.sessionStartDateTime)}
                          </div>
                          <div className="text-xs text-gray-500">{formatDate(session.sessionStartDateTime)}</div>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold shrink-0 ml-2 ${
                          session.sessionStatus === 'Active' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {session.sessionStatus}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-xs mb-2">
                        <div><span className="text-gray-500">Duration:</span> {getSessionDuration(session)}</div>
                        <div><span className="text-gray-500">Sales:</span> <span className="font-medium text-green-600">Rs. {formatCurrency(session.totalSales)}</span></div>
                        <div><span className="text-gray-500">Items:</span> {session.totalItemsSold || 0}</div>
                        <div><span className="text-gray-500">Commission:</span> <span className="text-purple-600">Rs. {formatCurrency(session.totalCommission)}</span></div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => hasInv ? handleViewSession(session._id) : null} 
                          disabled={!hasInv}
                          className={`flex-1 px-2 py-1.5 rounded text-xs font-medium text-center ${
                            hasInv ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}>
                          {hasInv ? `View (${sessionInvoices.length})` : 'No Invoices'}
                        </button>
                        <button onClick={() => setDeleteConfirm(session._id)} 
                          className="px-2 py-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 text-xs font-medium">
                          Delete
                        </button>
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
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Session</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 hidden md:table-cell">Duration</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Sales</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Items</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 hidden lg:table-cell">Commission</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Status</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {allSessions.map(session => {
                      const sessionInvoices = getInvoicesForSession(session);
                      const hasInv = sessionInvoices.length > 0;
                      return (
                        <tr key={session._id} className="hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <div className="text-xs font-medium">{session.sessionIdentifier || formatDate(session.sessionStartDateTime)}</div>
                            <div className="text-xs text-gray-500">{formatDate(session.sessionStartDateTime)}</div>
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-500 hidden md:table-cell">{getSessionDuration(session)}</td>
                          <td className="px-3 py-2 text-right text-xs font-medium text-green-600">Rs. {formatCurrency(session.totalSales)}</td>
                          <td className="px-3 py-2 text-center text-xs">{session.totalItemsSold || 0}</td>
                          <td className="px-3 py-2 text-right text-xs text-purple-600 hidden lg:table-cell">Rs. {formatCurrency(session.totalCommission)}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                              session.sessionStatus === 'Active' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {session.sessionStatus}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <div className="flex justify-center gap-1.5">
                              <button 
                                onClick={() => hasInv ? handleViewSession(session._id) : null} 
                                disabled={!hasInv}
                                className={`p-1 rounded ${hasInv ? 'text-blue-600 hover:text-blue-800 hover:bg-blue-50' : 'text-gray-300 cursor-not-allowed'}`} 
                                title={hasInv ? `View ${sessionInvoices.length} invoice(s)` : 'No invoices available'}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                              </button>
                              <button onClick={() => setDeleteConfirm(session._id)} className="p-1 rounded text-red-600 hover:text-red-800 hover:bg-red-50" title="Delete session">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="bg-gray-50 px-2 sm:px-3 py-2 flex flex-col xs:flex-row items-center justify-between border-t text-xs gap-2">
                  <span className="text-center xs:text-left">
                    {((pagination.currentPage-1)*pagination.limit)+1}-{Math.min(pagination.currentPage*pagination.limit, pagination.totalSessions)} of {pagination.totalSessions}
                  </span>
                  <div className="flex flex-wrap gap-1 justify-center">
                    <button onClick={() => handleFetchSessions(pagination.currentPage-1)} disabled={pagination.currentPage===1} 
                      className="px-2 py-1 border rounded disabled:opacity-50 text-xs">Prev</button>
                    {[...Array(pagination.totalPages)].map((_,i) => (
                      <button key={i} onClick={() => handleFetchSessions(i+1)} 
                        className={`px-2 py-1 border rounded text-xs ${pagination.currentPage===i+1?'bg-blue-600 text-white':'hover:bg-gray-50'}`}>
                        {i+1}
                      </button>
                    ))}
                    <button onClick={() => handleFetchSessions(pagination.currentPage+1)} disabled={pagination.currentPage===pagination.totalPages} 
                      className="px-2 py-1 border rounded disabled:opacity-50 text-xs">Next</button>
                  </div>
                </div>
              )}
              {!fetchLoading && allSessions.length === 0 && (
                <div className="text-center py-8 sm:py-10">
                  <span className="text-xl">📋</span>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No Sessions Found</h3>
                  <p className="mt-1 text-xs text-gray-500">Completed sessions will appear here.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modals */}
        {(sessionDetails || endConfirm || deleteConfirm) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-3">
            <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {sessionDetails && (
                <>
                  <div className="bg-linear-to-r from-blue-600 to-cyan-600 px-3 sm:px-4 py-2 sm:py-2.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sticky top-0">
                    <h3 className="text-xs sm:text-sm font-semibold text-white truncate">
                      Session Details {sessionDetails.basicInfo?.sessionIdentifier && `(${sessionDetails.basicInfo.sessionIdentifier})`}
                    </h3>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => handlePrintInvoices(selectedSessionInvoices, selectedStats, 'SESSION INVOICES REPORT')} 
                        className="px-2.5 py-1 bg-green-600 text-white rounded-md text-xs">🖨️</button>
                      <button onClick={() => { setSessionDetails(null); setSelectedSession(null); setSelectedSessionInvoices([]); }} 
                        className="text-white hover:text-gray-200">✕</button>
                    </div>
                  </div>
                  <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                    <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-2">
                      {['Start','End'].map((l,i) => (
                        <div key={l} className={`${i?'bg-green':'bg-blue'}-50 rounded-md p-2 sm:p-2.5`}>
                          <p className="text-xs text-gray-600">{l}</p>
                          <p className="text-xs font-medium break-all">{formatDate(sessionDetails.basicInfo?.[i?'endDateTime':'startDateTime'])}</p>
                        </div>
                      ))}
                      <div className="bg-cyan-50 rounded-md p-2 sm:p-2.5">
                        <p className="text-xs text-gray-600">Duration</p>
                        <p className="text-xs font-medium">{sessionDetails.basicInfo?.duration?.hours}h {sessionDetails.basicInfo?.duration?.minutes}m</p>
                      </div>
                      <div className="bg-purple-50 rounded-md p-2 sm:p-2.5">
                        <p className="text-xs text-gray-600">Status</p>
                        <span className={`inline-flex px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                          sessionDetails.basicInfo?.status==='Active'?'bg-green-100 text-green-800':'bg-blue-100 text-blue-800'
                        }`}>
                          {sessionDetails.basicInfo?.status}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                      {['Total Sales','Items Sold','Commission','Employees'].map((l,i) => (
                        <div key={l} className="bg-gray-50 rounded-md p-2 sm:p-2.5">
                          <p className="text-xs text-gray-600">{l}</p>
                          <p className="text-sm font-bold">
                            {i===0||i===2?'Rs. ':''}
                            {i===0?formatCurrency(selectedStats.totalSales):i===1?selectedStats.totalItemsSold:i===2?formatCurrency(selectedStats.totalCommission):selectedStats.employeeCount}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-gray-700 mb-2">Session Invoices ({selectedSessionInvoices.length})</h4>
                      
                      {/* Mobile Card View for Modal */}
                      <div className="block md:hidden max-h-64 overflow-y-auto space-y-2">
                        {selectedSessionInvoices.length === 0 ? (
                          <div className="text-center py-4 text-gray-500 text-xs">No invoices found for this session</div>
                        ) : (
                          selectedSessionInvoices.map((inv, idx) => (
                            <div key={idx} className="border border-gray-200 rounded-md p-2 bg-gray-50">
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-xs font-medium">{inv.invoiceId}</span>
                                <span className="text-xs font-bold text-green-600">Rs. {formatCurrency(inv.grandTotalAmount)}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-1 text-xs">
                                <div><span className="text-gray-500">Customer:</span> {inv.customerName}</div>
                                <div><span className="text-gray-500">Mobile:</span> {inv.customerMobileNumber1}</div>
                                <div><span className="text-gray-500">Employee:</span> {inv.employeeName}</div>
                                <div><span className="text-gray-500">Commission:</span> <span className="text-purple-600">Rs. {formatCurrency(calculateInvoiceCommission(inv))}</span></div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Desktop Table View for Modal */}
                      <div className="overflow-x-auto max-h-64 overflow-y-auto hidden md:block">
                        <table className="min-w-full divide-y divide-gray-200 text-xs">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="px-2 py-1.5 text-left">Invoice ID</th>
                              <th className="px-2 py-1.5 text-left">Customer</th>
                              <th className="px-2 py-1.5 text-left hidden md:table-cell">Mobile</th>
                              <th className="px-2 py-1.5 text-left">Employee</th>
                              <th className="px-2 py-1.5 text-right">Total</th>
                              <th className="px-2 py-1.5 text-right">Commission</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {selectedSessionInvoices.length === 0 ? (
                              <tr><td colSpan="6" className="px-2 py-4 text-center text-gray-500">No invoices found for this session</td></tr>
                            ) : (
                              selectedSessionInvoices.map((inv, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="px-2 py-1 font-medium">{inv.invoiceId}</td>
                                  <td className="px-2 py-1">{inv.customerName}</td>
                                  <td className="px-2 py-1 hidden md:table-cell">{inv.customerMobileNumber1}</td>
                                  <td className="px-2 py-1">{inv.employeeName}</td>
                                  <td className="px-2 py-1 text-right font-medium text-green-600">Rs. {formatCurrency(inv.grandTotalAmount)}</td>
                                  <td className="px-2 py-1 text-right text-purple-600">Rs. {formatCurrency(calculateInvoiceCommission(inv))}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                          {selectedSessionInvoices.length > 0 && (
                            <tfoot className="bg-gray-50">
                              <tr>
                                <td colSpan="4" className="px-2 py-1.5 text-right font-semibold">Totals:</td>
                                <td className="px-2 py-1.5 text-right font-bold text-green-600">Rs. {formatCurrency(selectedStats.totalSales)}</td>
                                <td className="px-2 py-1.5 text-right font-bold text-purple-600">Rs. {formatCurrency(selectedStats.totalCommission)}</td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    </div>
                  </div>
                </>
              )}
              {endConfirm && (
                <div className="max-w-sm w-full">
                  <div className="p-3 sm:p-4 text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <h3 className="mt-2 sm:mt-3 text-sm sm:text-base font-bold">End Session?</h3>
                    <p className="mt-2 text-xs text-gray-600">
                      {activeSessionInvoices.length} invoices, Rs. {formatCurrency(activeStats.totalSales)}
                    </p>
                  </div>
                  <div className="bg-gray-50 px-3 sm:px-4 py-2 sm:py-2.5 rounded-b-lg flex flex-col xs:flex-row justify-end gap-2">
                    <button onClick={() => setEndConfirm(false)} className="w-full xs:w-auto px-3 py-1.5 bg-white border rounded-md text-xs">Cancel</button>
                    <button onClick={handleEndSession} className="w-full xs:w-auto px-3 py-1.5 bg-red-600 text-white rounded-md text-xs">
                      {loading?'Ending...':'End Session'}
                    </button>
                  </div>
                </div>
              )}
              {deleteConfirm && (
                <div className="max-w-sm w-full">
                  <div className="p-3 sm:p-4 text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <h3 className="mt-2 sm:mt-3 text-sm sm:text-base font-bold">Delete Session?</h3>
                    <p className="mt-2 text-xs text-gray-500">Cannot be undone.</p>
                  </div>
                  <div className="bg-gray-50 px-3 sm:px-4 py-2 sm:py-2.5 rounded-b-lg flex flex-col xs:flex-row justify-end gap-2">
                    <button onClick={() => setDeleteConfirm(null)} className="w-full xs:w-auto px-3 py-1.5 bg-white border rounded-md text-xs">Cancel</button>
                    <button onClick={() => handleDeleteSession(deleteConfirm)} className="w-full xs:w-auto px-3 py-1.5 bg-red-600 text-white rounded-md text-xs">
                      {loading?'Deleting...':'Delete'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {fetchLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-40">
            <div className="bg-white rounded-lg p-4 shadow-xl flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-sm text-gray-700">Loading...</span>
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
          .xs\\:space-x-6 > * + * {
            margin-left: 1.5rem;
          }
          .xs\\:text-left {
            text-align: left;
          }
        }
        .text-2xs {
          font-size: 0.65rem;
        }
      `}</style>
    </div>
  );
};

export default SessionManagement;