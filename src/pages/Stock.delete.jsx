// StockDelete.jsx - Compact redesigned component for deleting stock items
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'https://bisni-ms-backend.onrender.com/api';

const StockDelete = () => {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [selectedStocks, setSelectedStocks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectAll, setSelectAll] = useState(false);

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

    return filtered;
  };

  const filteredStocks = getFilteredStocks();

  const toggleStockSelection = (stockId) => {
    setSelectedStocks(prev => 
      prev.includes(stockId) ? prev.filter(id => id !== stockId) : [...prev, stockId]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedStocks([]);
    } else {
      setSelectedStocks(filteredStocks.map(stock => stock._id));
    }
    setSelectAll(!selectAll);
  };

  useEffect(() => {
    if (filteredStocks.length > 0 && selectedStocks.length === filteredStocks.length) {
      setSelectAll(true);
    } else {
      setSelectAll(false);
    }
  }, [selectedStocks, filteredStocks]);

  const handleDeleteSingle = (stock) => {
    setDeleteConfirm({ type: 'single', stock });
  };

  const handleDeleteSelected = () => {
    if (selectedStocks.length === 0) {
      setError('Please select at least one stock item to delete');
      return;
    }
    const selectedItems = stocks.filter(stock => selectedStocks.includes(stock._id));
    setDeleteConfirm({ type: 'bulk', stocks: selectedItems, count: selectedStocks.length });
  };

  const executeDelete = async () => {
    if (!deleteConfirm) return;

    setDeleteLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (deleteConfirm.type === 'single') {
        const stockId = deleteConfirm.stock._id;
        await axios.delete(`${API_BASE_URL}/stock/${stockId}`);
        setSuccess(`"${deleteConfirm.stock.productName}" deleted successfully!`);
        setStocks(prev => prev.filter(stock => stock._id !== stockId));
        setSelectedStocks(prev => prev.filter(id => id !== stockId));
      } else if (deleteConfirm.type === 'bulk') {
        let deletedCount = 0;
        let failedCount = 0;
        const failedItems = [];
        
        for (const stock of deleteConfirm.stocks) {
          try {
            await axios.delete(`${API_BASE_URL}/stock/${stock._id}`);
            deletedCount++;
          } catch (error) {
            failedCount++;
            failedItems.push(stock.productName);
          }
        }
        
        const deletedIds = deleteConfirm.stocks.map(s => s._id);
        setStocks(prev => prev.filter(stock => !deletedIds.includes(stock._id)));
        setSelectedStocks([]);
        
        if (failedCount === 0) {
          setSuccess(`Successfully deleted ${deletedCount} stock item(s)!`);
        } else {
          setSuccess(`Deleted ${deletedCount} item(s). Failed: ${failedCount} (${failedItems.join(', ')})`);
        }
      }
    } catch (error) {
      let errorMessage = 'Failed to delete stock item(s).';
      if (error.response) {
        if (error.response.status === 404) errorMessage = 'Stock item not found.';
        else errorMessage = error.response.data?.message || `Server error (${error.response.status})`;
      } else if (error.request) {
        errorMessage = 'Cannot connect to server.';
      }
      setError(errorMessage);
    } finally {
      setDeleteLoading(false);
      setDeleteConfirm(null);
    }
  };

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

  const getQtyBadge = (quantity) => {
    const qty = parseInt(quantity) || 0;
    if (qty > 10) return 'bg-blue-100 text-blue-800';
    if (qty > 0) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const clearMessages = () => { setError(null); setSuccess(null); };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 py-3 sm:py-4 md:py-5 px-2 sm:px-3 md:px-4 lg:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-5">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">DELETE STOCK</h1>
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

        {/* Filters and Controls */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-3 sm:mb-4">
          <div className="bg-linear-to-r from-red-600 to-red-700 px-3 sm:px-4 py-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <h2 className="text-xs sm:text-sm font-semibold text-white">
              Stock Inventory ({filteredStocks.length})
            </h2>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button onClick={fetchStocks}
                className="flex-1 sm:flex-none px-2.5 py-1 bg-white text-red-600 rounded-md hover:bg-gray-100 text-xs font-medium">
                🔄 Refresh
              </button>
              {selectedStocks.length > 0 && (
                <button onClick={handleDeleteSelected}
                  className="flex-1 sm:flex-none px-2.5 py-1 bg-white text-red-600 rounded-md hover:bg-red-50 border border-red-300 text-xs font-medium">
                  🗑️ Delete ({selectedStocks.length})
                </button>
              )}
            </div>
          </div>

          <div className="p-2 sm:p-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              <div className="relative">
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, category, color..."
                  className="w-full pl-8 pr-2 sm:pr-2.5 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-red-500 text-xs" />
                <svg className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-red-500 text-xs w-full">
                <option value="all">All Status</option>
                <option value="In Stock">🟢 In Stock</option>
                <option value="Low Stock">🟡 Low Stock</option>
                <option value="Out of Stock">🔴 Out of Stock</option>
              </select>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-red-500 text-xs w-full sm:col-span-2 lg:col-span-1">
                <option value="all">All Categories</option>
                {getUniqueCategories().filter(c => c !== 'all').map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="flex justify-center items-center py-10 sm:py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
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

        {/* Stock Table/List */}
        {!loading && stocks.length > 0 && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Mobile Card View */}
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
                  const displayStatus = stock.calculatedStatus || getCalculatedStatus(stock.productQuantity);
                  const statusColor = getStatusColor(displayStatus);
                  const totalValue = (parseFloat(stock.productPurchasePrice) || 0) * (parseInt(stock.productQuantity) || 0);
                  const isSelected = selectedStocks.includes(stock._id);
                  
                  return (
                    <div key={stock._id} className={`border-b border-gray-200 p-3 transition duration-150 ${isSelected ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <input type="checkbox" checked={isSelected} onChange={() => toggleStockSelection(stock._id)}
                            className="h-3.5 w-3.5 text-red-600 focus:ring-red-500 border-gray-300 rounded shrink-0" />
                          <div className={`shrink-0 h-7 w-7 rounded flex items-center justify-center ${
                            isSelected ? 'bg-linear-to-r from-red-500 to-red-600' : 'bg-linear-to-r from-gray-400 to-gray-500'
                          }`}>
                            <span className="text-white font-bold text-xs">{stock.productName?.charAt(0)?.toUpperCase() || '?'}</span>
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-gray-900 truncate">{stock.productName}</div>
                            <div className="text-xs text-gray-500">{stock.productCategory} • {stock.productColor}</div>
                          </div>
                        </div>
                        <button onClick={() => handleDeleteSingle(stock)}
                          className="shrink-0 ml-2 px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 text-xs font-medium">
                          🗑️
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs ml-9">
                        <div>
                          <span className="text-gray-500">Price:</span>
                          <span className="font-medium ml-1">Rs. {formatCurrency(stock.productPurchasePrice)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Qty:</span>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ml-1 ${getQtyBadge(stock.productQuantity)}`}>
                            {stock.productQuantity}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-gray-500">Value:</span>
                          <span className="font-bold text-green-600 ml-1">Rs. {formatCurrency(totalValue)}</span>
                        </div>
                      </div>
                      <div className="mt-1.5 ml-9">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${statusColor.bg} ${statusColor.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1 ${statusColor.dot}`}></span>
                          {displayStatus}
                        </span>
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
                    <th className="px-2.5 py-2 text-center w-10">
                      <input type="checkbox" checked={selectAll} onChange={handleSelectAll}
                        className="h-3.5 w-3.5 text-red-600 focus:ring-red-500 border-gray-300 rounded" />
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Category</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Color</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Value</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-16">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStocks.map((stock) => {
                    const displayStatus = stock.calculatedStatus || getCalculatedStatus(stock.productQuantity);
                    const statusColor = getStatusColor(displayStatus);
                    const totalValue = (parseFloat(stock.productPurchasePrice) || 0) * (parseInt(stock.productQuantity) || 0);
                    const isSelected = selectedStocks.includes(stock._id);
                    
                    return (
                      <tr key={stock._id} 
                        className={`hover:bg-gray-50 transition duration-150 ${isSelected ? 'bg-red-50' : ''}`}>
                        <td className="px-2.5 py-2 text-center">
                          <input type="checkbox" checked={isSelected} onChange={() => toggleStockSelection(stock._id)}
                            className="h-3.5 w-3.5 text-red-600 focus:ring-red-500 border-gray-300 rounded" />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`shrink-0 h-7 w-7 rounded flex items-center justify-center ${
                              isSelected ? 'bg-linear-to-r from-red-500 to-red-600' : 'bg-linear-to-r from-gray-400 to-gray-500'
                            }`}>
                              <span className="text-white font-bold text-xs">{stock.productName?.charAt(0)?.toUpperCase() || '?'}</span>
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
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${getQtyBadge(stock.productQuantity)}`}>
                            {stock.productQuantity}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${statusColor.bg} ${statusColor.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1 ${statusColor.dot}`}></span>
                            {displayStatus}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-right text-xs font-bold text-green-600 hidden lg:table-cell">
                          Rs. {formatCurrency(totalValue)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-center">
                          <button onClick={() => handleDeleteSingle(stock)}
                            className="inline-flex items-center px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 text-xs font-medium">
                            <svg className="w-3.5 h-3.5 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Del
                          </button>
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

            {/* Selection Summary */}
            {selectedStocks.length > 0 && (
              <div className="bg-red-50 border-t border-red-200 px-3 py-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div className="text-xs">
                  <span className="font-medium text-red-700">⚠️ {selectedStocks.length} selected</span>
                  <span className="text-red-600 ml-2">
                    (Value: Rs. {formatCurrency(
                      stocks.filter(s => selectedStocks.includes(s._id))
                        .reduce((sum, s) => sum + ((s.productPurchasePrice || 0) * (s.productQuantity || 0)), 0)
                    )})
                  </span>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button onClick={() => setSelectedStocks([])}
                    className="flex-1 sm:flex-none px-2.5 py-1 bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50 text-xs font-medium">
                    Clear
                  </button>
                  <button onClick={handleDeleteSelected} disabled={deleteLoading}
                    className="flex-1 sm:flex-none px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs font-medium disabled:opacity-50">
                    🗑️ Delete ({selectedStocks.length})
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-3">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-[85vh] overflow-y-auto">
              <div className="p-3 sm:p-4">
                <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 mx-auto bg-red-100 rounded-full">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                
                <h3 className="mt-2 sm:mt-3 text-sm sm:text-base font-bold text-gray-900 text-center">Confirm Deletion</h3>
                
                {deleteConfirm.type === 'single' ? (
                  <div className="mt-2 sm:mt-3">
                    <p className="text-xs text-gray-600 text-center">Are you sure you want to delete this item?</p>
                    <div className="mt-3 p-2 sm:p-3 bg-gray-50 rounded-md">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="shrink-0 h-10 w-10 bg-linear-to-r from-red-500 to-red-600 rounded flex items-center justify-center">
                          <span className="text-white font-bold text-sm">{deleteConfirm.stock.productName?.charAt(0)?.toUpperCase() || '?'}</span>
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-gray-900 truncate">{deleteConfirm.stock.productName}</h4>
                          <p className="text-xs text-gray-500">{deleteConfirm.stock.productCategory} • {deleteConfirm.stock.productColor}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div>
                          <p className="text-gray-500">Price</p>
                          <p className="font-bold">Rs. {formatCurrency(deleteConfirm.stock.productPurchasePrice)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Qty</p>
                          <p className="font-bold">{deleteConfirm.stock.productQuantity}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Value</p>
                          <p className="font-bold text-red-600">Rs. {formatCurrency((deleteConfirm.stock.productPurchasePrice || 0) * (deleteConfirm.stock.productQuantity || 0))}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 sm:mt-3">
                    <p className="text-xs text-gray-600 text-center">
                      You are about to delete <span className="font-bold text-red-600">{deleteConfirm.count} item(s)</span>.
                    </p>
                    <div className="mt-3 max-h-36 overflow-y-auto space-y-1.5">
                      {deleteConfirm.stocks.map((stock, index) => (
                        <div key={stock._id} className="flex flex-col xs:flex-row justify-between xs:items-center gap-1 p-2 bg-gray-50 rounded text-xs">
                          <span className="font-medium truncate">{stock.productName}</span>
                          <span className="text-gray-500 shrink-0">{stock.productCategory} • Qty: {stock.productQuantity}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 p-2 sm:p-2.5 bg-red-50 rounded-md text-xs">
                      <div className="flex justify-between">
                        <span className="text-red-800">Total Items:</span>
                        <span className="font-bold">{deleteConfirm.count}</span>
                      </div>
                      <div className="flex justify-between mt-0.5">
                        <span className="text-red-800">Total Value:</span>
                        <span className="font-bold">Rs. {formatCurrency(deleteConfirm.stocks.reduce((sum, s) => sum + ((s.productPurchasePrice || 0) * (s.productQuantity || 0)), 0))}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-xs text-red-800">⚠️ This action cannot be undone.</p>
                </div>
              </div>
              
              <div className="bg-gray-50 px-3 sm:px-4 py-2 sm:py-2.5 rounded-b-lg flex flex-col xs:flex-row justify-end gap-2">
                <button onClick={() => setDeleteConfirm(null)} disabled={deleteLoading}
                  className="w-full xs:w-auto px-3 py-1.5 bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50 text-xs font-medium disabled:opacity-50 order-2 xs:order-1">
                  Cancel
                </button>
                <button onClick={executeDelete} disabled={deleteLoading}
                  className="w-full xs:w-auto px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 text-xs font-medium disabled:opacity-50 order-1 xs:order-2">
                  {deleteLoading ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Custom CSS for extra small screens */}
      <style jsx='true'>{`
        @media (min-width: 480px) {
          .xs\\:flex-row {
            flex-direction: row;
          }
          .xs\\:w-auto {
            width: auto;
          }
          .xs\\:items-center {
            align-items: center;
          }
          .xs\\:order-1 {
            order: 1;
          }
          .xs\\:order-2 {
            order: 2;
          }
        }
        .text-2xs {
          font-size: 0.65rem;
        }
      `}</style>
    </div>
  );
};

export default StockDelete;