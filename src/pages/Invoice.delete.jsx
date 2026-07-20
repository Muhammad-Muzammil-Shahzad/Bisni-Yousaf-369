// InvoiceDelete.jsx - Compact redesigned component for deleting invoices
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'https://bisni-ms-backend.onrender.com/api';

const InvoiceDelete = () => {
  const [invoices, setInvoices] = useState([]);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  
  const [filters, setFilters] = useState({
    employeeCategory: '',
    customerName: '',
    customerMobileNumber: '',
    invoiceId: '',
    date: '',
    startDate: '',
    endDate: '',
    employeeName: ''
  });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const searchInvoices = async () => {
    const hasFilter = Object.values(filters).some(value => value.trim() !== '');
    if (!hasFilter) {
      setError('Please provide at least one filter criteria');
      return;
    }

    setFetchLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });
      
      const response = await axios.get(`${API_BASE_URL}/invoice?${params.toString()}`);
      const foundInvoices = response.data.data || response.data || [];
      setInvoices(foundInvoices);
      
      if (foundInvoices.length === 0) {
        setError('No invoices found matching your criteria');
      } else {
        setSuccess(`${foundInvoices.length} invoice(s) found`);
      }
      setSelectedInvoices([]);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to search invoices.');
    } finally {
      setFetchLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      employeeCategory: '', customerName: '', customerMobileNumber: '',
      invoiceId: '', date: '', startDate: '', endDate: '', employeeName: ''
    });
    setInvoices([]);
    setSelectedInvoices([]);
    setError(null);
    setSuccess(null);
  };

  const toggleSelectInvoice = (invoiceId) => {
    setSelectedInvoices(prev => 
      prev.includes(invoiceId) ? prev.filter(id => id !== invoiceId) : [...prev, invoiceId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedInvoices.length === invoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(invoices.map(inv => inv.invoiceId));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedInvoices.length === 0) {
      setError('Please select at least one invoice to delete');
      return;
    }
    setDeleteConfirm('selected');
  };

  const handleDeleteByFilter = () => {
    const hasFilter = Object.values(filters).some(value => value.trim() !== '');
    if (!hasFilter) {
      setError('Please provide filter criteria to delete invoices');
      return;
    }
    setDeleteConfirm('filter');
  };

  const executeDelete = async (deleteType) => {
    setDeleteLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (deleteType === 'selected') {
        let deletedCount = 0;
        for (const invoiceId of selectedInvoices) {
          try {
            await axios.delete(`${API_BASE_URL}/invoice?invoiceId=${invoiceId}`);
            deletedCount++;
          } catch (error) {
            console.error(`Error deleting invoice ${invoiceId}:`, error);
          }
        }
        setSuccess(`Successfully deleted ${deletedCount} invoice(s)`);
        setInvoices(prev => prev.filter(inv => !selectedInvoices.includes(inv.invoiceId)));
        setSelectedInvoices([]);
      } else if (deleteType === 'filter') {
        const params = new URLSearchParams();
        Object.keys(filters).forEach(key => {
          if (filters[key]) params.append(key, filters[key]);
        });
        const response = await axios.delete(`${API_BASE_URL}/invoice?${params.toString()}`);
        const deletedCount = response.data.deletedCount || 0;
        setSuccess(`Successfully deleted ${deletedCount} invoice(s) matching your criteria`);
        searchInvoices();
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to delete invoices.');
    } finally {
      setDeleteLoading(false);
      setDeleteConfirm(null);
    }
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
      style: 'currency', currency: 'USD'
    }).format(amount || 0);
  };

  const calculateTotalItems = (products) => {
    return products.reduce((sum, p) => sum + (p.productQuantity || 0), 0);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 py-5 px-3 sm:px-4 lg:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-5">
          <h1 className="text-xl font-bold text-gray-900 mb-1">DELETE INVOICES</h1>
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

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
          <div className="bg-linear-to-r from-red-600 to-red-700 px-4 py-2">
            <h2 className="text-sm font-semibold text-white flex items-center">
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filter Criteria for Deletion
            </h2>
          </div>

          <div className="p-3">
            {/* Responsive Filter Grid: 1 col mobile, 2 col tablet, 3 col medium, 4 col desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">Invoice ID</label>
                <input type="text" name="invoiceId" value={filters.invoiceId} onChange={handleFilterChange}
                  placeholder="e.g., INV-20260113-0001"
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-red-500 text-xs" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">Employee Name</label>
                <input type="text" name="employeeName" value={filters.employeeName} onChange={handleFilterChange}
                  placeholder="Search by employee"
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-red-500 text-xs" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">Employee Category</label>
                <input type="text" name="employeeCategory" value={filters.employeeCategory} onChange={handleFilterChange}
                  placeholder="e.g., Sales, Manager"
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-red-500 text-xs" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">Customer Name</label>
                <input type="text" name="customerName" value={filters.customerName} onChange={handleFilterChange}
                  placeholder="Search by customer"
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-red-500 text-xs" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">Customer Mobile</label>
                <input type="text" name="customerMobileNumber" value={filters.customerMobileNumber} onChange={handleFilterChange}
                  placeholder="Enter mobile number"
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-red-500 text-xs" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">Specific Date</label>
                <input type="date" name="date" value={filters.date} onChange={handleFilterChange}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-red-500 text-xs" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">Start Date</label>
                <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-red-500 text-xs" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">End Date</label>
                <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-red-500 text-xs" />
              </div>
            </div>

            {/* Action Buttons: Stack on mobile */}
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
              <button onClick={clearFilters}
                className="px-3 py-1.5 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 text-xs font-medium w-full sm:w-auto">
                Clear All
              </button>
              <button onClick={searchInvoices} disabled={fetchLoading}
                className="px-4 py-1.5 bg-linear-to-r from-blue-600 to-cyan-600 text-white rounded-md hover:from-blue-700 hover:to-cyan-700 text-xs font-medium disabled:opacity-50 w-full sm:w-auto">
                {fetchLoading ? 'Searching...' : 'Search Invoices'}
              </button>
            </div>
          </div>
        </div>

        {/* Search Results */}
        {invoices.length > 0 && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
            {/* Header with actions */}
            <div className="bg-linear-to-r from-red-600 to-red-700 px-4 py-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <h2 className="text-sm font-semibold text-white">Search Results ({invoices.length})</h2>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                <button onClick={toggleSelectAll}
                  className="px-2.5 py-1 bg-white text-gray-700 rounded-md hover:bg-gray-100 text-xs font-medium w-full sm:w-auto">
                  {selectedInvoices.length === invoices.length ? 'Deselect All' : 'Select All'}
                </button>
                <button onClick={handleDeleteSelected} disabled={selectedInvoices.length === 0}
                  className="px-2.5 py-1 bg-red-800 text-white rounded-md hover:bg-red-900 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto">
                  🗑️ Delete ({selectedInvoices.length})
                </button>
              </div>
            </div>

            {/* Desktop Table View (hidden on mobile) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2.5 py-2 text-center w-10">
                      <input type="checkbox"
                        checked={selectedInvoices.length === invoices.length && invoices.length > 0}
                        onChange={toggleSelectAll}
                        className="h-3.5 w-3.5 text-red-600 focus:ring-red-500 border-gray-300 rounded" />
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Invoice ID</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Customer</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Employee</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase hidden xl:table-cell">Items</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Grand Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map((invoice) => (
                    <tr key={invoice._id} 
                      className={`hover:bg-gray-50 transition duration-150 ${selectedInvoices.includes(invoice.invoiceId) ? 'bg-red-50' : ''}`}>
                      <td className="px-2.5 py-2 text-center">
                        <input type="checkbox" checked={selectedInvoices.includes(invoice.invoiceId)}
                          onChange={() => toggleSelectInvoice(invoice.invoiceId)}
                          className="h-3.5 w-3.5 text-red-600 focus:ring-red-500 border-gray-300 rounded" />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="shrink-0 h-7 w-7 bg-linear-to-r from-red-500 to-red-600 rounded flex items-center justify-center">
                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <span className="ml-2 text-xs font-medium text-gray-900">{invoice.invoiceId}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500 hidden md:table-cell">{formatDate(invoice.createdAt)}</td>
                      <td className="px-3 py-2 whitespace-nowrap hidden lg:table-cell">
                        <div className="text-xs font-medium text-gray-900">{invoice.customerName}</div>
                        <div className="text-xs text-gray-500">{invoice.customerMobileNumber1}</div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap hidden lg:table-cell">
                        <div className="text-xs text-gray-900">{invoice.employeeName}</div>
                        <div className="text-xs text-gray-500">{invoice.employeeCategory}</div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-center hidden xl:table-cell">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {calculateTotalItems(invoice.products)}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right text-xs font-bold text-green-600">
                        {formatCurrency(invoice.grandTotalAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (visible only on mobile) */}
            <div className="sm:hidden space-y-2 p-3">
              {invoices.map((invoice) => (
                <div key={invoice._id} 
                  className={`bg-white rounded-md border-2 p-3 transition ${
                    selectedInvoices.includes(invoice.invoiceId) ? 'border-red-500 bg-red-50' : 'border-gray-200'
                  }`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={selectedInvoices.includes(invoice.invoiceId)}
                        onChange={() => toggleSelectInvoice(invoice.invoiceId)}
                        className="h-3.5 w-3.5 text-red-600 focus:ring-red-500 border-gray-300 rounded" />
                      <div className="shrink-0 h-7 w-7 bg-linear-to-r from-red-500 to-red-600 rounded flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-900">{invoice.invoiceId}</span>
                        <p className="text-[10px] text-gray-500">{formatDate(invoice.createdAt)}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-green-600">{formatCurrency(invoice.grandTotalAmount)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Customer:</span>
                      <span className="ml-1 text-gray-900 font-medium">{invoice.customerName}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Employee:</span>
                      <span className="ml-1 text-gray-900">{invoice.employeeName}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Items:</span>
                      <span className="ml-1 px-1.5 py-0.5 inline-flex text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {calculateTotalItems(invoice.products)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Category:</span>
                      <span className="ml-1 text-gray-900">{invoice.employeeCategory}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer with actions */}
            <div className="bg-gray-50 px-3 py-2 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="text-xs text-gray-600">
                {selectedInvoices.length > 0 ? (
                  <span className="font-medium text-red-600">{selectedInvoices.length} selected for deletion</span>
                ) : (
                  <span>Select invoices or use filter-based deletion</span>
                )}
              </div>
              <button onClick={handleDeleteByFilter}
                className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 text-xs font-medium w-full sm:w-auto">
                🗑️ Delete All Matching Filters
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!fetchLoading && invoices.length === 0 && !error && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <h3 className="mt-3 text-base font-medium text-gray-900">No Invoices to Display</h3>
              <p className="mt-1 text-xs text-gray-500">Use the filters above to search for invoices you want to delete.</p>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                
                <h3 className="mt-3 text-base font-bold text-gray-900 text-center">Confirm Deletion</h3>
                
                {deleteConfirm === 'selected' ? (
                  <div className="mt-3">
                    <p className="text-xs text-gray-600 text-center">
                      You are about to delete <span className="font-bold text-red-600">{selectedInvoices.length} selected invoice(s)</span>.
                    </p>
                    <div className="mt-2 p-2.5 bg-red-50 rounded-md">
                      <p className="text-xs text-red-800">⚠️ This action cannot be undone. All invoice data will be permanently removed.</p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3">
                    <p className="text-xs text-gray-600 text-center">
                      You are about to delete <span className="font-bold text-red-600">all invoices matching your filter criteria</span>.
                    </p>
                    <div className="mt-2 p-2.5 bg-red-50 rounded-md">
                      <p className="text-xs text-red-800">⚠️ This will delete ALL matching invoices. This action cannot be undone.</p>
                    </div>
                    <div className="mt-2 p-2.5 bg-gray-50 rounded-md">
                      <p className="text-xs font-medium text-gray-700 mb-1">Applied Filters:</p>
                      <div className="space-y-0.5">
                        {Object.entries(filters).map(([key, value]) => 
                          value ? (
                            <div key={key} className="flex justify-between text-xs">
                              <span className="text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                              <span className="font-medium text-gray-900">{value}</span>
                            </div>
                          ) : null
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Modal Buttons: Stack on mobile */}
              <div className="bg-gray-50 px-4 py-2.5 rounded-b-lg flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                <button onClick={() => setDeleteConfirm(null)} disabled={deleteLoading}
                  className="px-3 py-1.5 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 text-xs font-medium disabled:opacity-50 w-full sm:w-auto">
                  Cancel
                </button>
                <button onClick={() => executeDelete(deleteConfirm)} disabled={deleteLoading}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 text-xs font-medium disabled:opacity-50 w-full sm:w-auto">
                  {deleteLoading ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceDelete;