// StockHistory.jsx - View all stock operations with Infinite Scroll + PKT support
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = 'https://bisni-ms-backend.onrender.com/api';

// ✅ Pakistan Standard Time (UTC+5) - Full date & time
const formatPakistanTime = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-PK', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

// ✅ Pakistan Standard Time (UTC+5) - Date only
const formatPakistanDateOnly = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-PK', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// ✅ Pakistan Standard Time (UTC+5) - Time only
const formatPakistanTimeOnly = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleTimeString('en-PK', {
    timeZone: 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

// ✅ Convert PKT date input (YYYY-MM-DD) to UTC ISO string
const convertPktDateToUtc = (dateString, isEndDate = false) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);

  if (isEndDate) {
    const utcDate = new Date(Date.UTC(year, month - 1, day, 18, 59, 59, 999));
    return utcDate.toISOString();
  } else {
    const utcDate = new Date(Date.UTC(year, month - 1, day - 1, 19, 0, 0, 0));
    return utcDate.toISOString();
  }
};

const PAGE_SIZE = 10; // ✅ Load 10 records at a time

const StockHistory = () => {
  const [history, setHistory] = useState([]);                     // All fetched records from backend
  const [visibleHistory, setVisibleHistory] = useState([]);       // Currently visible (loaded) records
  const [loading, setLoading] = useState(true);                   // Initial load
  const [loadingMore, setLoadingMore] = useState(false);          // Loading next batch
  const [hasMore, setHasMore] = useState(true);                   // More to load?
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [filterOptions, setFilterOptions] = useState({
    productNames: [],
    productCategories: [],
    productColors: []
  });

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    creates: 0,
    updates: 0,
    deletes: 0
  });

  // Total records from backend (for display)
  const [totalRecords, setTotalRecords] = useState(0);

  // Filters
  const [filters, setFilters] = useState({
    actionType: '',
    productName: '',
    productCategory: '',
    productColor: '',
    date: '',
    startDate: '',
    endDate: ''
  });

  const [dateFilterType, setDateFilterType] = useState('all');

  // ✅ Infinite scroll refs
  const sentinelRef = useRef(null);
  const pageRef = useRef(0);

  useEffect(() => {
    fetchFilterOptions();
    fetchHistory(1, filters);
  }, []);

  const fetchFilterOptions = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/stock-history/filters`);
      setFilterOptions(response.data.data || {});
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  // ✅ Fetch history — backend returns paginated data.
  // Hum backend se bara page size maang rahe hain (e.g., 1000) taake sara data ek baar aa jaye,
  // phir frontend par 10-10 karke scroll par reveal karenge.
  const fetchHistory = useCallback(async (page = 1, filterParams = filters) => {
    try {
      setLoading(true);
      setError(null);
      pageRef.current = 0;

      const params = new URLSearchParams();
      params.append('page', 1);
      params.append('limit', 1000); // ✅ Fetch all in one go (backend already supports limit)

      if (filterParams.actionType) params.append('actionType', filterParams.actionType);
      if (filterParams.productName) params.append('productName', filterParams.productName);
      if (filterParams.productCategory) params.append('productCategory', filterParams.productCategory);
      if (filterParams.productColor) params.append('productColor', filterParams.productColor);

      // ✅ Convert single date from PKT to UTC range
      if (filterParams.date) {
        const dateFromUtc = convertPktDateToUtc(filterParams.date, false);
        const dateToUtc = convertPktDateToUtc(filterParams.date, true);
        params.append('startDate', dateFromUtc);
        params.append('endDate', dateToUtc);
      } else {
        if (filterParams.startDate) {
          params.append('startDate', convertPktDateToUtc(filterParams.startDate, false));
        }
        if (filterParams.endDate) {
          params.append('endDate', convertPktDateToUtc(filterParams.endDate, true));
        }
      }

      const response = await axios.get(`${API_BASE_URL}/stock-history?${params.toString()}`);

      const allRecords = response.data.data || [];
      setHistory(allRecords);
      setTotalRecords(response.data.pagination?.totalRecords || allRecords.length);
      setStats(response.data.statistics || { total: 0, creates: 0, updates: 0, deletes: 0 });

      // ✅ Show only first 10
      const firstBatch = allRecords.slice(0, PAGE_SIZE);
      setVisibleHistory(firstBatch);
      setHasMore(allRecords.length > PAGE_SIZE);
    } catch (error) {
      console.error('Error fetching history:', error);
      setError(error.response?.data?.message || 'Failed to load stock history.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // ✅ Load more records (used by infinite scroll)
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    const nextPage = pageRef.current + 1;
    const startIdx = nextPage * PAGE_SIZE;
    const endIdx = startIdx + PAGE_SIZE;

    setTimeout(() => {
      const nextBatch = history.slice(startIdx, endIdx);
      setVisibleHistory(prev => [...prev, ...nextBatch]);
      pageRef.current = nextPage;
      setHasMore(endIdx < history.length);
      setLoadingMore(false);
    }, 250);
  }, [loadingMore, hasMore, history]);

  // ✅ IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadMore();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loadMore, hasMore, loadingMore, loading]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    fetchHistory(1, filters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      actionType: '',
      productName: '',
      productCategory: '',
      productColor: '',
      date: '',
      startDate: '',
      endDate: ''
    };
    setFilters(clearedFilters);
    setDateFilterType('all');
    fetchHistory(1, clearedFilters);
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  // Formatting helpers
  const formatDate = (dateString) => formatPakistanTime(dateString);
  const formatDateOnly = (dateString) => formatPakistanDateOnly(dateString);
  const formatTimeOnly = (dateString) => formatPakistanTimeOnly(dateString);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const getActionBadge = (actionType) => {
    switch (actionType) {
      case 'CREATE':
        return { bg: 'bg-green-100', text: 'text-green-800', icon: '➕', label: 'Added' };
      case 'UPDATE':
        return { bg: 'bg-blue-100', text: 'text-blue-800', icon: '✏️', label: 'Updated' };
      case 'DELETE':
        return { bg: 'bg-red-100', text: 'text-red-800', icon: '🗑️', label: 'Deleted' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', icon: '📝', label: actionType };
    }
  };

  const getQuantityChange = (entry) => {
    if (entry.actionType === 'CREATE') {
      return { text: `+${entry.productQuantity}`, color: 'text-green-600' };
    }
    if (entry.actionType === 'DELETE') {
      return { text: `-${entry.productQuantity}`, color: 'text-red-600' };
    }
    if (entry.actionType === 'UPDATE' && entry.previousValues) {
      const diff = entry.productQuantity - entry.previousValues.productQuantity;
      if (diff > 0) return { text: `+${diff}`, color: 'text-green-600' };
      if (diff < 0) return { text: `${diff}`, color: 'text-red-600' };
      return { text: '0', color: 'text-gray-600' };
    }
    return { text: '-', color: 'text-gray-400' };
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 py-3 sm:py-4 md:py-5 px-2 sm:px-3 md:px-4 lg:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-5">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">STOCK HISTORY</h1>
          <p className="text-xs text-gray-600">Track all stock operations with date & time</p>
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

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="bg-white rounded-lg shadow-md p-2 sm:p-3 border-l-4 border-gray-500">
            <p className="text-2xs sm:text-xs font-medium text-gray-600">Total Records</p>
            <p className="text-lg sm:text-xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-2 sm:p-3 border-l-4 border-green-500">
            <p className="text-2xs sm:text-xs font-medium text-gray-600">Added</p>
            <p className="text-lg sm:text-xl font-bold text-green-600">{stats.creates}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-2 sm:p-3 border-l-4 border-blue-500">
            <p className="text-2xs sm:text-xs font-medium text-gray-600">Updated</p>
            <p className="text-lg sm:text-xl font-bold text-blue-600">{stats.updates}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-2 sm:p-3 border-l-4 border-red-500">
            <p className="text-2xs sm:text-xs font-medium text-gray-600">Deleted</p>
            <p className="text-lg sm:text-xl font-bold text-red-600">{stats.deletes}</p>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-3 sm:mb-4">
          <div className="bg-linear-to-r from-purple-600 to-indigo-600 px-3 sm:px-4 py-2">
            <h2 className="text-xs sm:text-sm font-semibold text-white flex items-center">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
            </h2>
          </div>

          <div className="p-2 sm:p-3">
            {/* Action Type Quick Filters */}
            <div className="flex flex-wrap gap-2 mb-3">
              <button
                onClick={() => { setFilters(prev => ({ ...prev, actionType: '' })); fetchHistory(1, { ...filters, actionType: '' }); }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  filters.actionType === '' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Actions
              </button>
              <button
                onClick={() => { setFilters(prev => ({ ...prev, actionType: 'CREATE' })); fetchHistory(1, { ...filters, actionType: 'CREATE' }); }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  filters.actionType === 'CREATE' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'
                }`}
              >
                ➕ Added
              </button>
              <button
                onClick={() => { setFilters(prev => ({ ...prev, actionType: 'UPDATE' })); fetchHistory(1, { ...filters, actionType: 'UPDATE' }); }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  filters.actionType === 'UPDATE' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                ✏️ Updated
              </button>
              <button
                onClick={() => { setFilters(prev => ({ ...prev, actionType: 'DELETE' })); fetchHistory(1, { ...filters, actionType: 'DELETE' }); }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  filters.actionType === 'DELETE' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'
                }`}
              >
                🗑️ Deleted
              </button>
            </div>

            {/* Detailed Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Product Name</label>
                <select
                  name="productName"
                  value={filters.productName}
                  onChange={handleFilterChange}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-purple-500"
                >
                  <option value="">All Products</option>
                  {filterOptions.productNames?.map((name, idx) => (
                    <option key={idx} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                <select
                  name="productCategory"
                  value={filters.productCategory}
                  onChange={handleFilterChange}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-purple-500"
                >
                  <option value="">All Categories</option>
                  {filterOptions.productCategories?.map((cat, idx) => (
                    <option key={idx} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Color</label>
                <select
                  name="productColor"
                  value={filters.productColor}
                  onChange={handleFilterChange}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-purple-500"
                >
                  <option value="">All Colors</option>
                  {filterOptions.productColors?.map((color, idx) => (
                    <option key={idx} value={color}>{color}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Date Filter Type</label>
                <select
                  value={dateFilterType}
                  onChange={(e) => {
                    setDateFilterType(e.target.value);
                    setFilters(prev => ({ ...prev, date: '', startDate: '', endDate: '' }));
                  }}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-purple-500"
                >
                  <option value="all">All Time</option>
                  <option value="specific">Specific Date</option>
                  <option value="range">Date Range</option>
                </select>
              </div>

              {dateFilterType === 'specific' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Select Date</label>
                  <input
                    type="date"
                    name="date"
                    value={filters.date}
                    onChange={handleFilterChange}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              )}

              {dateFilterType === 'range' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      name="startDate"
                      value={filters.startDate}
                      onChange={handleFilterChange}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      name="endDate"
                      value={filters.endDate}
                      onChange={handleFilterChange}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Filter Actions */}
            <div className="flex flex-col sm:flex-row justify-end gap-2 mt-3">
              <button
                onClick={clearFilters}
                className="w-full sm:w-auto px-3 py-1.5 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 text-xs font-medium"
              >
                Clear Filters
              </button>
              <button
                onClick={applyFilters}
                disabled={loading}
                className="w-full sm:w-auto px-4 py-1.5 bg-linear-to-r from-purple-600 to-indigo-600 text-white rounded-md hover:from-purple-700 hover:to-indigo-700 text-xs font-medium disabled:opacity-50"
              >
                {loading ? 'Searching...' : 'Apply Filters'}
              </button>
            </div>
          </div>
        </div>

        {/* History List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-linear-to-r from-purple-600 to-indigo-600 px-3 sm:px-4 py-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <h2 className="text-xs sm:text-sm font-semibold text-white">
              History Records
              <span className="ml-2 text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded-full">
                {visibleHistory.length} of {history.length}
              </span>
            </h2>
            <button
              onClick={() => fetchHistory(1, filters)}
              className="w-full sm:w-auto px-2.5 py-1 bg-white text-purple-600 rounded-md hover:bg-gray-100 text-xs font-medium"
            >
              🔄 Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-3xl">📋</span>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No History Records</h3>
              <p className="mt-1 text-xs text-gray-500">No stock operations recorded yet.</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block lg:hidden">
                {visibleHistory.map((entry) => {
                  const badge = getActionBadge(entry.actionType);
                  const qtyChange = getQuantityChange(entry);

                  return (
                    <div
                      key={entry._id}
                      className="border-b border-gray-200 p-3 hover:bg-gray-50 transition duration-150 cursor-pointer"
                      onClick={() => setSelectedEntry(entry)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                            {badge.icon} {badge.label}
                          </span>
                        </div>
                        <span className={`text-xs font-bold ${qtyChange.color}`}>
                          {qtyChange.text}
                        </span>
                      </div>

                      <div className="mb-2">
                        <p className="text-sm font-medium text-gray-900">{entry.productName}</p>
                        <p className="text-xs text-gray-500">{entry.productCategory} • {entry.productColor}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-1 text-xs">
                        <div>
                          <span className="text-gray-500">Price:</span>
                          <span className="ml-1 font-medium">Rs. {formatCurrency(entry.productPurchasePrice)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Qty:</span>
                          <span className="ml-1 font-medium">{entry.productQuantity}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-500">Date:</span>
                          <span className="ml-1">{formatDate(entry.createdAt)}</span>
                        </div>
                      </div>

                      {entry.changesSummary && (
                        <div className="mt-2 p-1.5 bg-gray-100 rounded text-xs text-gray-600 truncate">
                          {entry.changesSummary}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="overflow-x-auto hidden lg:block">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Color</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Qty</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Change</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-16">Details</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {visibleHistory.map((entry) => {
                      const badge = getActionBadge(entry.actionType);
                      const qtyChange = getQuantityChange(entry);

                      return (
                        <tr key={entry._id} className="hover:bg-gray-50 transition duration-150">
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                              {badge.icon} {badge.label}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900">{entry.productName}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">{entry.productCategory}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                            <span className="inline-flex items-center">
                              <span className="w-2 h-2 rounded-full mr-1.5 border border-gray-300"
                                style={{ backgroundColor: entry.productColor?.toLowerCase() }}></span>
                              {entry.productColor}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-right text-xs text-gray-900">
                            Rs. {formatCurrency(entry.productPurchasePrice)}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-center text-xs font-medium text-gray-900">
                            {entry.productQuantity}
                          </td>
                          <td className={`px-3 py-2 whitespace-nowrap text-center text-xs font-bold ${qtyChange.color}`}>
                            {qtyChange.text}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                            <div>{formatDateOnly(entry.createdAt)}</div>
                            <div className="text-gray-400">{formatTimeOnly(entry.createdAt)}</div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-center">
                            <button
                              onClick={() => setSelectedEntry(entry)}
                              className="inline-flex items-center px-2 py-1 bg-purple-50 text-purple-600 rounded hover:bg-purple-100 text-xs font-medium"
                            >
                              👁️ View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ✅ Infinite Scroll Sentinel & Loaders */}
              <div ref={sentinelRef} className="h-2"></div>

              {loadingMore && (
                <div className="flex justify-center items-center py-4 bg-gray-50 border-t">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600 mr-2"></div>
                  <span className="text-xs text-gray-600">Loading more...</span>
                </div>
              )}

              {!hasMore && visibleHistory.length > 0 && (
                <div className="text-center py-4 bg-gray-50 border-t">
                  <span className="text-xs text-gray-500">✅ All {history.length} records loaded</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Detail Modal */}
        {selectedEntry && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3">
            <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className={`px-4 py-3 flex justify-between items-center ${
                selectedEntry.actionType === 'CREATE' ? 'bg-green-600' :
                selectedEntry.actionType === 'UPDATE' ? 'bg-blue-600' : 'bg-red-600'
              }`}>
                <h3 className="text-sm font-semibold text-white">
                  {getActionBadge(selectedEntry.actionType).icon} {getActionBadge(selectedEntry.actionType).label} - Details
                </h3>
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="text-white hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Basic Info */}
                <div className="bg-gray-50 rounded-md p-3">
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">Product Information</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Name:</span>
                      <span className="ml-1 font-medium">{selectedEntry.productName}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Category:</span>
                      <span className="ml-1 font-medium">{selectedEntry.productCategory}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Color:</span>
                      <span className="ml-1 font-medium">{selectedEntry.productColor}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Price:</span>
                      <span className="ml-1 font-medium">Rs. {formatCurrency(selectedEntry.productPurchasePrice)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Quantity:</span>
                      <span className="ml-1 font-medium">{selectedEntry.productQuantity}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Status:</span>
                      <span className="ml-1 font-medium">{selectedEntry.productStatus}</span>
                    </div>
                  </div>
                </div>

                {/* Previous Values (for UPDATE) */}
                {selectedEntry.actionType === 'UPDATE' && selectedEntry.previousValues && (
                  <div className="bg-yellow-50 rounded-md p-3 border border-yellow-200">
                    <h4 className="text-xs font-semibold text-yellow-800 mb-2">Previous Values</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">Name:</span>
                        <span className="ml-1">{selectedEntry.previousValues.productName}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Category:</span>
                        <span className="ml-1">{selectedEntry.previousValues.productCategory}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Color:</span>
                        <span className="ml-1">{selectedEntry.previousValues.productColor}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Price:</span>
                        <span className="ml-1">Rs. {formatCurrency(selectedEntry.previousValues.productPurchasePrice)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Quantity:</span>
                        <span className="ml-1">{selectedEntry.previousValues.productQuantity}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Changes Summary */}
                {selectedEntry.changesSummary && (
                  <div className="bg-blue-50 rounded-md p-3 border border-blue-200">
                    <h4 className="text-xs font-semibold text-blue-800 mb-1">Changes Summary</h4>
                    <p className="text-xs text-blue-700">{selectedEntry.changesSummary}</p>
                  </div>
                )}

                {/* Timestamp */}
                <div className="bg-gray-50 rounded-md p-3">
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">Timestamp</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Date:</span>
                      <span className="ml-1 font-medium">{formatDateOnly(selectedEntry.createdAt)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Time:</span>
                      <span className="ml-1 font-medium">{formatTimeOnly(selectedEntry.createdAt)}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500">Full Timestamp:</span>
                      <span className="ml-1 font-medium">{formatDate(selectedEntry.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Performed By */}
                <div className="text-xs text-gray-500 text-center">
                  Performed by: <span className="font-medium">{selectedEntry.performedBy || 'System'}</span>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-2 rounded-b-lg flex justify-end">
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="px-4 py-1.5 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-xs font-medium"
                >
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
