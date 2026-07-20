// InvoiceUpdate.jsx - Redesigned compact component for updating invoices
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'https://bisni-ms-backend.onrender.com/api';

const InvoiceUpdate = () => {
  const [invoices, setInvoices] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  
  const [searchType, setSearchType] = useState('invoiceId');
  const [searchValue, setSearchValue] = useState('');
  
  const [formData, setFormData] = useState({
    customerName: '',
    customerMobileNumber1: '',
    customerMobileNumber2: '',
    customerAddress: '',
    employeeCategory: '',
    employeeName: '',
    employeeAddress: '',
    employeeMobileNumber: '',
    products: [],
    deliveryCharges: 0,
    grandTotalAmount: 0
  });

  useEffect(() => {
    fetchStocks();
  }, []);

  const fetchStocks = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/stock`);
      setStocks(response.data.data || response.data || []);
    } catch (error) {
      console.error('Error fetching stocks:', error);
    }
  };

  // Get unique product names
  const getUniqueProductNames = () => {
    const names = stocks.map(stock => stock.productName);
    return [...new Set(names)].filter(Boolean);
  };

  // Get categories for a product name
  const getCategoriesForProduct = (productName) => {
    if (!productName) return [];
    const categories = stocks
      .filter(stock => stock.productName === productName)
      .map(stock => stock.productCategory);
    return [...new Set(categories)].filter(Boolean);
  };

  // Get colors for product name + category
  const getColorsForProduct = (productName, productCategory) => {
    if (!productName || !productCategory) return [];
    return stocks.filter(stock => 
      stock.productName === productName && 
      stock.productCategory === productCategory
    );
  };

  // Get stock item
  const getStockItem = (productName, productCategory, productColor) => {
    return stocks.find(stock => 
      stock.productName === productName && 
      stock.productCategory === productCategory && 
      stock.productColor === productColor
    );
  };

  const handleSearchInvoice = async () => {
    if (!searchValue.trim()) {
      setError('Please enter a search value');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const params = new URLSearchParams();
      
      switch (searchType) {
        case 'invoiceId': params.append('invoiceId', searchValue); break;
        case 'customerName': params.append('customerName', searchValue); break;
        case 'customerMobileNumber': params.append('customerMobileNumber', searchValue); break;
        default: break;
      }
      
      const response = await axios.get(`${API_BASE_URL}/invoice?${params.toString()}`);
      const foundInvoices = response.data.data || response.data || [];
      
      if (foundInvoices.length === 0) {
        setError('No invoice found with the provided search criteria');
        setInvoices([]);
        return;
      }
      
      setInvoices(foundInvoices);
      setSuccess(`${foundInvoices.length} invoice(s) found`);
      
    } catch (error) {
      console.error('Error searching invoice:', error);
      setError(error.response?.data?.message || 'Failed to search invoice.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setFormData({
      customerName: invoice.customerName || '',
      customerMobileNumber1: invoice.customerMobileNumber1 || '',
      customerMobileNumber2: invoice.customerMobileNumber2 || '',
      customerAddress: invoice.customerAddress || '',
      employeeCategory: invoice.employeeCategory || '',
      employeeName: invoice.employeeName || '',
      employeeAddress: invoice.employeeAddress || '',
      employeeMobileNumber: invoice.employeeMobileNumber || '',
      products: invoice.products ? invoice.products.map(p => ({
        productName: p.productName || '',
        productCategory: p.productCategory || '',
        productColor: p.productColor || '',
        productSalePrice: p.productSalePrice?.toString() || '',
        productQuantity: p.productQuantity || 1,
        productTotalAmount: p.productTotalAmount || 0
      })) : [],
      deliveryCharges: invoice.deliveryCharges || 0,
      grandTotalAmount: invoice.grandTotalAmount || 0
    });
    setError(null);
    setSuccess(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value || '' }));
  };

  const addProduct = () => {
    setFormData(prev => ({
      ...prev,
      products: [...prev.products, {
        productName: '', productCategory: '', productColor: '',
        productSalePrice: '', productQuantity: 1, productTotalAmount: 0
      }]
    }));
  };

  const removeProduct = (index) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index)
    }));
  };

  const handleProductChange = (index, field, value) => {
    const updatedProducts = [...formData.products];
    const safeValue = value ?? '';
    
    if (field === 'productName') {
      updatedProducts[index] = {
        ...updatedProducts[index],
        productName: safeValue || '',
        productCategory: '',
        productColor: '',
        productSalePrice: '',
        productQuantity: 1,
        productTotalAmount: 0
      };
    } else if (field === 'productCategory') {
      updatedProducts[index] = {
        ...updatedProducts[index],
        productCategory: safeValue || '',
        productColor: '',
        productSalePrice: '',
        productQuantity: 1,
        productTotalAmount: 0
      };
    } else if (field === 'productColor') {
      const selectedStock = getStockItem(
        updatedProducts[index].productName,
        updatedProducts[index].productCategory,
        safeValue
      );
      updatedProducts[index] = {
        ...updatedProducts[index],
        productColor: safeValue || '',
        productSalePrice: selectedStock ? (selectedStock.productPurchasePrice?.toString() || '') : '',
        productTotalAmount: selectedStock ? ((selectedStock.productPurchasePrice || 0) * 1) : 0
      };
    } else if (field === 'productSalePrice') {
      const numValue = parseFloat(safeValue) || 0;
      updatedProducts[index] = {
        ...updatedProducts[index],
        productSalePrice: safeValue,
        productTotalAmount: numValue * (parseInt(updatedProducts[index].productQuantity) || 0)
      };
    } else if (field === 'productQuantity') {
      const numValue = parseInt(safeValue) || 0;
      updatedProducts[index] = {
        ...updatedProducts[index],
        productQuantity: safeValue,
        productTotalAmount: (parseFloat(updatedProducts[index].productSalePrice) || 0) * numValue
      };
    }
    
    setFormData(prev => ({ ...prev, products: updatedProducts }));
  };

  const calculateGrandTotal = () => {
    const productsTotal = formData.products.reduce(
      (sum, p) => sum + (parseFloat(p.productTotalAmount) || 0), 0
    );
    return productsTotal + (parseFloat(formData.deliveryCharges) || 0);
  };

  const handleUpdateInvoice = async (e) => {
    e.preventDefault();
    
    if (!selectedInvoice) {
      setError('Please select an invoice to update');
      return;
    }

    if (formData.products.length > 0) {
      const hasInvalid = formData.products.some(
        p => !p.productName || !p.productCategory || !p.productColor || 
             !p.productQuantity || p.productQuantity < 1 || 
             !p.productSalePrice || parseFloat(p.productSalePrice) <= 0
      );
      if (hasInvalid) {
        setError('Please fill all product fields (Name, Category, Color, Price, Qty)');
        return;
      }
    }

    setUpdateLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const updateData = {
        customerName: formData.customerName,
        customerMobileNumber1: formData.customerMobileNumber1,
        customerMobileNumber2: formData.customerMobileNumber2,
        customerAddress: formData.customerAddress,
        employeeCategory: formData.employeeCategory,
        employeeName: formData.employeeName,
        employeeAddress: formData.employeeAddress,
        employeeMobileNumber: formData.employeeMobileNumber,
        products: formData.products.map(p => ({
          productName: p.productName,
          productCategory: p.productCategory,
          productColor: p.productColor,
          productSalePrice: parseFloat(p.productSalePrice),
          productQuantity: parseInt(p.productQuantity),
          productTotalAmount: parseFloat(p.productSalePrice) * parseInt(p.productQuantity)
        })),
        deliveryCharges: parseFloat(formData.deliveryCharges) || 0,
        grandTotalAmount: calculateGrandTotal()
      };

      const params = new URLSearchParams();
      params.append('invoiceId', selectedInvoice.invoiceId);
      
      const response = await axios.put(`${API_BASE_URL}/invoice?${params.toString()}`, updateData);
      
      setSuccess('Invoice updated successfully!');
      setSelectedInvoice(response.data.data);
      setInvoices(prev => prev.map(inv => 
        inv.invoiceId === selectedInvoice.invoiceId ? response.data.data : inv
      ));
      
    } catch (error) {
      console.error('Error updating invoice:', error);
      setError(error.response?.data?.message || 'Failed to update invoice.');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleCancelUpdate = () => {
    setSelectedInvoice(null);
    setFormData({
      customerName: '', customerMobileNumber1: '', customerMobileNumber2: '',
      customerAddress: '', employeeCategory: '', employeeName: '',
      employeeAddress: '', employeeMobileNumber: '',
      products: [], deliveryCharges: 0, grandTotalAmount: 0
    });
    setError(null);
    setSuccess(null);
  };

  const clearMessages = () => { setError(null); setSuccess(null); };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'PKR'
    }).format(amount || 0);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 py-3 sm:py-4 md:py-5 px-2 sm:px-3 md:px-4 lg:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-5">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">UPDATE INVOICE</h1>
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

        {/* Search Section */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-3 sm:mb-4">
          <div className="bg-linear-to-r from-blue-600 to-cyan-600 px-3 sm:px-4 py-2 sm:py-2.5">
            <h2 className="text-xs sm:text-sm font-semibold text-white flex items-center">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="whitespace-nowrap">Search Invoice</span>
            </h2>
          </div>

          <div className="p-2 sm:p-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
              <div>
                <label className="block text-2xs xs:text-xs font-medium text-gray-700 mb-1">Search By</label>
                <select value={searchType} onChange={(e) => setSearchType(e.target.value)}
                  className="w-full px-2 sm:px-2.5 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 text-xs">
                  <option value="invoiceId">Invoice ID</option>
                  <option value="customerName">Customer Name</option>
                  <option value="customerMobileNumber">Customer Mobile</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-2xs xs:text-xs font-medium text-gray-700 mb-1">Search Value</label>
                <input type="text" value={searchValue} onChange={(e) => setSearchValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchInvoice()}
                  placeholder={searchType === 'invoiceId' ? 'e.g., INV-20260113-0001' : searchType === 'customerName' ? 'Enter customer name' : 'Enter mobile number'}
                  className="w-full px-2 sm:px-2.5 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 text-xs" />
              </div>

              <div className="flex items-end">
                <button onClick={handleSearchInvoice} disabled={loading}
                  className="w-full px-3 py-1.5 bg-linear-to-r from-blue-600 to-cyan-600 text-white rounded-md hover:from-blue-700 hover:to-cyan-700 text-xs font-medium disabled:opacity-50">
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Search Results */}
        {invoices.length > 0 && !selectedInvoice && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-3 sm:mb-4">
            <div className="bg-linear-to-r from-blue-600 to-cyan-600 px-3 sm:px-4 py-2">
              <h2 className="text-xs sm:text-sm font-semibold text-white">Search Results ({invoices.length})</h2>
            </div>

            {/* Mobile Card View */}
            <div className="block lg:hidden">
              {invoices.map((invoice) => (
                <div key={invoice._id} className="border-b border-gray-200 p-3 hover:bg-gray-50 transition duration-150">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-900 truncate">{invoice.invoiceId}</div>
                      <div className="text-xs text-gray-500">{formatDate(invoice.createdAt)}</div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <div className="text-xs font-bold text-green-600">{formatCurrency(invoice.grandTotalAmount)}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs mb-2">
                    <div><span className="text-gray-500">Customer:</span> <span className="font-medium">{invoice.customerName}</span></div>
                    <div><span className="text-gray-500">Mobile:</span> <span className="font-medium">{invoice.customerMobileNumber1}</span></div>
                  </div>
                  <button onClick={() => handleSelectInvoice(invoice)}
                    className="w-full px-2 py-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 text-xs font-medium text-center">
                    Edit Invoice
                  </button>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="overflow-x-auto hidden lg:block">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Invoice ID</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Customer</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-16">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map((invoice) => (
                    <tr key={invoice._id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900">{invoice.invoiceId}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500 hidden md:table-cell">{formatDate(invoice.createdAt)}</td>
                      <td className="px-3 py-2 whitespace-nowrap hidden lg:table-cell">
                        <div className="text-xs text-gray-900">{invoice.customerName}</div>
                        <div className="text-xs text-gray-500">{invoice.customerMobileNumber1}</div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right text-xs font-bold text-green-600">{formatCurrency(invoice.grandTotalAmount)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-center">
                        <button onClick={() => handleSelectInvoice(invoice)}
                          className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 text-xs font-medium">
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Update Form */}
        {selectedInvoice && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-linear-to-r from-blue-600 to-cyan-600 px-3 sm:px-4 py-2 sm:py-2.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-semibold text-white">Update Invoice</h2>
                <p className="text-blue-100 text-xs truncate">Editing: {selectedInvoice.invoiceId}</p>
              </div>
              <button onClick={handleCancelUpdate}
                className="px-2.5 py-1 bg-white text-gray-700 rounded-md hover:bg-gray-100 text-xs font-medium w-full sm:w-auto">
                Cancel
              </button>
            </div>

            <form onSubmit={handleUpdateInvoice} className="p-2 sm:p-3 space-y-3 sm:space-y-4">
              {/* Employee Information */}
              <div>
                <h3 className="text-xs sm:text-sm font-medium text-gray-900 mb-1.5 sm:mb-2 flex items-center">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Employee Information</span>
                </h3>
                <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-2 p-2 sm:p-2.5 bg-gray-50 rounded-md">
                  <div>
                    <label className="block text-2xs xs:text-xs font-medium text-gray-600 mb-0.5">Name *</label>
                    <input type="text" name="employeeName" value={formData.employeeName || ''} onChange={handleInputChange} required
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs" />
                  </div>
                  <div>
                    <label className="block text-2xs xs:text-xs font-medium text-gray-600 mb-0.5">Category *</label>
                    <input type="text" name="employeeCategory" value={formData.employeeCategory || ''} onChange={handleInputChange} required
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs" />
                  </div>
                  <div>
                    <label className="block text-2xs xs:text-xs font-medium text-gray-600 mb-0.5">Mobile *</label>
                    <input type="text" name="employeeMobileNumber" value={formData.employeeMobileNumber || ''} onChange={handleInputChange} required
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs" />
                  </div>
                  <div>
                    <label className="block text-2xs xs:text-xs font-medium text-gray-600 mb-0.5">Address *</label>
                    <input type="text" name="employeeAddress" value={formData.employeeAddress || ''} onChange={handleInputChange} required
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs" />
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div>
                <h3 className="text-xs sm:text-sm font-medium text-gray-900 mb-1.5 sm:mb-2 flex items-center">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>Customer Information</span>
                </h3>
                <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-2xs xs:text-xs font-medium text-gray-700 mb-1">Name *</label>
                    <input type="text" name="customerName" value={formData.customerName || ''} onChange={handleInputChange} required
                      className="w-full px-2 sm:px-2.5 py-1.5 border border-gray-300 rounded-md text-xs" />
                  </div>
                  <div>
                    <label className="block text-2xs xs:text-xs font-medium text-gray-700 mb-1">Mobile 1 *</label>
                    <input type="text" name="customerMobileNumber1" value={formData.customerMobileNumber1 || ''} onChange={handleInputChange} required
                      className="w-full px-2 sm:px-2.5 py-1.5 border border-gray-300 rounded-md text-xs" />
                  </div>
                  <div>
                    <label className="block text-2xs xs:text-xs font-medium text-gray-700 mb-1">Mobile 2</label>
                    <input type="text" name="customerMobileNumber2" value={formData.customerMobileNumber2 || ''} onChange={handleInputChange}
                      className="w-full px-2 sm:px-2.5 py-1.5 border border-gray-300 rounded-md text-xs" />
                  </div>
                  <div>
                    <label className="block text-2xs xs:text-xs font-medium text-gray-700 mb-1">Address *</label>
                    <input type="text" name="customerAddress" value={formData.customerAddress || ''} onChange={handleInputChange} required
                      className="w-full px-2 sm:px-2.5 py-1.5 border border-gray-300 rounded-md text-xs" />
                  </div>
                </div>
              </div>

              {/* Products Section */}
              <div className="border-t border-gray-200 pt-2 sm:pt-3">
                <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-2 mb-2">
                  <h3 className="text-xs sm:text-sm font-medium text-gray-900 flex items-center">
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 text-cyan-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <span>Products</span>
                  </h3>
                  <button type="button" onClick={addProduct}
                    className="w-full xs:w-auto inline-flex items-center justify-center px-2.5 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-xs font-medium">
                    + Add Product
                  </button>
                </div>

                {formData.products.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 rounded-md border-2 border-dashed border-gray-300">
                    <p className="text-xs text-gray-500">No products. Click "Add Product" to add items.</p>
                  </div>
                ) : (
                  <div className="space-y-2 sm:space-y-2.5">
                    {formData.products.map((product, index) => {
                      const categories = getCategoriesForProduct(product.productName);
                      const colorStocks = getColorsForProduct(product.productName, product.productCategory);
                      const selectedStock = getStockItem(product.productName, product.productCategory, product.productColor);
                      
                      return (
                        <div key={index} className="bg-gray-50 rounded-md p-2 sm:p-2.5 border border-gray-200">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-medium text-gray-700">Product #{index + 1}</span>
                            <button type="button" onClick={() => removeProduct(index)} className="text-red-600 hover:text-red-800">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>

                          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                            {/* Product Name */}
                            <div>
                              <label className="block text-2xs xs:text-xs text-gray-600 mb-0.5">Name *</label>
                              <select value={product.productName || ''}
                                onChange={(e) => handleProductChange(index, 'productName', e.target.value)} required
                                className="w-full px-1.5 py-1 border border-gray-300 rounded text-xs">
                                <option value="">Select</option>
                                {getUniqueProductNames().map((name) => (
                                  <option key={name} value={name}>{name}</option>
                                ))}
                              </select>
                            </div>

                            {/* Category */}
                            <div>
                              <label className="block text-2xs xs:text-xs text-gray-600 mb-0.5">Category *</label>
                              <select value={product.productCategory || ''}
                                onChange={(e) => handleProductChange(index, 'productCategory', e.target.value)} required
                                disabled={!product.productName}
                                className="w-full px-1.5 py-1 border border-gray-300 rounded text-xs disabled:bg-gray-100">
                                <option value="">{product.productName ? 'Select' : 'First select name'}</option>
                                {categories.map((cat) => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </select>
                            </div>

                            {/* Color */}
                            <div>
                              <label className="block text-2xs xs:text-xs text-gray-600 mb-0.5">Color *</label>
                              <select value={product.productColor || ''}
                                onChange={(e) => handleProductChange(index, 'productColor', e.target.value)} required
                                disabled={!product.productCategory}
                                className="w-full px-1.5 py-1 border border-gray-300 rounded text-xs disabled:bg-gray-100">
                                <option value="">{product.productCategory ? 'Select' : 'First select category'}</option>
                                {colorStocks.map((stock) => (
                                  <option key={stock._id} value={stock.productColor}>
                                    {stock.productColor} ({stock.productQuantity})
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Price */}
                            <div>
                              <label className="block text-2xs xs:text-xs text-gray-600 mb-0.5">Price *</label>
                              <input type="number" value={product.productSalePrice || ''}
                                onChange={(e) => handleProductChange(index, 'productSalePrice', e.target.value)}
                                required min="0" step="0.01"
                                className="w-full px-1.5 py-1 border border-gray-300 rounded text-xs" />
                            </div>

                            {/* Qty */}
                            <div>
                              <label className="block text-2xs xs:text-xs text-gray-600 mb-0.5">Qty *</label>
                              <input type="number" value={product.productQuantity || 1}
                                onChange={(e) => handleProductChange(index, 'productQuantity', e.target.value)}
                                required min="1"
                                className="w-full px-1.5 py-1 border border-gray-300 rounded text-xs" />
                            </div>

                            {/* Total */}
                            <div>
                              <label className="block text-2xs xs:text-xs text-gray-600 mb-0.5">Total</label>
                              <input type="text" value={formatCurrency(product.productTotalAmount || 0)} readOnly
                                className="w-full px-1.5 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-medium text-green-600" />
                            </div>
                          </div>

                          {/* Stock Info */}
                          {selectedStock && (
                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                              <span className="text-gray-500">Stock:</span>
                              <span className="text-blue-600 font-medium">{selectedStock.productQuantity} available</span>
                              <span className="text-gray-500">Cost:</span>
                              <span className="text-gray-700">{formatCurrency(selectedStock.productPurchasePrice)}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Delivery Charges and Grand Total */}
              <div className="border-t border-gray-200 pt-2 sm:pt-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
                  <div>
                    <label className="block text-2xs xs:text-xs font-medium text-gray-700 mb-1">Delivery Charges</label>
                    <input type="number" name="deliveryCharges" value={formData.deliveryCharges || 0}
                      onChange={handleInputChange} min="0" step="0.01"
                      className="w-full px-2 sm:px-2.5 py-1.5 border border-gray-300 rounded-md text-xs" />
                  </div>
                  <div className="flex items-end">
                    <div className="w-full bg-linear-to-r from-blue-50 to-cyan-50 rounded-md p-2 sm:p-3 border-2 border-blue-200">
                      <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-1">
                        <span className="text-xs font-medium text-gray-700">Grand Total:</span>
                        <span className="text-base sm:text-lg font-bold text-blue-600">{formatCurrency(calculateGrandTotal())}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col xs:flex-row gap-2 sm:gap-3 sm:space-x-3">
                <button type="button" onClick={handleCancelUpdate} disabled={updateLoading}
                  className="w-full xs:flex-1 py-2 px-3 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 text-xs font-medium disabled:opacity-50 order-2 xs:order-1">
                  Cancel
                </button>
                <button type="submit" disabled={updateLoading}
                  className={`w-full xs:flex-1 py-2 px-3 rounded-md text-white text-xs font-medium transition duration-200 order-1 xs:order-2 ${
                    updateLoading ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-linear-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700'
                  }`}>
                  {updateLoading ? 'Updating...' : 'Update Invoice'}
                </button>
              </div>
            </form>
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
          .xs\\:flex-1 {
            flex: 1 1 0%;
          }
          .xs\\:order-1 {
            order: 1;
          }
          .xs\\:order-2 {
            order: 2;
          }
          .xs\\:items-center {
            align-items: center;
          }
        }
        .text-2xs {
          font-size: 0.65rem;
        }
      `}</style>
    </div>
  );
};

export default InvoiceUpdate;