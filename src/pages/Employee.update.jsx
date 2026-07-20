// EmployeeUpdate.jsx - Redesigned with stock product dropdown for commission
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'https://bisni-ms-backend.onrender.com/api';

const EmployeeUpdate = () => {
  const [employees, setEmployees] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [formData, setFormData] = useState({
    employeeCategory: '',
    employeeName: '',
    employeeAddress: '',
    employeeMobileNumber: '',
    employeeCommission: []
  });

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
      setError('Failed to load employees.');
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

  // Get unique product names from stocks
  const getUniqueProductNames = () => {
    const names = stocks.map(stock => stock.productName);
    return [...new Set(names)].filter(Boolean).sort();
  };

  // Get selected product names
  const getSelectedProductNames = () => {
    return formData.employeeCommission
      .filter(comm => comm.productName)
      .map(comm => comm.productName);
  };

  // Get available products (not already selected)
  const getAvailableProductNames = () => {
    const selected = getSelectedProductNames();
    return getUniqueProductNames().filter(name => !selected.includes(name));
  };

  const handleSelectEmployee = (employee) => {
    setSelectedEmployee(employee);
    setFormData({
      employeeCategory: employee.employeeCategory || '',
      employeeName: employee.employeeName || '',
      employeeAddress: employee.employeeAddress || '',
      employeeMobileNumber: employee.employeeMobileNumber || '',
      employeeCommission: employee.employeeCommission ? employee.employeeCommission.map(comm => ({
        productId: comm.productId || '',
        productName: comm.productName || '',
        commissionAmount: comm.commissionAmount || ''
      })) : []
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
  };

  const addCommission = () => {
    const available = getAvailableProductNames();
    if (available.length === 0) {
      setError('All products have been assigned a commission rate.');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      employeeCommission: [
        ...prev.employeeCommission,
        { productId: '', productName: '', commissionAmount: '' }
      ]
    }));
  };

  const removeCommission = (index) => {
    setFormData(prev => ({
      ...prev,
      employeeCommission: prev.employeeCommission.filter((_, i) => i !== index)
    }));
  };

  const handleCommissionChange = (index, field, value) => {
    const updatedCommissions = [...formData.employeeCommission];
    
    if (field === 'productName') {
      const selectedStock = stocks.find(stock => stock.productName === value);
      updatedCommissions[index] = {
        ...updatedCommissions[index],
        productName: value,
        productId: selectedStock ? selectedStock._id : ''
      };
    } else {
      updatedCommissions[index] = { ...updatedCommissions[index], [field]: value };
    }
    
    setFormData(prev => ({ ...prev, employeeCommission: updatedCommissions }));
  };

  const hasChanges = () => {
    if (!selectedEmployee) return false;
    const original = selectedEmployee;
    const current = formData;
    
    if (current.employeeCategory !== original.employeeCategory) return true;
    if (current.employeeName !== original.employeeName) return true;
    if (current.employeeAddress !== original.employeeAddress) return true;
    if (current.employeeMobileNumber !== original.employeeMobileNumber) return true;
    
    const origCommissions = original.employeeCommission || [];
    const currCommissions = current.employeeCommission || [];
    if (origCommissions.length !== currCommissions.length) return true;
    
    for (let i = 0; i < currCommissions.length; i++) {
      if (currCommissions[i].productName !== origCommissions[i]?.productName) return true;
      if (parseFloat(currCommissions[i].commissionAmount) !== origCommissions[i]?.commissionAmount) return true;
    }
    return false;
  };

  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    if (!selectedEmployee) { setError('Please select an employee'); return; }

    const validCommissions = formData.employeeCommission.filter(
      comm => comm.productName && comm.commissionAmount && parseFloat(comm.commissionAmount) > 0
    );

    setUpdateLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const updateData = {
        employeeCategory: formData.employeeCategory,
        employeeName: formData.employeeName,
        employeeAddress: formData.employeeAddress,
        employeeMobileNumber: formData.employeeMobileNumber,
        employeeCommission: validCommissions.map(comm => ({
          productId: comm.productId,
          productName: comm.productName,
          commissionAmount: parseFloat(comm.commissionAmount)
        }))
      };

      const response = await axios.put(`${API_BASE_URL}/employee/${selectedEmployee._id}`, updateData);
      setSuccess(response.data.message || 'Employee updated successfully!');
      
      setEmployees(prev => prev.map(emp => emp._id === selectedEmployee._id ? response.data.data : emp));
      setSelectedEmployee(response.data.data);
      
      setFormData({
        employeeCategory: response.data.data.employeeCategory || '',
        employeeName: response.data.data.employeeName || '',
        employeeAddress: response.data.data.employeeAddress || '',
        employeeMobileNumber: response.data.data.employeeMobileNumber || '',
        employeeCommission: response.data.data.employeeCommission ? response.data.data.employeeCommission.map(comm => ({
          productId: comm.productId || '',
          productName: comm.productName || '',
          commissionAmount: comm.commissionAmount || ''
        })) : []
      });
    } catch (error) {
      console.error('Error updating employee:', error);
      setError(error.response?.data?.message || 'Failed to update employee.');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleCancelUpdate = () => {
    setSelectedEmployee(null);
    setFormData({
      employeeCategory: '', employeeName: '', employeeAddress: '',
      employeeMobileNumber: '', employeeCommission: []
    });
    setError(null); setSuccess(null);
  };

  const clearMessages = () => { setError(null); setSuccess(null); };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    }).format(amount || 0);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 py-5 px-3 sm:px-4 lg:px-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-5">
          <h1 className="text-xl font-bold text-gray-900 mb-1">UPDATE EMPLOYEE</h1>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="mb-3 bg-red-50 border-l-4 border-red-500 p-2.5 rounded-r-lg text-xs">
            <div className="flex">
              <span className="mr-2">❌</span>
              <p className="text-red-700 flex-1">{error}</p>
              <button onClick={clearMessages} className="text-red-400 hover:text-red-600">✕</button>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-3 bg-green-50 border-l-4 border-green-500 p-2.5 rounded-r-lg text-xs">
            <div className="flex">
              <span className="mr-2">✅</span>
              <p className="text-green-700 flex-1">{success}</p>
              <button onClick={clearMessages} className="text-green-400 hover:text-green-600">✕</button>
            </div>
          </div>
        )}

        {/* Employee Selection Panel */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
          <div className="bg-linear-to-r from-blue-600 to-cyan-600 px-4 py-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <h2 className="text-sm font-semibold text-white">Select Employee</h2>
            <button onClick={fetchEmployees}
              className="px-2.5 py-1 bg-white text-blue-600 rounded-md hover:bg-gray-100 text-xs font-medium w-full sm:w-auto">
              🔄 Refresh
            </button>
          </div>

          <div className="p-2.5">
            {fetchLoading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : employees.length === 0 ? (
              <div className="text-center py-6">
                <span className="text-2xl">👥</span>
                <p className="mt-1 text-xs text-gray-500">No employees available</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {employees.map((employee) => (
                  <button
                    key={employee._id}
                    onClick={() => handleSelectEmployee(employee)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-left transition duration-150 ${
                      selectedEmployee?._id === employee._id
                        ? 'bg-blue-50 border-2 border-blue-500 shadow-sm'
                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    <div className={`shrink-0 h-7 w-7 rounded-full flex items-center justify-center ${
                      selectedEmployee?._id === employee._id
                        ? 'bg-linear-to-r from-blue-500 to-cyan-500'
                        : 'bg-linear-to-r from-gray-400 to-gray-500'
                    }`}>
                      <span className="text-white font-bold text-xs">
                        {employee.employeeName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium truncate ${selectedEmployee?._id === employee._id ? 'text-blue-900' : 'text-gray-900'}`}>
                        {employee.employeeName}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{employee.employeeCategory}</p>
                    </div>
                    {selectedEmployee?._id === employee._id && (
                      <svg className="w-4 h-4 text-blue-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Update Form */}
        <div id="updateForm">
          {!selectedEmployee ? (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="text-center py-12">
                <span className="text-3xl">✏️</span>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No Employee Selected</h3>
                <p className="mt-1 text-xs text-gray-500">Select an employee above to update their details.</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-linear-to-r from-blue-600 to-cyan-600 px-4 py-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-white">Update Employee</h2>
                  <p className="text-blue-100 text-xs">Editing: {selectedEmployee.employeeName}</p>
                </div>
                <button onClick={handleCancelUpdate}
                  className="px-2.5 py-1 bg-white text-gray-700 rounded-md hover:bg-gray-100 text-xs font-medium w-full sm:w-auto">
                  Cancel
                </button>
              </div>

              <form onSubmit={handleUpdateEmployee} className="p-4 space-y-4">
                {/* Basic Information - Responsive Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <input type="text" name="employeeCategory" value={formData.employeeCategory}
                      onChange={handleInputChange} required placeholder="e.g., Sales"
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500" />
                    {formData.employeeCategory !== selectedEmployee.employeeCategory && (
                      <p className="mt-0.5 text-xs text-blue-600">Was: {selectedEmployee.employeeCategory}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input type="text" name="employeeName" value={formData.employeeName}
                      onChange={handleInputChange} required placeholder="Full name"
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500" />
                    {formData.employeeName !== selectedEmployee.employeeName && (
                      <p className="mt-0.5 text-xs text-blue-600">Was: {selectedEmployee.employeeName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Mobile <span className="text-red-500">*</span>
                    </label>
                    <input type="tel" name="employeeMobileNumber" value={formData.employeeMobileNumber}
                      onChange={handleInputChange} required placeholder="Mobile number"
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500" />
                    {formData.employeeMobileNumber !== selectedEmployee.employeeMobileNumber && (
                      <p className="mt-0.5 text-xs text-blue-600">Was: {selectedEmployee.employeeMobileNumber}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Address <span className="text-red-500">*</span>
                    </label>
                    <input type="text" name="employeeAddress" value={formData.employeeAddress}
                      onChange={handleInputChange} required placeholder="Address"
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500" />
                    {formData.employeeAddress !== selectedEmployee.employeeAddress && (
                      <p className="mt-0.5 text-xs text-blue-600">Address modified</p>
                    )}
                  </div>
                </div>

                {/* Commission Section */}
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
                    <div>
                      <h3 className="text-xs font-semibold text-gray-700">Commission Rates</h3>
                      <p className="text-xs text-gray-400">{getAvailableProductNames().length} products available</p>
                    </div>
                    <button type="button" onClick={addCommission}
                      disabled={getAvailableProductNames().length === 0}
                      className="inline-flex items-center px-2.5 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-xs font-medium w-full sm:w-auto justify-center">
                      + Add Product
                    </button>
                  </div>

                  {formData.employeeCommission.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 rounded-md border-2 border-dashed border-gray-300">
                      <p className="text-xs text-gray-500">No commission rates added</p>
                      <p className="text-xs text-gray-400 mt-1">Click "Add Product" to assign commission from stock</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {formData.employeeCommission.map((commission, index) => {
                        // Products available for this specific dropdown (current selection + unselected)
                        const availableForThis = getUniqueProductNames().filter(
                          name => !getSelectedProductNames().includes(name) || name === commission.productName
                        );
                        
                        return (
                          <div key={index} className="bg-gray-50 rounded-md p-2.5 border border-gray-200 hover:border-blue-300 transition">
                            <div className="flex justify-between items-center mb-2">
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                                {index + 1}
                              </span>
                              <button type="button" onClick={() => removeCommission(index)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded p-0.5">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>

                            {/* Responsive Commission Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {/* Product Name - Dropdown from Stock */}
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-0.5">
                                  Product <span className="text-red-500">*</span>
                                </label>
                                <select
                                  value={commission.productName}
                                  onChange={(e) => handleCommissionChange(index, 'productName', e.target.value)}
                                  required
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500"
                                >
                                  <option value="">Select product</option>
                                  {availableForThis.map((name) => (
                                    <option key={name} value={name}>{name}</option>
                                  ))}
                                </select>
                                {commission.productName && (
                                  <p className="mt-0.5 text-xs text-blue-600">
                                    Same rate for all variants of this product
                                  </p>
                                )}
                              </div>

                              {/* Commission Amount */}
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-0.5">
                                  Commission/Unit (Rs.) <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="number"
                                  value={commission.commissionAmount}
                                  onChange={(e) => handleCommissionChange(index, 'commissionAmount', e.target.value)}
                                  required
                                  min="0"
                                  step="0.01"
                                  placeholder="0.00"
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500"
                                />
                                {commission.commissionAmount && parseFloat(commission.commissionAmount) > 0 && (
                                  <p className="mt-0.5 text-xs text-green-600 font-medium">
                                    Rs. {formatCurrency(parseFloat(commission.commissionAmount))}/unit
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Commission Summary */}
                  {formData.employeeCommission.some(c => c.productName && parseFloat(c.commissionAmount) > 0) && (
                    <div className="mt-3 bg-blue-50 rounded-md p-3 border border-blue-200">
                      <h4 className="text-xs font-semibold text-blue-900 mb-2">Commission Summary</h4>
                      <div className="space-y-1">
                        {formData.employeeCommission
                          .filter(c => c.productName && parseFloat(c.commissionAmount) > 0)
                          .map((comm, idx) => (
                            <div key={idx} className="flex justify-between text-xs">
                              <span className="text-blue-800">{comm.productName}</span>
                              <span className="font-medium text-blue-900">Rs. {formatCurrency(parseFloat(comm.commissionAmount))}/unit</span>
                            </div>
                          ))}
                        <div className="pt-2 mt-1 border-t border-blue-200 flex justify-between text-xs">
                          <span className="font-semibold text-blue-900">Total Rate:</span>
                          <span className="font-bold text-blue-900">
                            Rs. {formatCurrency(
                              formData.employeeCommission
                                .filter(c => c.productName && parseFloat(c.commissionAmount) > 0)
                                .reduce((sum, c) => sum + parseFloat(c.commissionAmount), 0)
                            )}/unit
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Change Summary */}
                {hasChanges() && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-2.5">
                    <p className="text-xs font-semibold text-blue-900">Changes detected - review before updating</p>
                  </div>
                )}

                {/* Action Buttons - Stack on mobile */}
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-1">
                  <button type="button" onClick={handleCancelUpdate} disabled={updateLoading}
                    className="py-2 px-3 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 text-xs font-medium disabled:opacity-50 w-full sm:flex-1">
                    Cancel
                  </button>
                  <button type="submit" disabled={updateLoading || !hasChanges()}
                    className={`py-2 px-3 rounded-md text-white text-xs font-medium transition w-full sm:flex-1 ${
                      updateLoading || !hasChanges() ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-linear-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700'
                    }`}>
                    {updateLoading ? 'Updating...' : 'Update Employee'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeUpdate;