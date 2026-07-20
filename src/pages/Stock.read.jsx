// StockRead.jsx - Compact redesigned component for viewing stock inventory
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'https://bisni-ms-backend.onrender.com/api';

const StockRead = () => {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('table');

  useEffect(() => {
    fetchStocks();
  }, []);

  const fetchStocks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`${API_BASE_URL}/stock`);
      const stockData = response.data.data || response.data || [];
      
      const stocksWithStatus = stockData.map(stock => ({
        ...stock,
        calculatedStatus: getCalculatedStatus(stock.productQuantity)
      }));
      
      setStocks(stocksWithStatus);
      if (response.data.count !== undefined) {
        setSuccess(`${response.data.count} stock items loaded`);
      }
    } catch (error) {
      let errorMessage = 'Failed to load stock inventory.';
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

  const getCalculatedStatus = (quantity) => {
    const qty = parseInt(quantity) || 0;
    if (qty === 0) return 'Out of Stock';
    if (qty <= 10) return 'Low Stock';
    return 'In Stock';
  };

  const getUniqueCategories = () => {
    const categories = stocks.map(stock => stock.productCategory);
    return ['all', ...new Set(categories)].filter(Boolean);
  };

  const getFilteredStocks = () => {
    let filtered = [...stocks];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(stock =>
        stock.productName?.toLowerCase().includes(term) ||
        stock.productCategory?.toLowerCase().includes(term) ||
        stock.productColor?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(stock => stock.calculatedStatus === statusFilter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(stock => stock.productCategory === categoryFilter);
    }

    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'productName' || sortBy === 'productCategory' || sortBy === 'productColor' || sortBy === 'calculatedStatus') {
        aValue = (aValue || '').toLowerCase();
        bValue = (bValue || '').toLowerCase();
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      
      return sortOrder === 'asc' ? ((aValue || 0) - (bValue || 0)) : ((bValue || 0) - (aValue || 0));
    });

    return filtered;
  };

  const filteredStocks = getFilteredStocks();

  const getStatistics = () => {
    const allStocks = stocks;
    const totalItems = allStocks.length;
    const totalQuantity = allStocks.reduce((sum, s) => sum + (parseInt(s.productQuantity) || 0), 0);
    const totalValue = allStocks.reduce((sum, s) => sum + ((parseFloat(s.productPurchasePrice) || 0) * (parseInt(s.productQuantity) || 0)), 0);
    const inStockCount = allStocks.filter(s => getCalculatedStatus(s.productQuantity) === 'In Stock').length;
    const lowStockCount = allStocks.filter(s => getCalculatedStatus(s.productQuantity) === 'Low Stock').length;
    const outOfStockCount = allStocks.filter(s => getCalculatedStatus(s.productQuantity) === 'Out of Stock').length;

    return { totalItems, totalQuantity, totalValue, inStockCount, lowStockCount, outOfStockCount };
  };

  const stats = getStatistics();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'In Stock': return { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' };
      case 'Low Stock': return { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500' };
      case 'Out of Stock': return { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-800', dot: 'bg-gray-500' };
    }
  };

  const getQuantityBadge = (quantity) => {
    const qty = parseInt(quantity) || 0;
    if (qty > 10) return 'bg-blue-100 text-blue-800';
    if (qty > 0) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const clearMessages = () => { setError(null); setSuccess(null); };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 py-3 sm:py-4 md:py-5 px-2 sm:px-3 md:px-4 lg:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-5">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">STOCK INVENTORY</h1>
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
        {!loading && stocks.length > 0 && (
          <div className="grid grid-cols-2 xs:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5 mb-3 sm:mb-4">
            <div className="bg-white rounded-lg shadow-md p-2 sm:p-2.5 border-l-4 border-blue-500">
              <p className="text-2xs xs:text-xs font-medium text-gray-600">Total Items</p>
              <p className="text-base sm:text-lg font-bold text-gray-900">{stats.totalItems}</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-2 sm:p-2.5 border-l-4 border-cyan-500">
              <p className="text-2xs xs:text-xs font-medium text-gray-600">Total Quantity</p>
              <p className="text-base sm:text-lg font-bold text-gray-900">{stats.totalQuantity}</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-2 sm:p-2.5 border-l-4 border-purple-500">
              <p className="text-2xs xs:text-xs font-medium text-gray-600">Inventory Value</p>
              <p className="text-base sm:text-lg font-bold text-gray-900 truncate">{formatCurrency(stats.totalValue)}</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-2 sm:p-2.5 border-l-4 border-green-500">
              <p className="text-2xs xs:text-xs font-medium text-gray-600">In Stock</p>
              <p className="text-base sm:text-lg font-bold text-green-600">{stats.inStockCount}</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-2 sm:p-2.5 border-l-4 border-yellow-500">
              <p className="text-2xs xs:text-xs font-medium text-gray-600">Low Stock</p>
              <p className="text-base sm:text-lg font-bold text-yellow-600">{stats.lowStockCount}</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-2 sm:p-2.5 border-l-4 border-red-500">
              <p className="text-2xs xs:text-xs font-medium text-gray-600">Out of Stock</p>
              <p className="text-base sm:text-lg font-bold text-red-600">{stats.outOfStockCount}</p>
            </div>
          </div>
        )}

        {/* Filters and Controls */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-3 sm:mb-4">
          <div className="bg-linear-to-r from-blue-600 to-cyan-600 px-3 sm:px-4 py-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <h2 className="text-xs sm:text-sm font-semibold text-white">
              Stock List {filteredStocks.length > 0 && `(${filteredStocks.length})`}
            </h2>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button onClick={fetchStocks}
                className="flex-1 sm:flex-none px-2.5 py-1 bg-white text-blue-600 rounded-md hover:bg-gray-100 text-xs font-medium">
                🔄 Refresh
              </button>
              <button onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
                className="flex-1 sm:flex-none px-2.5 py-1 bg-white text-blue-600 rounded-md hover:bg-gray-100 text-xs font-medium">
                {viewMode === 'table' ? '📋 Cards' : '📊 Table'}
              </button>
            </div>
          </div>

          <div className="p-2 sm:p-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <div className="relative">
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-8 pr-2 sm:pr-2.5 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 text-xs" />
                <svg className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 text-xs w-full">
                <option value="all">All Status</option>
                <option value="In Stock">🟢 In Stock</option>
                <option value="Low Stock">🟡 Low Stock</option>
                <option value="Out of Stock">🔴 Out of Stock</option>
              </select>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 text-xs w-full">
                <option value="all">All Categories</option>
                {getUniqueCategories().filter(c => c !== 'all').map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <div className="flex gap-1.5">
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                  className="flex-1 px-2 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 text-xs">
                  <option value="createdAt">Date</option>
                  <option value="productName">Name</option>
                  <option value="productCategory">Category</option>
                  <option value="productQuantity">Qty</option>
                  <option value="productPurchasePrice">Price</option>
                  <option value="calculatedStatus">Status</option>
                </select>
                <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-2 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 text-xs">
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="flex justify-center items-center py-10 sm:py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && stocks.length === 0 && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="text-center py-10 sm:py-12">
              <span className="text-3xl">📦</span>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No Stock Items Found</h3>
              <p className="mt-1 text-xs text-gray-500">The inventory is currently empty.</p>
            </div>
          </div>
        )}

        {/* Table View */}
        {!loading && stocks.length > 0 && viewMode === 'table' && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Mobile Card View (Table Mode) */}
            <div className="block lg:hidden">
              {filteredStocks.length === 0 ? (
                <div className="text-center py-8">
                  <span className="text-xl">🔍</span>
                  <p className="mt-1 text-xs text-gray-500">No stock items match your filters</p>
                  <button onClick={() => { setSearchTerm(''); setStatusFilter('all'); setCategoryFilter('all'); }}
                    className="mt-1 text-xs text-blue-600 hover:text-blue-800">Clear filters</button>
                </div>
              ) : (
                filteredStocks.map((stock) => {
                  const calculatedStatus = getCalculatedStatus(stock.productQuantity);
                  const statusColor = getStatusColor(calculatedStatus);
                  const totalValue = (parseFloat(stock.productPurchasePrice) || 0) * (parseInt(stock.productQuantity) || 0);
                  
                  return (
                    <div key={stock._id} className="border-b border-gray-200 p-3 hover:bg-gray-50 transition duration-150">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="shrink-0 h-7 w-7 bg-linear-to-r from-blue-500 to-cyan-500 rounded flex items-center justify-center">
                            <span className="text-white font-bold text-xs">
                              {stock.productName?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-gray-900 truncate">{stock.productName}</div>
                            <div className="text-xs text-gray-500">{stock.productCategory} • {stock.productColor}</div>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium shrink-0 ml-2 ${statusColor.bg} ${statusColor.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1 ${statusColor.dot}`}></span>
                          {calculatedStatus}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs ml-9">
                        <div>
                          <span className="text-gray-500">Price:</span>
                          <span className="font-medium ml-1">Rs. {formatCurrency(stock.productPurchasePrice)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Qty:</span>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ml-1 ${getQuantityBadge(stock.productQuantity)}`}>
                            {stock.productQuantity}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-gray-500">Value:</span>
                          <span className="font-bold text-green-600 ml-1">Rs. {formatCurrency(totalValue)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table View */}
            <div className="overflow-x-auto hidden lg:block">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Category</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Color</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Value</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStocks.map((stock) => {
                    const calculatedStatus = getCalculatedStatus(stock.productQuantity);
                    const statusColor = getStatusColor(calculatedStatus);
                    const totalValue = (parseFloat(stock.productPurchasePrice) || 0) * (parseInt(stock.productQuantity) || 0);
                    
                    return (
                      <tr key={stock._id} className="hover:bg-gray-50 transition duration-150">
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="shrink-0 h-7 w-7 bg-linear-to-r from-blue-500 to-cyan-500 rounded flex items-center justify-center">
                              <span className="text-white font-bold text-xs">
                                {stock.productName?.charAt(0)?.toUpperCase() || '?'}
                              </span>
                            </div>
                            <span className="ml-2 text-xs font-medium text-gray-900">{stock.productName}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500 hidden md:table-cell">{stock.productCategory}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500 hidden lg:table-cell">
                          <span className="inline-flex items-center">
                            <span className="w-2 h-2 rounded-full mr-1.5 border border-gray-300"
                              style={{ backgroundColor: stock.productColor?.toLowerCase() }}></span>
                            {stock.productColor}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-right text-xs font-medium text-gray-900">
                          Rs. {formatCurrency(stock.productPurchasePrice)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${getQuantityBadge(stock.productQuantity)}`}>
                            {stock.productQuantity}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${statusColor.bg} ${statusColor.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1 ${statusColor.dot}`}></span>
                            {calculatedStatus}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-right text-xs font-bold text-green-600">
                          Rs. {formatCurrency(totalValue)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredStocks.length === 0 && (
              <div className="text-center py-8 hidden lg:block">
                <span className="text-xl">🔍</span>
                <p className="mt-1 text-xs text-gray-500">No stock items match your filters</p>
                <button onClick={() => { setSearchTerm(''); setStatusFilter('all'); setCategoryFilter('all'); }}
                  className="mt-1 text-xs text-blue-600 hover:text-blue-800">Clear filters</button>
              </div>
            )}
          </div>
        )}

        {/* Cards View */}
        {!loading && stocks.length > 0 && viewMode === 'cards' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredStocks.map((stock) => {
              const calculatedStatus = getCalculatedStatus(stock.productQuantity);
              const statusColor = getStatusColor(calculatedStatus);
              const totalValue = (parseFloat(stock.productPurchasePrice) || 0) * (parseInt(stock.productQuantity) || 0);
              
              return (
                <div key={stock._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition duration-200">
                  <div className="bg-linear-to-r from-blue-600 to-cyan-600 px-3 sm:px-4 py-2 sm:py-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 sm:gap-2.5 flex-1 min-w-0">
                        <div className="shrink-0 h-9 w-9 bg-white bg-opacity-20 rounded flex items-center justify-center border-2 border-white">
                          <span className="text-white font-bold text-sm">
                            {stock.productName?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-white truncate">{stock.productName}</h3>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${statusColor.bg} ${statusColor.text}`}>
                            <span className={`w-1 h-1 rounded-full mr-1 ${statusColor.dot}`}></span>
                            {calculatedStatus}
                          </span>
                        </div>
                      </div>
                      <span className="w-3 h-3 rounded-full border-2 border-white shrink-0 ml-2"
                        style={{ backgroundColor: stock.productColor?.toLowerCase() }} title={stock.productColor}></span>
                    </div>
                  </div>

                  <div className="p-2 sm:p-3">
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div>
                        <p className="text-2xs xs:text-xs text-gray-500">Category</p>
                        <p className="text-xs font-medium text-gray-900 truncate">{stock.productCategory}</p>
                      </div>
                      <div>
                        <p className="text-2xs xs:text-xs text-gray-500">Color</p>
                        <p className="text-xs font-medium text-gray-900 truncate">{stock.productColor}</p>
                      </div>
                      <div>
                        <p className="text-2xs xs:text-xs text-gray-500">Price</p>
                        <p className="text-xs font-medium text-gray-900">Rs. {formatCurrency(stock.productPurchasePrice)}</p>
                      </div>
                      <div>
                        <p className="text-2xs xs:text-xs text-gray-500">Quantity</p>
                        <p className={`text-xs font-bold ${
                          (parseInt(stock.productQuantity) || 0) > 10 ? 'text-green-600' :
                          (parseInt(stock.productQuantity) || 0) > 0 ? 'text-yellow-600' : 'text-red-600'
                        }`}>{stock.productQuantity}</p>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded p-2 sm:p-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">Total Value</span>
                        <span className="text-sm font-bold text-green-600">Rs. {formatCurrency(totalValue)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredStocks.length === 0 && (
              <div className="col-span-full bg-white rounded-lg shadow-md p-8 text-center">
                <span className="text-xl">🔍</span>
                <p className="mt-1 text-xs text-gray-500">No stock items match your filters</p>
                <button onClick={() => { setSearchTerm(''); setStatusFilter('all'); setCategoryFilter('all'); }}
                  className="mt-1 text-xs text-blue-600 hover:text-blue-800">Clear filters</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Custom CSS for extra small screens */}
      <style jsx='true'>{`
        @media (min-width: 480px) {
          .xs\\:grid-cols-3 {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
          .xs\\:text-xs {
            font-size: 0.75rem;
          }
        }
        .text-2xs {
          font-size: 0.65rem;
        }
      `}</style>
    </div>
  );
};

export default StockRead;