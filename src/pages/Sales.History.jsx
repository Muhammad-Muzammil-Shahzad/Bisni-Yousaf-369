// EmployeeItemsSold.jsx - With Infinite Scroll (10 at a time) + PKT support
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
const formatPakistanDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-PK', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// ✅ Get PKT date string (YYYY-MM-DD) from a UTC date string
const getPktDateString = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  const pktOffset = 5 * 60 * 60 * 1000;
  const pktDate = new Date(d.getTime() + pktOffset);
  return pktDate.toISOString().split('T')[0];
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

const PAGE_SIZE = 10; // ✅ Load 10 items at a time

const EmployeeItemsSold = () => {
  const [itemsData, setItemsData] = useState([]);                 // All items (master)
  const [allFilteredItems, setAllFilteredItems] = useState([]);   // All filtered (for pagination)
  const [filteredItems, setFilteredItems] = useState([]);         // Visible (loaded) items
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeSummary, setEmployeeSummary] = useState(null);

  // Filter states
  const [filters, setFilters] = useState({
    itemName: '',
    category: '',
    color: '',
    date: '',
    startDate: '',
    endDate: '',
    employeeName: ''
  });

  // ✅ Infinite scroll refs
  const sentinelRef = useRef(null);
  const pageRef = useRef(0);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      pageRef.current = 0;

      // Fetch all invoices
      const invoicesResponse = await axios.get(`${API_BASE_URL}/invoice`);
      const invoices = invoicesResponse.data.data || invoicesResponse.data || [];

      // Fetch all employees
      const employeesResponse = await axios.get(`${API_BASE_URL}/employee`);
      const employees = employeesResponse.data.data || employeesResponse.data || [];

      setEmployees(employees);

      // Process items from invoices
      const processedItems = [];
      const employeeMap = {};

      invoices.forEach(invoice => {
        if (!employeeMap[invoice.employeeName]) {
          employeeMap[invoice.employeeName] = {
            employeeName: invoice.employeeName,
            employeeCategory: invoice.employeeCategory,
            totalItems: 0,
            totalRevenue: 0,
            totalOrders: 0,
            items: []
          };
        }

        employeeMap[invoice.employeeName].totalOrders += 1;
        employeeMap[invoice.employeeName].totalRevenue += invoice.grandTotalAmount || 0;

        (invoice.products || []).forEach(product => {
          const item = {
            itemName: product.productName,
            category: product.productCategory,
            color: product.productColor,
            quantity: product.productQuantity || 0,
            salePrice: product.productSalePrice,
            totalAmount: product.productTotalAmount,
            invoiceId: invoice.invoiceId,
            employeeName: invoice.employeeName,
            employeeCategory: invoice.employeeCategory,
            customerName: invoice.customerName,
            saleDate: invoice.createdAt || invoice.timestamps?.createdAt
          };

          processedItems.push(item);
          employeeMap[invoice.employeeName].items.push(item);
          employeeMap[invoice.employeeName].totalItems += (product.productQuantity || 0);
        });
      });

      setItemsData(processedItems);
      setAllFilteredItems(processedItems);

      // ✅ Load only first 10
      const firstBatch = processedItems.slice(0, PAGE_SIZE);
      setFilteredItems(firstBatch);
      setHasMore(processedItems.length > PAGE_SIZE);

      // Set first employee as selected
      const employeeKeys = Object.keys(employeeMap);
      if (employeeKeys.length > 0) {
        const firstEmployee = employeeMap[employeeKeys[0]];
        setSelectedEmployee(firstEmployee);
        setEmployeeSummary(employeeMap);
      }

      setSuccess('Data loaded successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      let errorMessage = 'Failed to load items data.';
      if (error.response) {
        errorMessage = error.response.data?.message || `Server error (${error.response.status})`;
      } else if (error.request) {
        errorMessage = 'Cannot connect to server.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Load next 10 items (used by infinite scroll)
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    const nextPage = pageRef.current + 1;
    const startIdx = nextPage * PAGE_SIZE;
    const endIdx = startIdx + PAGE_SIZE;

    setTimeout(() => {
      const nextBatch = allFilteredItems.slice(startIdx, endIdx);
      setFilteredItems(prev => [...prev, ...nextBatch]);
      pageRef.current = nextPage;
      setHasMore(endIdx < allFilteredItems.length);
      setLoadingMore(false);
    }, 250);
  }, [loadingMore, hasMore, allFilteredItems]);

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

  // ✅ Filter with PKT date comparison
  const applyFilters = () => {
    let filtered = [...itemsData];

    if (filters.itemName) {
      filtered = filtered.filter(item =>
        item.itemName.toLowerCase().includes(filters.itemName.toLowerCase())
      );
    }

    if (filters.category) {
      filtered = filtered.filter(item =>
        item.category.toLowerCase().includes(filters.category.toLowerCase())
      );
    }

    if (filters.color) {
      filtered = filtered.filter(item =>
        item.color.toLowerCase().includes(filters.color.toLowerCase())
      );
    }

    if (filters.employeeName) {
      filtered = filtered.filter(item =>
        item.employeeName.toLowerCase().includes(filters.employeeName.toLowerCase())
      );
    }

    // ✅ Specific Date (PKT based)
    if (filters.date) {
      filtered = filtered.filter(item => {
        if (!item.saleDate) return false;
        return getPktDateString(item.saleDate) === filters.date;
      });
    }

    // ✅ Start Date (PKT based)
    if (filters.startDate) {
      const startUtc = convertPktDateToUtc(filters.startDate, false);
      const startMs = new Date(startUtc).getTime();
      filtered = filtered.filter(item => {
        if (!item.saleDate) return false;
        return new Date(item.saleDate).getTime() >= startMs;
      });
    }

    // ✅ End Date (PKT based)
    if (filters.endDate) {
      const endUtc = convertPktDateToUtc(filters.endDate, true);
      const endMs = new Date(endUtc).getTime();
      filtered = filtered.filter(item => {
        if (!item.saleDate) return false;
        return new Date(item.saleDate).getTime() <= endMs;
      });
    }

    // ✅ Reset pagination for new filter
    pageRef.current = 0;
    setAllFilteredItems(filtered);
    setFilteredItems(filtered.slice(0, PAGE_SIZE));
    setHasMore(filtered.length > PAGE_SIZE);

    setSuccess('Filters applied successfully');
    setTimeout(() => setSuccess(null), 3000);
  };

  const clearFilters = () => {
    setFilters({
      itemName: '',
      category: '',
      color: '',
      date: '',
      startDate: '',
      endDate: '',
      employeeName: ''
    });

    // ✅ Reset pagination
    pageRef.current = 0;
    setAllFilteredItems(itemsData);
    setFilteredItems(itemsData.slice(0, PAGE_SIZE));
    setHasMore(itemsData.length > PAGE_SIZE);

    setSuccess('Filters cleared');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const selectEmployee = (employeeName) => {
    if (employeeSummary && employeeSummary[employeeName]) {
      setSelectedEmployee(employeeSummary[employeeName]);
      setFilters(prev => ({ ...prev, employeeName: employeeName }));
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatNumber = (number) => {
    return new Intl.NumberFormat('en-US').format(number || 0);
  };

  const formatDate = (dateString) => {
    return formatPakistanTime(dateString);
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  // ✅ Totals from ALL filtered (not just visible)
  const totalItemsSold = allFilteredItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const totalRevenue = allFilteredItems.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
  const uniqueInvoiceCount = new Set(allFilteredItems.map(item => item.invoiceId)).size;

  // Get unique filter options
  const uniqueCategories = [...new Set(itemsData.map(item => item.category))];
  const uniqueColors = [...new Set(itemsData.map(item => item.color))];
  const uniqueEmployeeNames = [...new Set(itemsData.map(item => item.employeeName))];

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 py-3 sm:py-4 md:py-5 px-2 sm:px-3 md:px-4 lg:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-5">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">EMPLOYEE ITEMS SOLD DETAILS</h1>
          <p className="text-xs text-gray-600">Detailed breakdown of items sold by each employee</p>
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

        {/* Filters */}
        <div className="mb-4 bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-linear-to-r from-purple-600 to-indigo-600 px-3 sm:px-4 py-2">
            <h2 className="text-xs sm:text-sm font-semibold text-white">Filters</h2>
          </div>
          <div className="p-2 sm:p-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Item Name</label>
                <input
                  type="text"
                  name="itemName"
                  value={filters.itemName}
                  onChange={handleFilterChange}
                  placeholder="Search item..."
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                <select
                  name="category"
                  value={filters.category}
                  onChange={handleFilterChange}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Categories</option>
                  {uniqueCategories.map((cat, idx) => (
                    <option key={idx} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Color</label>
                <select
                  name="color"
                  value={filters.color}
                  onChange={handleFilterChange}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Colors</option>
                  {uniqueColors.map((color, idx) => (
                    <option key={idx} value={color}>{color}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Employee Name</label>
                <select
                  name="employeeName"
                  value={filters.employeeName}
                  onChange={handleFilterChange}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Employees</option>
                  {uniqueEmployeeNames.map((name, idx) => (
                    <option key={idx} value={name}>{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Specific Date</label>
                <input
                  type="date"
                  name="date"
                  value={filters.date}
                  onChange={handleFilterChange}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  value={filters.startDate}
                  onChange={handleFilterChange}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  name="endDate"
                  value={filters.endDate}
                  onChange={handleFilterChange}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={applyFilters}
                className="px-3 sm:px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs font-medium"
              >
                Apply Filters
              </button>
              <button
                onClick={clearFilters}
                className="px-3 sm:px-4 py-1.5 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 text-xs font-medium"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Total Items Sold Display */}
        <div className="mb-4 bg-linear-to-r from-blue-500 to-indigo-600 rounded-lg shadow-lg p-4 sm:p-5 ">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center sm:text-left">
              <h3 className="text-white text-sm sm:text-base font-semibold mb-1">Total Items Sold</h3>
              <div className="mt-2">
                <span className="text-3xl sm:text-4xl font-bold text-white">
                  {formatNumber(totalItemsSold)}
                </span>
                <span className="text-blue-100 text-sm sm:text-base ml-2">units</span>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-linear-to-r from-blue-600 to-cyan-600 px-3 sm:px-4 py-2 flex justify-between items-center">
            <h2 className="text-xs sm:text-sm font-semibold text-white">Items Sold Details</h2>
            <span className="text-xs text-cyan-100">
              Showing {filteredItems.length} of {allFilteredItems.length}
            </span>
          </div>

          {loading && !itemsData.length ? (
            <div className="flex justify-center items-center py-12 sm:py-16">
              <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-blue-600"></div>
            </div>
          ) : allFilteredItems.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <span className="text-2xl">📦</span>
              <p className="mt-2 text-sm text-gray-500">No items found matching your filters</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block md:hidden p-2 sm:p-3">
                <div className="space-y-3">
                  {filteredItems.map((item, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-md p-3 bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{item.itemName}</p>
                          <p className="text-xs text-gray-500">Invoice: {item.invoiceId}</p>
                        </div>
                        <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                          {item.quantity} units
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        <div><span className="text-gray-500">Category:</span> <span className="text-gray-900">{item.category}</span></div>
                        <div><span className="text-gray-500">Color:</span> <span className="text-gray-900">{item.color}</span></div>
                        <div><span className="text-gray-500">Price:</span> <span className="text-blue-600 font-medium">Rs. {formatCurrency(item.salePrice)}</span></div>
                        <div><span className="text-gray-500">Total:</span> <span className="text-green-600 font-medium">Rs. {formatCurrency(item.totalAmount)}</span></div>
                        <div className="col-span-2"><span className="text-gray-500">Employee:</span> <span className="text-gray-900">{item.employeeName}</span></div>
                        <div className="col-span-2"><span className="text-gray-500">Customer:</span> <span className="text-gray-900">{item.customerName}</span></div>
                        <div className="col-span-2"><span className="text-gray-500">Date:</span> <span className="text-gray-900">{formatDate(item.saleDate)}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="overflow-x-auto hidden md:block">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Color</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice ID</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-xs font-medium text-gray-900">{item.itemName}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">{item.category}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">
                          <span className="inline-block w-3 h-3 rounded-full border border-gray-300 mr-1"
                            style={{ backgroundColor: item.color.toLowerCase() }}></span>
                          {item.color}
                        </td>
                        <td className="px-3 py-2 text-xs text-center font-medium text-gray-900">{item.quantity}</td>
                        <td className="px-3 py-2 text-xs text-right text-blue-600 font-medium">Rs. {formatCurrency(item.salePrice)}</td>
                        <td className="px-3 py-2 text-xs text-right text-green-600 font-medium">Rs. {formatCurrency(item.totalAmount)}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">
                          <span className="font-mono">{item.invoiceId}</span>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-900">{item.employeeName}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">{formatDate(item.saleDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Summary Footer Row (uses ALL filtered totals) */}
                  <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                    <tr>
                      <td colSpan="3" className="px-3 py-2 text-xs font-bold text-gray-700 text-right">
                        TOTAL:
                      </td>
                      <td className="px-3 py-2 text-xs font-bold text-center text-blue-700">
                        {formatNumber(totalItemsSold)}
                      </td>
                      <td className="px-3 py-2 text-xs font-bold text-right text-gray-500">—</td>
                      <td className="px-3 py-2 text-xs font-bold text-right text-green-700">
                        Rs. {formatCurrency(totalRevenue)}
                      </td>
                      <td colSpan="3" className="px-3 py-2 text-xs text-gray-500">
                        {uniqueInvoiceCount} unique invoice(s)
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* ✅ Infinite Scroll Sentinel & Loaders */}
              <div ref={sentinelRef} className="h-2"></div>

              {loadingMore && (
                <div className="flex justify-center items-center py-4 bg-gray-50 border-t">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
                  <span className="text-xs text-gray-600">Loading more...</span>
                </div>
              )}

              {!hasMore && filteredItems.length > 0 && (
                <div className="text-center py-4 bg-gray-50 border-t">
                  <span className="text-xs text-gray-500">✅ All {allFilteredItems.length} items loaded</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Empty State */}
        {!loading && !itemsData.length && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden mt-4">
            <div className="text-center py-12 sm:py-16">
              <span className="text-3xl">📦</span>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No Items Found</h3>
              <p className="mt-1 text-xs text-gray-500">There are no items sold yet.</p>
              <button
                onClick={fetchAllData}
                className="mt-3 px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs font-medium"
              >
                🔄 Refresh
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeItemsSold;
