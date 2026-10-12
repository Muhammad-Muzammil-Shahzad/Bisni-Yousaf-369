// StockHistory.jsx - Simple & Clean Stock View with Summary + Details
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = 'https://bisni-ms-backend.onrender.com/api';
const PAGE_SIZE = 15;

// ============ HELPER FUNCTIONS ============
const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-PK', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0);
};

const convertPktDateToUtc = (dateString, isEndDate = false) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  if (isEndDate) {
    return new Date(Date.UTC(year, month - 1, day, 18, 59, 59, 999)).toISOString();
  }
  return new Date(Date.UTC(year, month - 1, day - 1, 19, 0, 0, 0)).toISOString();
};

// ============ MAIN COMPONENT ============
const StockHistory = () => {
  // View mode: 'summary' or 'details'
  const [viewMode, setViewMode] = useState('summary');
  
  // Summary state
  const [summary, setSummary] = useState({ products: [], totals: {} });
  const [summaryLoading, setSummaryLoading] = useState(true);
  
  // Details state
  const [history, setHistory] = useState([]);
  const [visibleHistory, setVisibleHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  
  // Common state
  const [error, setError] = useState(null);
  const [filterOptions, setFilterOptions] = useState({ productNames: [], productCategories: [], productColors: [] });
  const [selectedEntry, setSelectedEntry] = useState(null);
  
  // Date filters
  const [dateFilter, setDateFilter] = useState({ startDate: '', endDate: '' });
  
  // Infinite scroll refs
  const sentinelRef = useRef(null);
  const pageRef = useRef(1);

  // ============ FETCH FILTER OPTIONS ============
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/stock-history/filters`);
        setFilterOptions(res.data.data || {});
      } catch (err) {
        console.error('Error fetching filters:', err);
      }
    };
    fetchFilters();
  }, []);

  // ============ FETCH SUMMARY ============
  const fetchSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (dateFilter.startDate) params.append('startDate', convertPktDateToUtc(dateFilter.startDate, false));
      if (dateFilter.endDate) params.append('endDate', convertPktDateToUtc(dateFilter.endDate, true));
      
      const res = await axios.get(`${API_BASE_URL}/stock-history/summary?${params}`);
      setSummary(res.data.data || { products: [], totals: {} });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load summary');
    } finally {
      setSummaryLoading(false);
    }
  }, [dateFilter]);

  // ============ FETCH HISTORY ============
  const fetchHistory = useCallback(async (reset = true) => {
    try {
      if (reset) {
        setHistoryLoading(true);
        pageRef.current = 1;
      }
      
      const params = new URLSearchParams();
      params.append('page', reset ? 1 : pageRef.current);
      params.append('limit', PAGE_SIZE);
      
      if (dateFilter.startDate) params.append('startDate', convertPktDateToUtc(dateFilter.startDate, false));
      if (dateFilter.endDate) params.append('endDate', convertPktDateToUtc(dateFilter.endDate, true));
      
      const res = await axios.get(`${API_BASE_URL}/stock-history?${params}`);
      const newData = res.data.data || [];
      
      if (reset) {
        setHistory(newData);
        setVisibleHistory(newData);
        setTotalRecords(res.data.pagination?.totalRecords || 0);
        setHasMore(newData.length === PAGE_SIZE);
      } else {
        setHistory(prev => [...prev, ...newData]);
        setVisibleHistory(prev => [...prev, ...newData]);
        setHasMore(newData.length === PAGE_SIZE);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load history');
    } finally {
      setHistoryLoading(false);
      setLoadingMore(false);
    }
  }, [dateFilter]);

  // ============ LOAD MORE (INFINITE SCROLL) ============
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || historyLoading) return;
    setLoadingMore(true);
    pageRef.current += 1;
    fetchHistory(false);
  }, [loadingMore, hasMore, historyLoading, fetchHistory]);

  // ============ INTERSECTION OBSERVER ============
  useEffect(() => {
    if (viewMode !== 'details' || !sentinelRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !historyLoading) {
          loadMore();
        }
      },
      { rootMargin: '200px' }
    );
    
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [viewMode, loadMore, hasMore, loadingMore, historyLoading]);

  // ============ INITIAL LOAD & VIEW SWITCH ============
  useEffect(() => {
    if (viewMode === 'summary') {
      fetchSummary();
    } else {
      fetchHistory(true);
    }
  }, [viewMode, fetchSummary, fetchHistory]);

  // ============ APPLY DATE FILTER ============
  const applyDateFilter = () => {
    if (viewMode === 'summary') {
      fetchSummary();
    } else {
      fetchHistory(true);
    }
  };

  const clearDateFilter = () => {
    setDateFilter({ startDate: '', endDate: '' });
    setTimeout(() => {
      if (viewMode === 'summary') fetchSummary();
      else fetchHistory(true);
    }, 0);
  };

  // ============ ACTION BADGE ============
  const getActionBadge = (type) => {
    const badges = {
      CREATE: { bg: 'bg-green-100', text: 'text-green-700', icon: '➕', label: 'Added' },
      UPDATE: { bg: 'bg-blue-100', text: 'text-blue-700', icon: '✏️', label: 'Updated' },
      DELETE: { bg: 'bg-red-100', text: 'text-red-700', icon: '🗑️', label: 'Deleted' }
    };
    return badges[type] || { bg: 'bg-gray-100', text: 'text-gray-700', icon: '📝', label: type };
  };

  // ============ RENDER SUMMARY VIEW ============
  const renderSummary = () => {
    if (summaryLoading) {
      return (
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
        </div>
      );
    }

    if (!summary.products?.length) {
      return (
        <div className="text-center py-16">
          <span className="text-4xl">📦</span>
          <h3 className="mt-3 text-sm font-medium text-gray-900">No Stock Activity</h3>
          <p className="mt-1 text-xs text-gray-500">No stock operations recorded in this session.</p>
        </div>
      );
    }

    return (
      <>
        {/* Summary Totals Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-gray-50 border-b">
          <div className="bg-white rounded-lg p-3 text-center shadow-sm border-l-4 border-purple-500">
            <p className="text-2xl font-bold text-purple-600">{summary.totals?.totalProducts || 0}</p>
            <p className="text-xs text-gray-600 mt-1">Products</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center shadow-sm border-l-4 border-green-500">
            <p className="text-2xl font-bold text-green-600">{summary.totals?.totalAdded || 0}</p>
            <p className="text-xs text-gray-600 mt-1">Total Added</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center shadow-sm border-l-4 border-red-500">
            <p className="text-2xl font-bold text-red-600">{summary.totals?.totalDeleted || 0}</p>
            <p className="text-xs text-gray-600 mt-1">Total Deleted</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center shadow-sm border-l-4 border-blue-500">
            <p className="text-2xl font-bold text-blue-600">{summary.totals?.totalUpdates || 0}</p>
            <p className="text-xs text-gray-600 mt-1">Updates</p>
          </div>
        </div>

        {/* Product Summary Cards */}
        <div className="p-3 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <span>📋</span> Stock Added by Product
          </h3>
          
          {summary.products.map((product, idx) => (
            <div key={idx} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
              {/* Product Header */}
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 px-4 py-2.5 border-b border-gray-100">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full border border-gray-300" 
                      style={{ backgroundColor: product.productColor?.toLowerCase() }}></span>
                    <span className="font-semibold text-gray-800">{product.productName}</span>
                  </div>
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                    {product.productCategory}
                  </span>
                </div>
              </div>
              
              {/* Product Stats */}
              <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="text-center">
                  <p className="text-lg font-bold text-green-600">+{product.totalAdded}</p>
                  <p className="text-xs text-gray-500">Added</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-red-600">-{product.totalDeleted}</p>
                  <p className="text-xs text-gray-500">Deleted</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-blue-600">{product.totalUpdated}</p>
                  <p className="text-xs text-gray-500">Updates</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-800">{product.netQuantity}</p>
                  <p className="text-xs text-gray-500">Net Change</p>
                </div>
              </div>
              
              {/* Footer */}
              <div className="px-3 py-2 bg-gray-50 border-t text-xs text-gray-500 flex flex-wrap justify-between gap-2">
                <span>💰 Last Price: Rs. {formatCurrency(product.lastPrice)}</span>
                <span>📅 Last Activity: {formatDateTime(product.lastAction)}</span>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  };

  // ============ RENDER DETAILS VIEW ============
  const renderDetails = () => {
    if (historyLoading && visibleHistory.length === 0) {
      return (
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
        </div>
      );
    }

    if (visibleHistory.length === 0) {
      return (
        <div className="text-center py-16">
          <span className="text-4xl">📋</span>
          <h3 className="mt-3 text-sm font-medium text-gray-900">No History Records</h3>
          <p className="mt-1 text-xs text-gray-500">No stock operations found.</p>
        </div>
      );
    }

    return (
      <>
        {/* Mobile Cards */}
        <div className="block lg:hidden divide-y divide-gray-100">
          {visibleHistory.map((entry) => {
            const badge = getActionBadge(entry.actionType);
            return (
              <div key={entry._id} className="p-3 hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedEntry(entry)}>
                <div className="flex justify-between items-start mb-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                    {badge.icon} {badge.label}
                  </span>
                  <span className="text-xs text-gray-400">{formatDateTime(entry.createdAt)}</span>
                </div>
                <p className="font-medium text-gray-800">{entry.productName}</p>
                <p className="text-xs text-gray-500">{entry.productCategory} • {entry.productColor}</p>
                <div className="mt-2 flex justify-between text-xs">
                  <span>Qty: <strong>{entry.productQuantity}</strong></span>
                  <span>Rs. {formatCurrency(entry.productPurchasePrice)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Color</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Qty</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Details</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {visibleHistory.map((entry) => {
                const badge = getActionBadge(entry.actionType);
                return (
                  <tr key={entry._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                        {badge.icon} {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{entry.productName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{entry.productCategory}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full border border-gray-300" 
                          style={{ backgroundColor: entry.productColor?.toLowerCase() }}></span>
                        {entry.productColor}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-800">Rs. {formatCurrency(entry.productPurchasePrice)}</td>
                    <td className="px-4 py-3 text-sm text-center font-medium">{entry.productQuantity}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDateTime(entry.createdAt)}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => setSelectedEntry(entry)} 
                        className="px-2 py-1 bg-purple-50 text-purple-600 rounded text-xs font-medium hover:bg-purple-100">
                        👁️ View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Infinite Scroll Sentinel */}
        <div ref={sentinelRef} className="h-2"></div>

        {loadingMore && (
          <div className="flex justify-center items-center py-4 bg-gray-50 border-t">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600 mr-2"></div>
            <span className="text-xs text-gray-600">Loading more...</span>
          </div>
        )}

        {!hasMore && visibleHistory.length > 0 && (
          <div className="text-center py-4 bg-gray-50 border-t">
            <span className="text-xs text-gray-500">✅ All {visibleHistory.length} records loaded</span>
          </div>
        )}
      </>
    );
  };

  // ============ MAIN RENDER ============
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-4 px-3 sm:px-4 lg:px-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="text-xl font-bold text-gray-900">STOCK HISTORY</h1>
          <p className="text-xs text-gray-600 mt-1">Track stock operations during this session</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-3 rounded-r-lg text-sm">
            <div className="flex items-center justify-between">
              <span className="text-red-700">❌ {error}</span>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">✕</button>
            </div>
          </div>
        )}

        {/* View Toggle + Date Filter */}
        <div className="bg-white rounded-lg shadow-md p-3 mb-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            
            {/* View Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('summary')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  viewMode === 'summary' 
                    ? 'bg-purple-600 text-white shadow' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                📊 Summary
              </button>
              <button
                onClick={() => setViewMode('details')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  viewMode === 'details' 
                    ? 'bg-purple-600 text-white shadow' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                📋 Details
              </button>
            </div>

            {/* Date Filters */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <input
                type="date"
                value={dateFilter.startDate}
                onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                className="px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-purple-500"
                placeholder="Start Date"
              />
              <span className="text-gray-400 text-xs">to</span>
              <input
                type="date"
                value={dateFilter.endDate}
                onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                className="px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-purple-500"
                placeholder="End Date"
              />
              <button
                onClick={applyDateFilter}
                className="px-3 py-1.5 bg-purple-600 text-white rounded-md text-xs font-medium hover:bg-purple-700"
              >
                Apply
              </button>
              {(dateFilter.startDate || dateFilter.endDate) && (
                <button
                  onClick={clearDateFilter}
                  className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md text-xs font-medium hover:bg-gray-300"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-white">
              {viewMode === 'summary' ? '📊 Session Stock Summary' : '📋 Detailed History'}
            </h2>
            <button
              onClick={() => viewMode === 'summary' ? fetchSummary() : fetchHistory(true)}
              className="px-2.5 py-1 bg-white/20 text-white rounded text-xs font-medium hover:bg-white/30"
            >
              🔄 Refresh
            </button>
          </div>

          {/* Content */}
          {viewMode === 'summary' ? renderSummary() : renderDetails()}
        </div>

        {/* Detail Modal */}
        {selectedEntry && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className={`px-4 py-3 flex justify-between items-center ${
                selectedEntry.actionType === 'CREATE' ? 'bg-green-600' :
                selectedEntry.actionType === 'UPDATE' ? 'bg-blue-600' : 'bg-red-600'
              }`}>
                <h3 className="text-sm font-semibold text-white">
                  {getActionBadge(selectedEntry.actionType).icon} {getActionBadge(selectedEntry.actionType).label} - Details
                </h3>
                <button onClick={() => setSelectedEntry(null)} className="text-white hover:text-gray-200">✕</button>
              </div>

              {/* Modal Body */}
              <div className="p-4 space-y-3">
                {/* Product Info */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <h4 className="text-xs font-semibold text-gray-600 mb-2">Product Information</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500 text-xs">Name:</span>
                      <p className="font-medium">{selectedEntry.productName}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">Category:</span>
                      <p className="font-medium">{selectedEntry.productCategory}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">Color:</span>
                      <p className="font-medium flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full border border-gray-300" 
                          style={{ backgroundColor: selectedEntry.productColor?.toLowerCase() }}></span>
                        {selectedEntry.productColor}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">Price:</span>
                      <p className="font-medium">Rs. {formatCurrency(selectedEntry.productPurchasePrice)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">Quantity:</span>
                      <p className="font-medium">{selectedEntry.productQuantity}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">Status:</span>
                      <p className="font-medium">{selectedEntry.productStatus}</p>
                    </div>
                  </div>
                </div>

                {/* Previous Values (UPDATE only) */}
                {selectedEntry.actionType === 'UPDATE' && selectedEntry.previousValues && (
                  <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                    <h4 className="text-xs font-semibold text-yellow-700 mb-2">Previous Values</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500 text-xs">Quantity:</span>
                        <p>{selectedEntry.previousValues.productQuantity}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs">Price:</span>
                        <p>Rs. {formatCurrency(selectedEntry.previousValues.productPurchasePrice)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Changes Summary */}
                {selectedEntry.changesSummary && (
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <h4 className="text-xs font-semibold text-blue-700 mb-1">Changes</h4>
                    <p className="text-sm text-blue-800">{selectedEntry.changesSummary}</p>
                  </div>
                )}

                {/* Timestamp */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <h4 className="text-xs font-semibold text-gray-600 mb-1">Timestamp</h4>
                  <p className="text-sm font-medium">{formatDateTime(selectedEntry.createdAt)}</p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 px-4 py-2 flex justify-end">
                <button onClick={() => setSelectedEntry(null)}
                  className="px-4 py-1.5 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockHistory;
