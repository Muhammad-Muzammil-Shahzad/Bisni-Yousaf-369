// StockUpdate.jsx - Redesigned with products as main groups containing categories
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'https://bisni-ms-backend.onrender.com/api';

const StockUpdate = () => {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedStock, setSelectedStock] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [productFilter, setProductFilter] = useState('all');
  
  const [formData, setFormData] = useState({
    productName: '',
    productCategory: '',
    productColor: '',
    productPurchasePrice: '',
    productQuantity: ''
  });

  useEffect(() => {
    fetchStocks();
  }, []);

  const fetchStocks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE_URL}/stock`);
      const stockData = response.data.data || response.data || [];
      setStocks(stockData);
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

  // Group stocks by product name (product contains categories)
  const getStocksByProduct = () => {
    const grouped = {};
    stocks.forEach(stock => {
      const productName = stock.productName || 'Uncategorized';
      if (!grouped[productName]) grouped[productName] = [];
      grouped[productName].push(stock);
    });
    return grouped;
  };

  const getUniqueProducts = () => {
    return Object.keys(getStocksByProduct()).sort();
  };

  // Filter stocks
  const getFilteredGroupedStocks = () => {
    let grouped = getStocksByProduct();
    
    if (productFilter !== 'all') {
      grouped = { [productFilter]: grouped[productFilter] || [] };
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const filtered = {};
      Object.entries(grouped).forEach(([productName, items]) => {
        const matching = items.filter(stock =>
          stock.productCategory?.toLowerCase().includes(term) ||
          stock.productColor?.toLowerCase().includes(term)
        );
        if (matching.length > 0) filtered[productName] = matching;
      });
      return filtered;
    }

    return grouped;
  };

  const filteredGroupedStocks = getFilteredGroupedStocks();

  const handleSelectStock = (stock) => {
    setSelectedStock(stock);
    setFormData({
      productName: stock.productName || '',
      productCategory: stock.productCategory || '',
      productColor: stock.productColor || '',
      productPurchasePrice: stock.productPurchasePrice?.toString() || '',
      productQuantity: stock.productQuantity?.toString() || ''
    });
    setError(null);
    setSuccess(null);
    
    setTimeout(() => {
      document.getElementById('updateForm')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const hasChanges = () => {
    if (!selectedStock) return false;
    return (
      formData.productName !== selectedStock.productName ||
      formData.productCategory !== selectedStock.productCategory ||
      formData.productColor !== selectedStock.productColor ||
      parseFloat(formData.productPurchasePrice) !== selectedStock.productPurchasePrice ||
      parseInt(formData.productQuantity) !== selectedStock.productQuantity
    );
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStock) { setError('Please select a stock item'); return; }

    if (!formData.productName?.trim()) { setError('Product name is required'); return; }
    if (!formData.productCategory?.trim()) { setError('Category is required'); return; }
    if (!formData.productColor?.trim()) { setError('Color is required'); return; }
    
    const price = parseFloat(formData.productPurchasePrice);
    if (isNaN(price) || price < 0) { setError('Valid price required'); return; }
    
    const quantity = parseInt(formData.productQuantity);
    if (isNaN(quantity) || quantity < 0) { setError('Valid quantity required'); return; }

    setUpdateLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const updateData = {
        productName: formData.productName.trim(),
        productCategory: formData.productCategory.trim(),
        productColor: formData.productColor.trim(),
        productPurchasePrice: price,
        productQuantity: quantity
      };

      const response = await axios.put(`${API_BASE_URL}/stock/${selectedStock._id}`, updateData);
      setSuccess(`"${response.data.data.productName}" updated successfully!`);
      
      setStocks(prev => prev.map(stock => stock._id === selectedStock._id ? response.data.data : stock));
      setSelectedStock(response.data.data);
    } catch (error) {
      let errorMessage = 'Failed to update stock item.';
      if (error.response) {
        if (error.response.status === 404) errorMessage = 'Stock item not found.';
        else errorMessage = error.response.data?.message || `Server error (${error.response.status})`;
      } else if (error.request) {
        errorMessage = 'Cannot connect to server.';
      }
      setError(errorMessage);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleCancelUpdate = () => {
    setSelectedStock(null);
    setFormData({ productName: '', productCategory: '', productColor: '', productPurchasePrice: '', productQuantity: '' });
    setError(null); setSuccess(null);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const clearMessages = () => { setError(null); setSuccess(null); };

  const totalFilteredItems = Object.values(filteredGroupedStocks).reduce((sum, items) => sum + items.length, 0);

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 py-3 sm:py-4 md:py-5 px-2 sm:px-3 md:px-4 lg:px-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-5">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">UPDATE STOCK</h1>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="mb-3 bg-red-50 border-l-4 border-red-500 p-2 sm:p-2.5 rounded-r-lg text-xs">
            <div className="flex items-start">
              <span className="mr-2 shrink-0">❌</span>
              <p className="text-red-700 flex-1 whitespace-pre-line wrap-break">{error}</p>
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

        {/* Stock Selection Panel */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-3 sm:mb-4">
          <div className="bg-linear-to-r from-blue-600 to-cyan-600 px-3 sm:px-4 py-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <h2 className="text-xs sm:text-sm font-semibold text-white">Select Stock ({totalFilteredItems})</h2>
            <button onClick={fetchStocks}
              className="w-full sm:w-auto px-2.5 py-1 bg-white text-blue-600 rounded-md hover:bg-gray-100 text-xs font-medium">
              🔄 Refresh
            </button>
          </div>

          <div className="p-2 sm:p-2.5">
            {/* Search and Filter */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2 sm:mb-2.5">
              <div className="relative">
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by category or color..."
                  className="w-full pl-8 pr-2 sm:pr-2.5 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 text-xs" />
                <svg className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 text-xs w-full">
                <option value="all">All Products</option>
                {getUniqueProducts().map(product => (
                  <option key={product} value={product}>{product}</option>
                ))}
              </select>
            </div>

            {/* Product-grouped Stock List */}
            {loading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : Object.keys(filteredGroupedStocks).length === 0 ? (
              <div className="text-center py-4">
                <span className="text-lg">📦</span>
                <p className="text-xs text-gray-500">No stocks found</p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-3">
                {Object.entries(filteredGroupedStocks).map(([productName, items]) => (
                  <div key={productName}>
                    {/* Product Header */}
                    <h3 className="text-xs font-semibold text-gray-700 px-1 mb-1.5 flex items-center">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 mr-1.5 shrink-0"></span>
                      <span className="truncate">{productName}</span>
                      <span className="ml-2 text-gray-400 font-normal shrink-0">({items.length} variants)</span>
                    </h3>
                    
                    {/* Product Variants (Categories & Colors) */}
                    <div className="flex flex-wrap gap-1.5">
                      {items.map((stock) => {
                        const isSelected = selectedStock?._id === stock._id;
                        
                        return (
                          <button
                            key={stock._id}
                            onClick={() => handleSelectStock(stock)}
                            className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 rounded-md text-left transition duration-150 ${
                              isSelected
                                ? 'bg-blue-50 border-2 border-blue-500 shadow-sm'
                                : 'bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                            }`}
                          >
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 border border-gray-300`}
                              style={{ backgroundColor: stock.productColor?.toLowerCase() || '#ccc' }}
                              title={stock.productColor}></span>
                            <span className="text-xs text-gray-500 truncate max-w-20 sm:max-w-32">{stock.productCategory}</span>
                            <span className="text-xs text-gray-400 truncate max-w-16 sm:max-w-24">{stock.productColor}</span>
                            {isSelected && (
                              <svg className="w-3.5 h-3.5 text-blue-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Update Form */}
        <div id="updateForm">
          {!selectedStock ? (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="text-center py-8 sm:py-10">
                <span className="text-2xl">✏️</span>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No Stock Selected</h3>
                <p className="mt-1 text-xs text-gray-500">Select a stock item above to update its details.</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-linear-to-r from-blue-600 to-cyan-600 px-3 sm:px-4 py-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div className="min-w-0">
                  <h2 className="text-xs sm:text-sm font-semibold text-white">Update Stock</h2>
                  <p className="text-blue-100 text-xs truncate">Editing: {selectedStock.productName} - {selectedStock.productColor}</p>
                </div>
                <button onClick={handleCancelUpdate}
                  className="w-full sm:w-auto px-2.5 py-1 bg-white text-gray-700 rounded-md hover:bg-gray-100 text-xs font-medium">
                  Cancel
                </button>
              </div>

              {/* Current Info */}
              <div className="px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-50 border-b border-gray-200">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div>
                    <p className="text-gray-500">Price</p>
                    <p className="font-bold">Rs. {formatCurrency(selectedStock.productPurchasePrice)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Quantity</p>
                    <p className="font-bold">{selectedStock.productQuantity}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Status</p>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                      (parseInt(selectedStock.productQuantity) || 0) === 0 ? 'bg-red-100 text-red-800' :
                      (parseInt(selectedStock.productQuantity) || 0) <= 10 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {getCalculatedStatus(selectedStock.productQuantity)}
                    </span>
                  </div>
                  <div>
                    <p className="text-gray-500">Value</p>
                    <p className="font-bold text-green-600">Rs. {formatCurrency((selectedStock.productPurchasePrice || 0) * (selectedStock.productQuantity || 0))}</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleUpdateSubmit} className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 sm:gap-3">
                  <div>
                    <label className="block text-2xs xs:text-xs font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                    <input type="text" name="productName" value={formData.productName} onChange={handleInputChange}
                      required placeholder="Product name"
                      className="w-full px-2 sm:px-2.5 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-2xs xs:text-xs font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
                    <input type="text" name="productCategory" value={formData.productCategory} onChange={handleInputChange}
                      required placeholder="Category"
                      className="w-full px-2 sm:px-2.5 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-2xs xs:text-xs font-medium text-gray-700 mb-1">Color <span className="text-red-500">*</span></label>
                    <div className="flex items-center gap-2">
                      <input type="text" name="productColor" value={formData.productColor} onChange={handleInputChange}
                        required placeholder="Color"
                        className="flex-1 px-2 sm:px-2.5 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500" />
                      <span className="w-6 h-6 rounded-full border-2 border-gray-300 shrink-0"
                        style={{ backgroundColor: formData.productColor?.toLowerCase() || '#ccc' }}></span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-2xs xs:text-xs font-medium text-gray-700 mb-1">Price (Rs.) <span className="text-red-500">*</span></label>
                    <input type="number" name="productPurchasePrice" value={formData.productPurchasePrice} onChange={handleInputChange}
                      required min="0" step="0.01" placeholder="0.00"
                      className="w-full px-2 sm:px-2.5 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500" />
                    {formData.productPurchasePrice && parseFloat(formData.productPurchasePrice) !== selectedStock.productPurchasePrice && (
                      <p className="mt-0.5 text-xs text-blue-600">Was: Rs. {formatCurrency(selectedStock.productPurchasePrice)}</p>
                    )}
                  </div>
                  <div className="xs:col-span-2">
                    <label className="block text-2xs xs:text-xs font-medium text-gray-700 mb-1">Quantity <span className="text-red-500">*</span></label>
                    <input type="number" name="productQuantity" value={formData.productQuantity} onChange={handleInputChange}
                      required min="0" placeholder="0"
                      className="w-full px-2 sm:px-2.5 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500" />
                    <div className="mt-1 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-1">
                      <span className="text-xs text-gray-500">
                        New Status: <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                          (parseInt(formData.productQuantity) || 0) === 0 ? 'bg-red-100 text-red-800' :
                          (parseInt(formData.productQuantity) || 0) <= 10 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {getCalculatedStatus(formData.productQuantity)}
                        </span>
                      </span>
                      {formData.productQuantity && parseInt(formData.productQuantity) !== selectedStock.productQuantity && (
                        <p className="text-xs text-blue-600">Was: {selectedStock.productQuantity}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Change Summary */}
                {hasChanges() && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-2 sm:p-2.5 text-xs">
                    <p className="font-semibold text-blue-900 mb-1">Changes:</p>
                    <div className="space-y-0.5">
                      {formData.productName !== selectedStock.productName && (
                        <p className="text-blue-800 break-all">Name: <span className="line-through text-red-500">{selectedStock.productName}</span> → <span className="font-medium text-green-600">{formData.productName}</span></p>
                      )}
                      {formData.productCategory !== selectedStock.productCategory && (
                        <p className="text-blue-800 break-all">Category: <span className="line-through text-red-500">{selectedStock.productCategory}</span> → <span className="font-medium text-green-600">{formData.productCategory}</span></p>
                      )}
                      {formData.productColor !== selectedStock.productColor && (
                        <p className="text-blue-800 break-all">Color: <span className="line-through text-red-500">{selectedStock.productColor}</span> → <span className="font-medium text-green-600">{formData.productColor}</span></p>
                      )}
                      {parseFloat(formData.productPurchasePrice) !== selectedStock.productPurchasePrice && (
                        <p className="text-blue-800">Price: <span className="line-through text-red-500">Rs. {formatCurrency(selectedStock.productPurchasePrice)}</span> → <span className="font-medium text-green-600">Rs. {formatCurrency(parseFloat(formData.productPurchasePrice))}</span></p>
                      )}
                      {parseInt(formData.productQuantity) !== selectedStock.productQuantity && (
                        <p className="text-blue-800">Qty: <span className="line-through text-red-500">{selectedStock.productQuantity}</span> → <span className="font-medium text-green-600">{formData.productQuantity}</span></p>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col xs:flex-row gap-2 sm:gap-3 pt-1">
                  <button type="button" onClick={handleCancelUpdate} disabled={updateLoading}
                    className="w-full xs:flex-1 py-2 px-3 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 text-xs font-medium disabled:opacity-50 order-2 xs:order-1">
                    Cancel
                  </button>
                  <button type="submit" disabled={updateLoading || !hasChanges()}
                    className={`w-full xs:flex-1 py-2 px-3 rounded-md text-white text-xs font-medium transition order-1 xs:order-2 ${
                      updateLoading || !hasChanges() ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-linear-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700'
                    }`}>
                    {updateLoading ? 'Updating...' : 'Update Stock'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Custom CSS for extra small screens */}
      <style jsx='true'>{`
        @media (min-width: 480px) {
          .xs\\:grid-cols-2 {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .xs\\:col-span-2 {
            grid-column: span 2 / span 2;
          }
          .xs\\:flex-row {
            flex-direction: row;
          }
          .xs\\:items-center {
            align-items: center;
          }
          .xs\\:flex-1 {
            flex: 1 1 0%;
          }
          .xs\\:order-1 {
            order: 1;
          }
          .xs\\:order-2 {
            order: 2;
          }
          .xs\\:text-xs {
            font-size: 0.75rem;
          }
        }
        .text-2xs {
          font-size: 0.65rem;
        }
        .max-w-20 {
          max-width: 5rem;
        }
        .max-w-32 {
          max-width: 8rem;
        }
        .max-w-16 {
          max-width: 4rem;
        }
        .max-w-24 {
          max-width: 6rem;
        }
        @media (min-width: 640px) {
          .sm\\:max-w-32 {
            max-width: 8rem;
          }
          .sm\\:max-w-24 {
            max-width: 6rem;
          }
        }
      `}</style>
    </div>
  );
};

export default StockUpdate;