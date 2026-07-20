// EmployeeDelete.jsx - Compact redesigned component for deleting employees
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = 'https://bisni-ms-backend.onrender.com/api';

const EmployeeDelete = () => {
  const [employees, setEmployees] = useState([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      setFetchLoading(true);
      setError(null);
      
      const response = await axios.get(`${API_BASE_URL}/employee`, { timeout: 10000 });
      const employeeData = response.data.data || response.data || [];
      setEmployees(employeeData);
      setSuccess(`Loaded ${employeeData.length} employee(s)`);
    } catch (error) {
      console.error('Error fetching employees:', error);
      let errorMessage = 'Failed to load employees.';
      if (error.response) {
        errorMessage = error.response.data?.message || `Server error (${error.response.status})`;
      } else if (error.request) {
        errorMessage = 'Cannot connect to server. Please check if backend is running.';
      } else {
        errorMessage = `Error: ${error.message}`;
      }
      setError(errorMessage);
    } finally {
      setFetchLoading(false);
    }
  }, []);

  const getUniqueCategories = () => {
    const categories = employees.map(emp => emp.employeeCategory);
    return ['all', ...new Set(categories)].filter(Boolean);
  };

  const getFilteredEmployees = () => {
    let filtered = [...employees];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(emp =>
        emp.employeeName?.toLowerCase().includes(term) ||
        emp.employeeCategory?.toLowerCase().includes(term) ||
        emp.employeeMobileNumber?.includes(term)
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(emp => emp.employeeCategory === categoryFilter);
    }

    return filtered;
  };

  const filteredEmployees = getFilteredEmployees();

  const toggleEmployeeSelection = (employeeId) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId) ? prev.filter(id => id !== employeeId) : [...prev, employeeId]
    );
  };

  const handleDeleteClick = (employee) => {
    setSelectedEmployee(employee);
    setDeleteConfirm({ type: 'single', employee });
  };

  const handleBulkDeleteClick = () => {
    if (selectedEmployees.length === 0) {
      setError('Please select at least one employee to delete');
      return;
    }
    const selected = employees.filter(emp => selectedEmployees.includes(emp._id));
    setDeleteConfirm({ type: 'bulk', employees: selected, count: selected.length });
  };

  const executeDelete = async () => {
    if (!deleteConfirm) return;

    setDeleteLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (deleteConfirm.type === 'single') {
        const employeeId = deleteConfirm.employee._id;
        await axios.delete(`${API_BASE_URL}/employee/${employeeId}`, { timeout: 10000 });
        
        setSuccess(`"${deleteConfirm.employee.employeeName}" deleted successfully!`);
        setEmployees(prev => prev.filter(emp => emp._id !== employeeId));
        setSelectedEmployees(prev => prev.filter(id => id !== employeeId));
        
      } else if (deleteConfirm.type === 'bulk') {
        let deletedCount = 0;
        let failedCount = 0;
        const failedItems = [];
        
        for (const employee of deleteConfirm.employees) {
          try {
            await axios.delete(`${API_BASE_URL}/employee/${employee._id}`, { timeout: 10000 });
            deletedCount++;
          } catch (error) {
            failedCount++;
            failedItems.push(employee.employeeName);
          }
        }
        
        const deletedIds = deleteConfirm.employees.map(e => e._id);
        setEmployees(prev => prev.filter(emp => !deletedIds.includes(emp._id)));
        setSelectedEmployees([]);
        
        if (failedCount === 0) {
          setSuccess(`Successfully deleted ${deletedCount} employee(s)!`);
        } else {
          setSuccess(`Deleted ${deletedCount} employee(s). Failed: ${failedCount} (${failedItems.join(', ')})`);
        }
      }
    } catch (error) {
      let errorMessage = 'Failed to delete employee(s).';
      if (error.response) {
        if (error.response.status === 404) {
          errorMessage = 'Employee not found. They may have been already deleted.';
        } else {
          errorMessage = error.response.data?.message || `Server error (${error.response.status})`;
        }
      } else if (error.request) {
        errorMessage = 'Cannot connect to server. Please check if backend is running.';
      } else {
        errorMessage = `Error: ${error.message}`;
      }
      setError(errorMessage);
    } finally {
      setDeleteLoading(false);
      setDeleteConfirm(null);
      setSelectedEmployee(null);
    }
  };

  const clearMessages = () => { setError(null); setSuccess(null); };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 py-5 px-3 sm:px-4 lg:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-5">
          <h1 className="text-xl font-bold text-gray-900 mb-1">DELETE EMPLOYEE</h1>
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

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
          <div className="bg-linear-to-r from-red-600 to-red-700 px-4 py-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <h2 className="text-sm font-semibold text-white">
              Employee List ({filteredEmployees.length})
            </h2>
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              {selectedEmployees.length > 0 && (
                <button onClick={handleBulkDeleteClick}
                  className="px-2.5 py-1 bg-white text-red-600 rounded-md hover:bg-red-50 border border-red-300 text-xs font-medium w-full sm:w-auto">
                  🗑️ Delete ({selectedEmployees.length})
                </button>
              )}
            </div>
          </div>

          <div className="p-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="relative">
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, category, mobile..."
                  className="w-full pl-8 pr-2.5 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-red-500 text-xs" />
                <svg className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-red-500 text-xs">
                <option value="all">All Categories</option>
                {getUniqueCategories().filter(c => c !== 'all').map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {fetchLoading && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!fetchLoading && employees.length === 0 && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="text-center py-12">
              <span className="text-3xl">👥</span>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No Employees Found</h3>
              <p className="mt-1 text-xs text-gray-500">There are no employees to display.</p>
            </div>
          </div>
        )}

        {/* Employee Table - Desktop View (hidden on mobile) */}
        {!fetchLoading && employees.length > 0 && (
          <>
            {/* Desktop Table View */}
            <div className="hidden sm:block bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2.5 py-2 text-center w-10">
                        <input type="checkbox"
                          checked={selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0}
                          onChange={() => {
                            if (selectedEmployees.length === filteredEmployees.length) {
                              setSelectedEmployees([]);
                            } else {
                              setSelectedEmployees(filteredEmployees.map(e => e._id));
                            }
                          }}
                          className="h-3.5 w-3.5 text-red-600 focus:ring-red-500 border-gray-300 rounded" />
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Mobile</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredEmployees.map((employee) => {
                      const isSelected = selectedEmployees.includes(employee._id);
                      
                      return (
                        <tr key={employee._id} 
                          className={`hover:bg-gray-50 transition duration-150 ${isSelected ? 'bg-red-50' : ''}`}>
                          <td className="px-2.5 py-2 text-center">
                            <input type="checkbox" checked={isSelected}
                              onChange={() => toggleEmployeeSelection(employee._id)}
                              className="h-3.5 w-3.5 text-red-600 focus:ring-red-500 border-gray-300 rounded" />
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className={`shrink-0 h-7 w-7 rounded-full flex items-center justify-center ${
                                isSelected ? 'bg-linear-to-r from-red-500 to-red-600' : 'bg-linear-to-r from-blue-500 to-cyan-500'
                              }`}>
                                <span className="text-white font-bold text-xs">
                                  {employee.employeeName?.charAt(0)?.toUpperCase() || '?'}
                                </span>
                              </div>
                              <span className="ml-2 text-xs font-medium text-gray-900">{employee.employeeName}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className="px-1.5 py-0.5 inline-flex text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {employee.employeeCategory || 'N/A'}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500 hidden md:table-cell">
                            {employee.employeeMobileNumber || 'N/A'}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-right">
                            <button onClick={() => handleDeleteClick(employee)}
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

              {/* No results after filtering */}
              {filteredEmployees.length === 0 && (
                <div className="text-center py-8">
                  <span className="text-xl">🔍</span>
                  <p className="mt-1 text-xs text-gray-500">No employees match your filters</p>
                  <button onClick={() => { setSearchTerm(''); setCategoryFilter('all'); }}
                    className="mt-1 text-xs text-blue-600 hover:text-blue-800">Clear filters</button>
                </div>
              )}
            </div>

            {/* Mobile Card View (visible only on mobile) */}
            <div className="sm:hidden space-y-3">
              {filteredEmployees.map((employee) => {
                const isSelected = selectedEmployees.includes(employee._id);
                
                return (
                  <div key={employee._id} 
                    className={`bg-white rounded-lg shadow-md overflow-hidden border-2 transition ${
                      isSelected ? 'border-red-500 bg-red-50' : 'border-gray-200'
                    }`}>
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={isSelected}
                            onChange={() => toggleEmployeeSelection(employee._id)}
                            className="h-3.5 w-3.5 text-red-600 focus:ring-red-500 border-gray-300 rounded" />
                          <div className={`shrink-0 h-7 w-7 rounded-full flex items-center justify-center ${
                            isSelected ? 'bg-linear-to-r from-red-500 to-red-600' : 'bg-linear-to-r from-blue-500 to-cyan-500'
                          }`}>
                            <span className="text-white font-bold text-xs">
                              {employee.employeeName?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                          </div>
                          <span className="text-xs font-medium text-gray-900">{employee.employeeName}</span>
                        </div>
                        <button onClick={() => handleDeleteClick(employee)}
                          className="inline-flex items-center px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 text-xs font-medium">
                          <svg className="w-3.5 h-3.5 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Del
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">Category:</span>
                          <span className="ml-1 px-1.5 py-0.5 inline-flex text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {employee.employeeCategory || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Mobile:</span>
                          <span className="ml-1 text-gray-900">{employee.employeeMobileNumber || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {filteredEmployees.length === 0 && (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                  <span className="text-xl">🔍</span>
                  <p className="mt-1 text-xs text-gray-500">No employees match your filters</p>
                  <button onClick={() => { setSearchTerm(''); setCategoryFilter('all'); }}
                    className="mt-1 text-xs text-blue-600 hover:text-blue-800">Clear filters</button>
                </div>
              )}
            </div>

            {/* Selection Summary */}
            {selectedEmployees.length > 0 && (
              <div className="bg-red-50 border-t border-red-200 px-3 py-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mt-3 sm:mt-0 rounded-lg sm:rounded-none">
                <span className="text-xs font-medium text-red-700">
                  ⚠️ {selectedEmployees.length} selected for deletion
                </span>
                <div className="flex space-x-2 w-full sm:w-auto">
                  <button onClick={() => setSelectedEmployees([])}
                    className="px-2.5 py-1 bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50 text-xs font-medium flex-1 sm:flex-none">
                    Clear
                  </button>
                  <button onClick={handleBulkDeleteClick}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs font-medium flex-1 sm:flex-none">
                    🗑️ Delete
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-[85vh] overflow-y-auto">
              <div className="p-4">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                
                <h3 className="mt-3 text-base font-bold text-gray-900 text-center">Confirm Deletion</h3>
                
                {deleteConfirm.type === 'single' ? (
                  <div className="mt-3">
                    <p className="text-xs text-gray-600 text-center">Are you sure you want to delete this employee?</p>
                    {deleteConfirm.employee && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-md">
                        <div className="flex items-center space-x-2.5">
                          <div className="shrink-0 h-10 w-10 bg-linear-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-sm">
                              {deleteConfirm.employee.employeeName?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900">{deleteConfirm.employee.employeeName}</h4>
                            <p className="text-xs text-gray-500">
                              {deleteConfirm.employee.employeeCategory} • {deleteConfirm.employee.employeeMobileNumber}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-3">
                    <p className="text-xs text-gray-600 text-center">
                      You are about to delete <span className="font-bold text-red-600">{deleteConfirm.count} employee(s)</span>.
                    </p>
                    <div className="mt-3 max-h-36 overflow-y-auto space-y-1.5">
                      {deleteConfirm.employees.map((emp, index) => (
                        <div key={emp._id} className="flex justify-between items-center p-2 bg-gray-50 rounded text-xs">
                          <span className="font-medium">{emp.employeeName}</span>
                          <span className="text-gray-500">{emp.employeeCategory}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-xs text-red-800">⚠️ This action cannot be undone. All employee data will be permanently removed.</p>
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-2.5 rounded-b-lg flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                <button onClick={() => { setDeleteConfirm(null); setSelectedEmployee(null); }}
                  disabled={deleteLoading}
                  className="px-3 py-1.5 bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50 text-xs font-medium disabled:opacity-50 w-full sm:w-auto">
                  Cancel
                </button>
                <button onClick={executeDelete} disabled={deleteLoading}
                  className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 text-xs font-medium disabled:opacity-50 w-full sm:w-auto">
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

export default EmployeeDelete;