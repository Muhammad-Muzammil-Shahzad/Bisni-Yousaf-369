// InvoiceCreate.jsx - Component for creating invoices only (FIXED - Category & Color Selection)
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'https://bisni-ms-backend.onrender.com/api';

const InvoiceCreate = () => {
  const [employees, setEmployees] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [formData, setFormData] = useState({
    employeeCategory: '',
    employeeName: '',
    employeeAddress: '',
    employeeMobileNumber: '',
    customerName: '',
    customerMobileNumber1: '',
    customerMobileNumber2: '',
    customerAddress: '',
    products: [],
    deliveryCharges: 0
  });

  // Fetch employees and stocks on component mount
  useEffect(() => {
    fetchEmployees();
    fetchStocks();
  }, []);

  const fetchEmployees = async () => {
    try {
      setFetchLoading(true);
      const response = await axios.get(`${API_BASE_URL}/employee`);
      setEmployees(response.data.data || response.data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setError('Failed to load employees. Please try again later.');
    } finally {
      setFetchLoading(false);
    }
  };

  const fetchStocks = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/stock`);
      setStocks(response.data.data || response.data || []);
    } catch (error) {
      console.error('Error fetching stocks:', error);
    }
  };

  const handleSelectEmployee = (employee) => {
    setSelectedEmployee(employee);
    setFormData(prev => ({
      ...prev,
      employeeCategory: employee.employeeCategory || '',
      employeeName: employee.employeeName || '',
      employeeAddress: employee.employeeAddress || '',
      employeeMobileNumber: employee.employeeMobileNumber || ''
    }));
    setError(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value || ''
    }));
  };

  const addProduct = () => {
    setFormData(prev => ({
      ...prev,
      products: [
        ...prev.products,
        {
          productName: '',
          productCategory: '',
          productColor: '',
          productSalePrice: '',
          productQuantity: 1,
          productTotalAmount: 0
        }
      ]
    }));
  };

  const removeProduct = (index) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index)
    }));
  };

  // Get unique product names for dropdown
  const getUniqueProductNames = () => {
    const names = stocks.map(stock => stock.productName);
    return [...new Set(names)].filter(Boolean);
  };

  // Get categories for a specific product name
  const getCategoriesForProduct = (productName) => {
    if (!productName) return [];
    const categories = stocks
      .filter(stock => stock.productName === productName)
      .map(stock => stock.productCategory);
    return [...new Set(categories)].filter(Boolean);
  };

  // Get colors for a specific product name and category
  const getColorsForProduct = (productName, productCategory) => {
    if (!productName || !productCategory) return [];
    const matchingStocks = stocks.filter(stock => 
      stock.productName === productName && 
      stock.productCategory === productCategory
    );
    return matchingStocks;
  };

  // Get available stock item by name, category, and color
  const getStockItem = (productName, productCategory, productColor) => {
    return stocks.find(stock => 
      stock.productName === productName && 
      stock.productCategory === productCategory && 
      stock.productColor === productColor
    );
  };

  const handleProductChange = (index, field, value) => {
    const updatedProducts = [...formData.products];
    const safeValue = value ?? '';
    
    if (field === 'productName') {
      // Reset category and color when product name changes
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
      // Reset color when category changes
      updatedProducts[index] = {
        ...updatedProducts[index],
        productCategory: safeValue || '',
        productColor: '',
        productSalePrice: '',
        productQuantity: 1,
        productTotalAmount: 0
      };
    } else if (field === 'productColor') {
      // When color is selected, auto-fill price from stock
      const selectedStock = getStockItem(
        updatedProducts[index].productName,
        updatedProducts[index].productCategory,
        safeValue
      );
      updatedProducts[index] = {
        ...updatedProducts[index],
        productColor: safeValue || '',
        productSalePrice: selectedStock ? (selectedStock.productPurchasePrice || '') : (updatedProducts[index].productSalePrice || ''),
        productTotalAmount: selectedStock 
          ? ((selectedStock.productPurchasePrice || 0) * (parseInt(updatedProducts[index].productQuantity) || 1))
          : (updatedProducts[index].productTotalAmount || 0)
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
    } else {
      updatedProducts[index] = {
        ...updatedProducts[index],
        [field]: safeValue || ''
      };
    }
    
    setFormData(prev => ({
      ...prev,
      products: updatedProducts
    }));
  };

  const calculateGrandTotal = () => {
    const productsTotal = formData.products.reduce(
      (sum, product) => sum + (parseFloat(product.productTotalAmount) || 0), 0
    );
    return productsTotal + (parseFloat(formData.deliveryCharges) || 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate employee is selected
      if (!selectedEmployee) {
        setError('Please select an employee from the list');
        setLoading(false);
        return;
      }

      // Validate products exist
      if (formData.products.length === 0) {
        setError('Please add at least one product to the invoice');
        setLoading(false);
        return;
      }

      // Validate all products have required fields
      const hasInvalidProduct = formData.products.some(
        product => !product.productName || !product.productCategory || 
                   !product.productColor || !product.productQuantity || 
                   product.productQuantity < 1 || 
                   !product.productSalePrice || 
                   parseFloat(product.productSalePrice) <= 0
      );

      if (hasInvalidProduct) {
        setError('Please fill all product fields with valid values (Name, Category, Color, Price, and Quantity)');
        setLoading(false);
        return;
      }

      // Format products for submission
      const formattedProducts = formData.products.map(product => ({
        productName: product.productName,
        productCategory: product.productCategory,
        productColor: product.productColor,
        productSalePrice: parseFloat(product.productSalePrice),
        productQuantity: parseInt(product.productQuantity),
        productTotalAmount: parseFloat(product.productSalePrice) * parseInt(product.productQuantity)
      }));

      const invoiceData = {
        employeeCategory: formData.employeeCategory,
        employeeName: formData.employeeName,
        employeeAddress: formData.employeeAddress,
        employeeMobileNumber: formData.employeeMobileNumber,
        customerName: formData.customerName,
        customerMobileNumber1: formData.customerMobileNumber1,
        customerMobileNumber2: formData.customerMobileNumber2 || '',
        customerAddress: formData.customerAddress,
        products: formattedProducts,
        deliveryCharges: parseFloat(formData.deliveryCharges) || 0,
        grandTotalAmount: calculateGrandTotal()
      };

      const response = await axios.post(`${API_BASE_URL}/invoice`, invoiceData);
      
      setSuccess(response.data.message || 'Invoice created successfully!');
      
      // Reset form
      setFormData({
        employeeCategory: '',
        employeeName: '',
        employeeAddress: '',
        employeeMobileNumber: '',
        customerName: '',
        customerMobileNumber1: '',
        customerMobileNumber2: '',
        customerAddress: '',
        products: [],
        deliveryCharges: 0
      });
      setSelectedEmployee(null);
      
    } catch (error) {
      console.error('Error creating invoice:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Failed to create invoice. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR'
  }).format(amount || 0);
};

  const getStockStatus = (quantity) => {
    if (quantity === 0) return { text: 'Out of Stock', color: 'bg-red-100 text-red-800' };
    if (quantity <= 10) return { text: 'Low Stock', color: 'bg-yellow-100 text-yellow-800' };
    return { text: 'In Stock', color: 'bg-green-100 text-green-800' };
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-center text-gray-900">
            CREATE INVOICE
          </h1>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 p-3 rounded flex justify-between items-center">
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={clearMessages} className="text-red-400 hover:text-red-600">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 p-3 rounded flex justify-between items-center">
            <p className="text-sm text-green-700">{success}</p>
            <button onClick={clearMessages} className="text-green-400 hover:text-green-600">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Employee Selection Panel - Now at top center */}
        <div className="mb-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-linear-to-r from-blue-600 to-cyan-600 px-4 py-3">
              <h2 className="text-sm font-semibold text-white">
                Select Employee
              </h2>
            </div>

            <div className="p-3">
              {fetchLoading ? (
                <div className="flex justify-center items-center py-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : employees.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs text-gray-500">No employees available</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 justify-center">
                  {employees.map((employee) => (
                    <button
                      key={employee._id}
                      onClick={() => handleSelectEmployee(employee)}
                      className={`text-left p-2 rounded transition duration-200 text-sm ${
                        selectedEmployee?._id === employee._id
                          ? 'bg-blue-50 border border-blue-300'
                          : 'bg-gray-50 border border-transparent hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <div className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                          selectedEmployee?._id === employee._id
                            ? 'bg-linear-to-r from-blue-500 to-cyan-500'
                            : 'bg-linear-to-r from-gray-400 to-gray-500'
                        }`}>
                          <span className="text-white font-medium text-xs">
                            {employee.employeeName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 truncate">
                            {employee.employeeName}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {employee.employeeCategory}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Invoice Form */}
        <div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-linear-to-r from-blue-600 to-cyan-600 px-4 py-3">
              <h2 className="text-sm font-semibold text-white">
                Invoice Details
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Employee Information (Auto-filled) */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-1.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Employee Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-gray-50 rounded border border-gray-200">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Employee Name</label>
                    <input type="text" value={formData.employeeName || ''} readOnly
                      className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-gray-700 text-xs" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                    <input type="text" value={formData.employeeCategory || ''} readOnly
                      className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-gray-700 text-xs" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Mobile Number</label>
                    <input type="text" value={formData.employeeMobileNumber || ''} readOnly
                      className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-gray-700 text-xs" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
                    <input type="text" value={formData.employeeAddress || ''} readOnly
                      className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-gray-700 text-xs" />
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-1.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Customer Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="customerName" className="block text-xs font-medium text-gray-700 mb-1">
                      Customer Name <span className="text-red-500">*</span>
                    </label>
                    <input type="text" id="customerName" name="customerName" value={formData.customerName || ''}
                      onChange={handleInputChange} required placeholder="Enter customer name"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 text-gray-900 placeholder-gray-400" />
                  </div>
                  <div>
                    <label htmlFor="customerMobileNumber1" className="block text-xs font-medium text-gray-700 mb-1">
                      Mobile Number 1 <span className="text-red-500">*</span>
                    </label>
                    <input type="tel" id="customerMobileNumber1" name="customerMobileNumber1" value={formData.customerMobileNumber1 || ''}
                      onChange={handleInputChange} required placeholder="Primary mobile number"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 text-gray-900 placeholder-gray-400" />
                  </div>
                  <div>
                    <label htmlFor="customerMobileNumber2" className="block text-xs font-medium text-gray-700 mb-1">
                      Mobile Number 2
                    </label>
                    <input type="tel" id="customerMobileNumber2" name="customerMobileNumber2" value={formData.customerMobileNumber2 || ''}
                      onChange={handleInputChange} placeholder="Secondary mobile number"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 text-gray-900 placeholder-gray-400" />
                  </div>
                  <div>
                    <label htmlFor="customerAddress" className="block text-xs font-medium text-gray-700 mb-1">
                      Customer Address <span className="text-red-500">*</span>
                    </label>
                    <textarea id="customerAddress" name="customerAddress" value={formData.customerAddress || ''}
                      onChange={handleInputChange} required rows="2" placeholder="Enter customer address"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 text-gray-900 placeholder-gray-400 resize-none" />
                  </div>
                </div>
              </div>

              {/* Products Section */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
                  <h3 className="text-sm font-medium text-gray-900 flex items-center">
                    <svg className="w-4 h-4 mr-1.5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    Products
                  </h3>
                  <button type="button" onClick={addProduct}
                    className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition duration-200 text-xs font-medium w-full sm:w-auto justify-center">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Product
                  </button>
                </div>

                {formData.products.length === 0 && (
                  <div className="text-center py-8 bg-gray-50 rounded border border-dashed border-gray-300">
                    <p className="text-xs text-gray-500">No products added yet</p>
                    <p className="text-xs text-gray-400 mt-1">Click "Add Product" to add items</p>
                  </div>
                )}

                <div className="space-y-3">
                  {formData.products.map((product, index) => {
                    const categories = getCategoriesForProduct(product.productName);
                    const colorStocks = getColorsForProduct(product.productName, product.productCategory);
                    
                    return (
                      <div key={index} className="bg-gray-50 rounded border border-gray-200 p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-medium text-gray-700">
                            Product #{index + 1}
                          </span>
                          <button type="button" onClick={() => removeProduct(index)}
                            className="text-red-600 hover:text-red-800 transition duration-200">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>

                        {/* Responsive Product Grid: 1 col mobile, 2 col tablet, 3 col desktop */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {/* Product Name Selection */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Product Name <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={product.productName || ''}
                              onChange={(e) => handleProductChange(index, 'productName', e.target.value)}
                              required
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 text-gray-900"
                            >
                              <option value="">Select product</option>
                              {getUniqueProductNames().map((name) => (
                                <option key={name} value={name}>{name}</option>
                              ))}
                            </select>
                          </div>

                          {/* Category Selection - Depends on Product Name */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Category <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={product.productCategory || ''}
                              onChange={(e) => handleProductChange(index, 'productCategory', e.target.value)}
                              required
                              disabled={!product.productName}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            >
                              <option value="">
                                {product.productName ? 'Select category' : 'Select product first'}
                              </option>
                              {categories.map((category) => (
                                <option key={category} value={category}>{category}</option>
                              ))}
                            </select>
                          </div>

                          {/* Color Selection - Depends on Product Name & Category */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Color <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={product.productColor || ''}
                              onChange={(e) => handleProductChange(index, 'productColor', e.target.value)}
                              required
                              disabled={!product.productCategory}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            >
                              <option value="">
                                {product.productCategory ? 'Select color' : 'Select category first'}
                              </option>
                              {colorStocks.map((stock) => (
                                <option key={stock._id} value={stock.productColor}>
                                  {stock.productColor} {stock.productQuantity > 0 ? `(${stock.productQuantity})` : '(Out)'}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Stock Info - Removed as requested */}

                          {/* Sale Price */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Sale Price ($) <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              // value={product.productSalePrice || ''}
                              onChange={(e) => handleProductChange(index, 'productSalePrice', e.target.value)}
                              required
                              min="0"
                              // step="0.01"
                              // placeholder="0.00"
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 text-gray-900 placeholder-gray-400"
                            />
                          </div>

                          {/* Quantity */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Quantity <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              // value={product.productQuantity || 1}
                              onChange={(e) => handleProductChange(index, 'productQuantity', e.target.value)}
                              required
                              min="1"
                              // placeholder="1"
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 text-gray-900 placeholder-gray-400"
                            />
                          </div>

                          {/* Total Amount */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Total Amount
                            </label>
                            <input
                              type="text"
                              value={formatCurrency(product.productTotalAmount || 0)}
                              readOnly
                              className="w-full px-2 py-1.5 bg-gray-100 border border-gray-300 rounded text-gray-700 text-xs font-medium"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Delivery Charges and Grand Total */}
              <div className="border-t border-gray-200 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="deliveryCharges" className="block text-xs font-medium text-gray-700 mb-1">
                      Delivery Charges ($)
                    </label>
                    <input
                      type="number" id="deliveryCharges" name="deliveryCharges"
                      value={formData.deliveryCharges || 0} onChange={handleInputChange}
                      min="0"  placeholder="0.00"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 text-gray-900 placeholder-gray-400" />
                  </div>
                  <div className="flex items-end">
                    <div className="w-full bg-linear-to-r from-blue-50 to-cyan-50 rounded border border-blue-200 p-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-700">Grand Total:</span>
                        <span className="text-lg font-bold text-blue-600">
                          {formatCurrency(calculateGrandTotal())}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button type="submit" disabled={loading}
                  className={`w-full py-2 px-4 rounded text-white font-medium text-sm transition duration-200 ${
                    loading ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-linear-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                  }`}>
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating Invoice...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Create Invoice
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceCreate;
