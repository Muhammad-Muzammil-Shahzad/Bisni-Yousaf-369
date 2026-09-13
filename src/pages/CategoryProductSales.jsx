// CategoryProductSales.jsx - Category-wise employee product sales summary
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'https://bisni-ms-backend.onrender.com/api';

const CategoryProductSales = () => {
  const [invoices, setInvoices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [invoicesRes, employeesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/invoice`),
        axios.get(`${API_BASE_URL}/employee`)
      ]);

      setInvoices(invoicesRes.data.data || invoicesRes.data || []);
      setEmployees(employeesRes.data.data || employeesRes.data || []);
      setSuccess('Data loaded successfully');
    } catch (error) {
      let errorMessage = 'Failed to load data.';
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

  // Group by Category -> Employee -> Product -> Total Quantity
  const getGroupedData = () => {
    const grouped = {};

    invoices.forEach(invoice => {
      const category = invoice.employeeCategory || 'Uncategorized';
      const employee = invoice.employeeName || 'Unknown';

      if (!grouped[category]) {
        grouped[category] = {};
      }

      if (!grouped[category][employee]) {
        grouped[category][employee] = {};
      }

      (invoice.products || []).forEach(product => {
        const productName = product.productName || 'Unknown';
        if (!grouped[category][employee][productName]) {
          grouped[category][employee][productName] = 0;
        }
        grouped[category][employee][productName] += (product.productQuantity || 0);
      });
    });

    return grouped;
  };

  const groupedData = getGroupedData();

  const formatNumber = (num) => new Intl.NumberFormat('en-US').format(num || 0);

  const clearMessages = () => { setError(null); setSuccess(null); };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 py-3 sm:py-4 md:py-5 px-2 sm:px-3 md:px-4 lg:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-5">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
            CATEGORY-WISE PRODUCT SALES
          </h1>
          <p className="text-xs text-gray-600">
            Har category ke employee ka specific product total sale
          </p>
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

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Empty */}
        {!loading && Object.keys(groupedData).length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <span className="text-3xl">📊</span>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No Sales Data</h3>
            <p className="mt-1 text-xs text-gray-500">Koi invoice nahi mila.</p>
            <button onClick={fetchData} className="mt-3 px-4 py-1.5 bg-blue-600 text-white rounded-md text-xs">
              🔄 Refresh
            </button>
          </div>
        )}

        {/* Data Display */}
        {!loading && Object.keys(groupedData).length > 0 && (
          <div className="space-y-4 sm:space-y-5">
            {Object.entries(groupedData).map(([category, employeesData]) => (
              <div key={category} className="bg-white rounded-lg shadow-md overflow-hidden">
                {/* Category Header */}
                <div className="bg-linear-to-r from-blue-600 to-cyan-600 px-3 sm:px-4 py-2 sm:py-2.5">
                  <h2 className="text-sm font-semibold text-white">
                    📁 {category}
                  </h2>
                </div>

                <div className="p-2 sm:p-3">
                  {Object.entries(employeesData).map(([employeeName, productsData]) => {
                    const totalItems = Object.values(productsData).reduce((sum, qty) => sum + qty, 0);

                    return (
                      <div key={employeeName} className="mb-3 last:mb-0">
                        {/* Employee Header */}
                        <div className="flex items-center justify-between mb-2 pb-1 border-b border-gray-200">
                          <h3 className="text-xs font-semibold text-gray-900">
                            👤 {employeeName}
                          </h3>
                          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                            Total: {formatNumber(totalItems)} items
                          </span>
                        </div>

                        {/* Products Table */}
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200 text-xs">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-1.5 text-left font-medium text-gray-500">
                                  Product Name
                                </th>
                                <th className="px-3 py-1.5 text-center font-medium text-gray-500 w-24">
                                  Total Sold
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {Object.entries(productsData)
                                .sort((a, b) => b[1] - a[1])
                                .map(([productName, quantity]) => (
                                  <tr key={productName} className="hover:bg-gray-50">
                                    <td className="px-3 py-1.5 text-gray-900 font-medium">
                                      {productName}
                                    </td>
                                    <td className="px-3 py-1.5 text-center font-bold text-green-600">
                                      {formatNumber(quantity)}
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryProductSales;
