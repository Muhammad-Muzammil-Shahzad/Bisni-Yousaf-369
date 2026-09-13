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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-4 px-2 sm:px-4 lg:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
            CATEGORY-WISE PRODUCT SALES
          </h1>
          <p className="text-sm text-gray-600">
            Employee-wise product sales summary by category
          </p>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-3 rounded-r-lg text-sm">
            <div className="flex items-start">
              <span className="mr-2 shrink-0">❌</span>
              <p className="text-red-700 flex-1 break-words">{error}</p>
              <button onClick={clearMessages} className="text-red-400 hover:text-red-600 shrink-0 ml-2">✕</button>
            </div>
          </div>
        )}
        {success && (
          <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-3 rounded-r-lg text-sm">
            <div className="flex items-start">
              <span className="mr-2 shrink-0">✅</span>
              <p className="text-green-700 flex-1 break-words">{success}</p>
              <button onClick={clearMessages} className="text-green-400 hover:text-green-600 shrink-0 ml-2">✕</button>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Empty */}
        {!loading && Object.keys(groupedData).length === 0 && (
          <div className="bg-white rounded-xl shadow-md p-10 text-center">
            <span className="text-4xl">📊</span>
            <h3 className="mt-3 text-base font-medium text-gray-900">No Sales Data</h3>
            <p className="mt-1 text-sm text-gray-500">No invoices found.</p>
            <button onClick={fetchData} className="mt-4 px-5 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition">
              🔄 Refresh
            </button>
          </div>
        )}

        {/* Data Display - Flat Table Layout with Category Sections */}
        {!loading && Object.keys(groupedData).length > 0 && (
          <div className="space-y-6">
            {Object.entries(groupedData).map(([category, employeesData]) => {
              const categoryTotal = Object.values(employeesData).reduce(
                (sum, products) => sum + Object.values(products).reduce((s, q) => s + q, 0), 0
              );

              // Flatten the data: each row = employee + product + quantity
              const rows = [];
              Object.entries(employeesData)
                .sort(([a], [b]) => a.localeCompare(b)) // sort employees alphabetically
                .forEach(([employeeName, productsData]) => {
                  Object.entries(productsData)
                    .sort((a, b) => b[1] - a[1]) // sort products by quantity desc
                    .forEach(([productName, quantity]) => {
                      rows.push({ employeeName, productName, quantity });
                    });
                });

              return (
                <div key={category} className="bg-white rounded-xl shadow-md overflow-hidden">
                  {/* Category Header */}
                  <div className="bg-gradient-to-r from-blue-700 to-cyan-600 px-5 py-3 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-white flex items-center gap-2">
                      <span>📁</span> {category}
                    </h2>
                    <span className="text-sm font-medium text-blue-100 bg-white/20 px-3 py-1 rounded-full">
                      Total: {formatNumber(categoryTotal)} items
                    </span>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider text-xs w-1/3">
                            Employee Name
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider text-xs w-1/3">
                            Product Name
                          </th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-600 uppercase tracking-wider text-xs w-1/3">
                            Quantity Sold
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {rows.map((row, idx) => (
                          <tr
                            key={`${row.employeeName}-${row.productName}`}
                            className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                          >
                            <td className="px-4 py-2.5 text-gray-800 font-medium">
                              {row.employeeName}
                            </td>
                            <td className="px-4 py-2.5 text-gray-700">
                              {row.productName}
                            </td>
                            <td className="px-4 py-2.5 text-center font-bold text-green-700">
                              {formatNumber(row.quantity)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {/* Category total footer */}
                      <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                        <tr>
                          <td colSpan={2} className="px-4 py-2.5 text-right font-semibold text-gray-700 text-xs uppercase">
                            Category Total
                          </td>
                          <td className="px-4 py-2.5 text-center font-bold text-blue-700">
                            {formatNumber(categoryTotal)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryProductSales;
