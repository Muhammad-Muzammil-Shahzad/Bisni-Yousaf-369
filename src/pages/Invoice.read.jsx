// InvoiceRead.jsx - Displays all invoices from database without session filter
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const API_BASE_URL = 'https://bisni-ms-backend.onrender.com/api';

const InvoiceRead = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const observer = useRef();
  const ITEMS_PER_PAGE = 7; // Maximum 7 per page
  
  // Filter states
  const [filters, setFilters] = useState({
    employeeCategory: '',
    customerName: '',
    customerMobileNumber: '',
    invoiceId: '',
    date: '',
    startDate: '',
    endDate: '',
    employeeName: '',
  });

  useEffect(() => {
    fetchEmployees();
    fetchInvoices(true); // Reset on initial load
  }, []);

  // Infinite scroll observer
  const lastInvoiceElementRef = useCallback(node => {
    if (loadingMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        loadMoreInvoices();
      }
    }, { threshold: 0.5 });
    
    if (node) observer.current.observe(node);
  }, [loadingMore, hasMore, loading]);

  const fetchEmployees = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/employee`);
      setEmployees(response.data.data || response.data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchInvoices = async (reset = false, filterParams = filters) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(1);
        setInvoices([]);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      
      const currentPage = reset ? 1 : page;
      const params = new URLSearchParams();
      
      // Add filter parameters
      Object.keys(filterParams).forEach(key => {
        if (filterParams[key]) {
          params.append(key, filterParams[key]);
        }
      });
      
      // Add pagination parameters
      params.append('page', currentPage);
      params.append('limit', ITEMS_PER_PAGE);
      
      const queryString = params.toString();
      const url = `${API_BASE_URL}/invoice?${queryString}`;
      
      const response = await axios.get(url);
      const data = response.data.data || response.data || [];
      const count = response.data.count || response.data.totalCount || 0;
      
      if (reset) {
        setInvoices(data);
        setTotalCount(count);
        if (data.length < ITEMS_PER_PAGE) {
          setHasMore(false);
        }
        if (count !== undefined) {
          setSuccess(`${count} invoice(s) loaded`);
        }
      } else {
        setInvoices(prev => [...prev, ...data]);
        if (data.length < ITEMS_PER_PAGE) {
          setHasMore(false);
        }
      }
      
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setError('Failed to load invoices. Please try again later.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreInvoices = () => {
    if (!loadingMore && hasMore) {
      setPage(prevPage => prevPage + 1);
      fetchInvoices(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const applyFilters = () => {
    const hasFilters = Object.values(filters).some(v => v);
    if (hasFilters) {
      fetchInvoices(true, filters);
    } else {
      fetchInvoices(true, {});
    }
  };

  const clearFilters = () => {
    setFilters({
      employeeCategory: '',
      customerName: '',
      customerMobileNumber: '',
      invoiceId: '',
      date: '',
      startDate: '',
      endDate: '',
      employeeName: ''
    });
    fetchInvoices(true, {});
  };

  const handleViewInvoice = (invoice) => {
    const employee = employees.find(emp => 
      emp.employeeName === invoice.employeeName && 
      emp.employeeMobileNumber === invoice.employeeMobileNumber &&
      emp.employeeAddres === invoice.employeeAddres
    );
    
    setSelectedInvoice({
      ...invoice,
      employeeCommission: employee?.employeeCommission || []
    });
  };

  // Calculate employee commission
  const calculateEmployeeCommission = (products, employeeCommission) => {
    if (!employeeCommission || employeeCommission.length === 0) return 0;
    let totalCommission = 0;
    products.forEach(product => {
      const commission = employeeCommission.find(c => c.productName === product.productName);
      if (commission) {
        totalCommission += commission.commissionAmount * product.productQuantity;
      }
    });
    return totalCommission;
  };

  // Calculate commission for an invoice
  const calculateInvoiceCommission = (invoice) => {
    const employee = employees.find(emp => 
      emp.employeeName === invoice.employeeName && 
      emp.employeeMobileNumber === invoice.employeeMobileNumber &&
      emp.employeeAddres === invoice.employeeAddres
    );
    return calculateEmployeeCommission(invoice.products, employee?.employeeCommission || []);
  };




  // Print individual invoice (keeping original functionality)
  const handlePrint = (invoiceId) => {
    const inv = invoices.find(i => i._id === invoiceId || i.invoiceId === invoiceId);
    if (!inv) {
      setError('Invoice not found');
      return;
    }

    const employee = employees.find(emp => 
      emp.employeeName === inv.employeeName && 
      emp.employeeMobileNumber === inv.employeeMobileNumber &&
      emp.employeeAddres === inv.employeeAddres
    );
    const commission = calculateEmployeeCommission(inv.products, employee?.employeeCommission || []);
    
    const formatCur = (amount) => (amount || 0).toFixed(2);
    const formatDt = (dateString) => {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    };

    const subtotal = inv.products.reduce((sum, p) => sum + (p.productTotalAmount || 0), 0);

    const productRows = inv.products.map((p, i) => `
      <tr>
        <td style="text-align:center;">${i + 1}</td>
        <td>${p.productName} <span style="color:#888;font-size:12px;">(${p.productCategory})</span></td>
        <td style="text-align:center;">${p.productQuantity}</td>
        <td style="text-align:right;">Rs. ${formatCur(p.productSalePrice)}</td>
        <td style="text-align:right;">Rs. ${formatCur(p.productTotalAmount)}</td>
      </tr>
    `).join('');

    const commissionRow = commission > 0 ? `
      <tr>
        <td colspan="2" style="font-weight:600;color:#15803d;">Employee Commission</td>
        <td colspan="3" style="text-align:right;font-weight:600;color:#15803d;">Rs. ${formatCur(commission)}</td>
      </tr>` : '';

    const html = `<!DOCTYPE html>
    <html>
    <head>
      <title>Invoice ${inv.invoiceId}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; color: #1a1a2e; max-width: 800px; margin: 0 auto; }
        .header { text-align: center; border-bottom: 3px solid #0891b2; padding-bottom: 15px; margin-bottom: 20px; }
        .header h1 { color: #0891b2; margin: 0; font-size: 24px; letter-spacing: 1px; }
        .header p { margin: 5px 0; color: #64748b; font-size: 13px; }
        .header .dates { display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; margin-top: 8px; }
        .section { margin-bottom: 18px; }
        .section h3 { color: #06b6d4; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; font-size: 14px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
        .section p { font-size: 12px; margin-bottom: 3px; }
        .section span { font-weight: 500; color: #334155; }
        .info-grid { display: flex; gap: 25px; }
        .info-box { flex: 1; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th { background: #f0fdfa; padding: 9px 10px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #0891b2; color: #0f766e; }
        td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
        .totals { width: 380px; margin-left: auto; margin-top: 8px; }
        .totals td { border: none; padding: 5px 8px; font-size: 13px; }
        .totals .grand-total { font-weight: 700; font-size: 15px; border-top: 2px solid #0891b2; color: #0891b2; }
        .totals .grand-total td { padding-top: 8px; }
        .footer { text-align: center; margin-top: 25px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
        @media print { body { padding: 10px; max-width: 100%; } }
        @page { size: A4; margin: 8mm; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📦 INVOICE</h1>
        <p>Invoice ID: ${inv.invoiceId}</p>
        <div class="dates">
          <span>Created: ${formatDt(inv.createdAt)}</span>
          <span>Printed: ${formatDt(new Date().toISOString())}</span>
        </div>
      </div>

      <div class="section">
        <h3>Order Details</h3>
        <div class="info-grid">
          <div class="info-box">
            <p><span>Employee:</span> ${inv.employeeName}</p>
            <p><span>Category:</span> ${inv.employeeCategory}</p>
            <p><span>Mobile:</span> ${inv.employeeMobileNumber}</p>
          </div>
          <div class="info-box">
            <p><span>Customer:</span> ${inv.customerName}</p>
            <p><span>Contact:</span> ${inv.customerMobileNumber1}</p>
            <p><span>Address:</span> ${inv.customerAddress || 'N/A'}</p>
          </div>
        </div>
      </div>

      <div class="section">
        <h3>Products</h3>
        <table>
          <thead>
            <tr>
              <th style="text-align:center;width:30px;">#</th>
              <th>Product & Category</th>
              <th style="text-align:center;width:40px;">Qty</th>
              <th style="text-align:right;width:80px;">Price</th>
              <th style="text-align:right;width:80px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${productRows}
          </tbody>
        </table>
      </div>

      <div class="section">
        <table class="totals">
          <tr><td>Subtotal:</td><td style="text-align:right;">Rs. ${formatCur(subtotal)}</td></tr>
          ${inv.deliveryCharges > 0 ? `<tr><td>Delivery Charges:</td><td style="text-align:right;">Rs. ${formatCur(inv.deliveryCharges)}</td></tr>` : ''}
          <tr class="grand-total"><td>Grand Total:</td><td style="text-align:right;">Rs. ${formatCur(inv.grandTotalAmount)}</td></tr>
          ${commissionRow}
        </table>
      </div>

      <table style="
    width:100%;
    border-collapse:collapse;
    font-size:18px;
    font-family:Arial, sans-serif;
    margin-top:10px;
">
    </tr>
    <tr>
        <td style="border:2px solid #000; padding-top:2px; padding-bottom:2px; padding-left:3px; padding-right:3px; font-weight:bold; font-size: 22px; font-family: sans-serif;" >
            To
        </td>
        <td style="border:2px solid #000; padding-top:2px; padding-bottom:2px; padding-left:3px; padding-right:3px; font-weight:bold; font-size: 22px; font-family: sans-serif;" >
            ${inv.customerName || 'N/A'}
        </td>

    </tr>

    <tr>
        <td style="border:2px solid #000; padding-top:2px; padding-bottom:2px; padding-left:3px; padding-right:3px; font-weight:bold; font-size: 22px; font-family: sans-serif;">
            Contact
        </td>
        <td style="border:2px solid #000; padding-top:2px; padding-bottom:2px; padding-left:3px; padding-right:3px; font-weight:bold; font-size: 22px; font-family: sans-serif;">
            ${inv.customerMobileNumber1 || 'N/A'} &nbsp;&nbsp;&nbsp; || &nbsp;&nbsp;&nbsp; ${inv.customerMobileNumber2 || 'N/A'}
        </td>

    </tr>

    <tr>
        <td style="border:2px solid #000; padding-top:2px; padding-bottom:2px; padding-left:3px; padding-right:3px; font-weight:bold; font-size: 22px; font-family: sans-serif;">
            Address
        </td>
        <td style="border:2px solid #000; padding-top:2px; padding-bottom:2px; padding-left:3px; padding-right:3px; font-weight:bold; font-size: 22px; font-family: sans-serif;">
            ${inv.customerAddress || 'N/A'}
        </td>

    </tr>
</table>


      <table style="
    width:100%;
    border-collapse:collapse;
    font-size:18px;
    font-family:Arial, sans-serif;
    margin-top:10px;
">
    </tr>
    <tr>
        <td style="border:2px solid #000; padding-top:2px; padding-bottom:2px; padding-left:3px; padding-right:3px; font-weight:bold; font-size: 22px; font-family: sans-serif;" >
            From
        </td>
        <td style="border:2px solid #000; padding-top:2px; padding-bottom:2px; padding-left:3px; padding-right:3px; font-weight:bold; font-size: 22px; font-family: sans-serif;" >
            ${inv.employeeName || 'N/A'}
        </td>

    </tr>

    <tr>
        <td style="border:2px solid #000; padding-top:2px; padding-bottom:2px; padding-left:3px; padding-right:3px; font-weight:bold; font-size: 22px; font-family: sans-serif;">
            Contact
        </td>
        <td style="border:2px solid #000; padding-top:2px; padding-bottom:2px; padding-left:3px; padding-right:3px; font-weight:bold; font-size: 22px; font-family: sans-serif;">
            ${inv.employeeMobileNumber || 'N/A'}
        </td>

    </tr>


    <tr>
        <td style="border:2px solid #000; padding-top:2px; padding-bottom:2px; padding-left:3px; padding-right:3px; font-weight:bold; font-size: 22px; font-family: sans-serif;">
            Address
        </td>
        <td style="border:2px solid #000; padding-top:4px; padding-bottom:4px; padding-left:6px; padding-right:6px; font-weight:bold; font-size: 22px; font-family: sans-serif;">
            ${inv.employeeAddress || 'N/A'}
        </td>

    </tr>
</table>

      <div class="footer">
        <p>Generated by Bisni Sales Management | Thank you for Your Order!</p>
      </div>
      <script>window.onload=function(){window.print();}<\/script>
    </body>
    </html>`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setError('Please allow popups to print the invoice');
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Print filtered invoices list (keeping original functionality)
  const handlePrintFilteredList = () => {
    if (invoices.length === 0) {
      setError('No invoices to print');
      return;
    }

    const formatCur = (amount) => (amount || 0).toFixed(2);
    const formatDt = (dateString) => {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    };

    // Calculate total commission and total amount
    let totalCommission = 0;
    let totalAmount = 0;

    const invoiceRows = invoices.map((inv, i) => {
      const commission = calculateInvoiceCommission(inv);
      totalCommission += commission;
      totalAmount += (inv.grandTotalAmount || 0);
      
      return `
        <tr>
          <td style="text-align:center;">${i + 1}</td>
          <td>${inv.invoiceId}</td>
          <td>${formatDt(inv.createdAt)}</td>
          <td>${inv.customerName || 'N/A'}</td>
          <td style="text-align:right;">Rs. ${formatCur(commission)}</td>
          <td style="text-align:right;">Rs. ${formatCur(inv.grandTotalAmount || 0)}</td>
        </tr>
      `;
    }).join('');

    const hasFilters = Object.values(filters).some(v => v);
    const filterInfo = hasFilters ? 'Filtered Invoices' : 'All Invoices';

    const html = `<!DOCTYPE html>
    <html>
    <head>
      <title>Invoices Report - ${filterInfo}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; color: #1a1a2e; max-width: 800px; margin: 0 auto; }
        .header { text-align: center; border-bottom: 3px solid #0891b2; padding-bottom: 15px; margin-bottom: 20px; }
        .header h1 { color: #0891b2; margin: 0; font-size: 22px; letter-spacing: 1px; }
        .header p { margin: 5px 0; color: #64748b; font-size: 13px; }
        .header .dates { display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; margin-top: 8px; }
        .section { margin-bottom: 18px; }
        .section h3 { color: #06b6d4; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; font-size: 14px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
        .section p { font-size: 12px; margin-bottom: 3px; }
        .section span { font-weight: 500; color: #334155; }
        .info-grid { display: flex; gap: 25px; }
        .info-box { flex: 1; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th { background: #f0fdfa; padding: 9px 10px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #0891b2; color: #0f766e; }
        td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
        .totals { width: 380px; margin-left: auto; margin-top: 8px; }
        .totals td { border: none; padding: 5px 8px; font-size: 13px; }
        .totals .grand-total { font-weight: 700; font-size: 15px; border-top: 2px solid #0891b2; color: #0891b2; }
        .totals .grand-total td { padding-top: 8px; }
        .footer { text-align: center; margin-top: 25px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
        @media print { body { padding: 10px; max-width: 100%; } }
        @page { size: A4; margin: 8mm; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📋 INVOICES REPORT</h1>
        <p>${filterInfo} | Total Invoices: ${invoices.length}</p>
        <div class="dates">
          <span>Generated: ${formatDt(new Date().toISOString())}</span>
          <span>Total Invoices: ${invoices.length}</span>
        </div>
      </div>

      <div class="section">
        <h3>Invoice List</h3>
        <table>
          <thead>
            <tr>
              <th style="text-align:center;width:30px;">#</th>
              <th>Invoice ID</th>
              <th>Date</th>
              <th>Customer</th>
              <th style="text-align:right;">Commission</th>
              <th style="text-align:right;">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            ${invoiceRows}
          </tbody>
        </table>
      </div>

      <div class="section">
        <table class="totals">
          <tr>
            <td>Total Commission:</td>
            <td style="text-align:right;font-weight:600;color:#7c3aed;">Rs. ${formatCur(totalCommission)}</td>
          </tr>
          <tr class="grand-total">
            <td>Grand Total Revenue:</td>
            <td style="text-align:right;">Rs. ${formatCur(totalAmount)}</td>
          </tr>
        </table>
      </div>

      <div class="footer">
        <p>Generated by Bisni Sales Management | ${filterInfo}</p>
      </div>
      <script>window.onload=function(){window.print();}<\/script>
    </body>
    </html>`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setError('Please allow popups to print the report');
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const calculateTotalItems = (products) => {
    return products.reduce((sum, product) => sum + (product.productQuantity || 0), 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-3 sm:py-4 md:py-5 px-2 sm:px-3 md:px-4 lg:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-5">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">INVOICES RECORDS</h1>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="mb-3 bg-red-50 border-l-4 border-red-500 p-2 sm:p-2.5 rounded-r-lg text-xs">
            <div className="flex items-start">
              <span className="mr-2 flex-shrink-0">❌</span>
              <p className="text-red-700 flex-1 break-words">{error}</p>
              <button onClick={clearMessages} className="text-red-400 hover:text-red-600 flex-shrink-0 ml-1">✕</button>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-3 bg-green-50 border-l-4 border-green-500 p-2 sm:p-2.5 rounded-r-lg text-xs">
            <div className="flex items-start">
              <span className="mr-2 flex-shrink-0">✅</span>
              <p className="text-green-700 flex-1 break-words">{success}</p>
              <button onClick={clearMessages} className="text-green-400 hover:text-green-600 flex-shrink-0 ml-1">✕</button>
            </div>
          </div>
        )}

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-3 sm:mb-4">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-3 sm:px-4 py-2 sm:py-2.5">
            <h2 className="text-xs sm:text-sm font-semibold text-white flex items-center">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="whitespace-nowrap">Search & Filter Invoices</span>
            </h2>
          </div>

          <div className="p-2 sm:p-3">
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-3">
              <div>
                <label className="block text-2xs xs:text-xs font-medium text-gray-700 mb-1">Invoice ID</label>
                <input type="text" name="invoiceId" value={filters.invoiceId} onChange={handleFilterChange}
                  placeholder="e.g., INV-20260113-0001"
                  className="w-full px-2 sm:px-2.5 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 text-xs" />
              </div>
              <div>
                <label className="block text-2xs xs:text-xs font-medium text-gray-700 mb-1">Employee Name</label>
                <input type="text" name="employeeName" value={filters.employeeName} onChange={handleFilterChange}
                  placeholder="Search by employee"
                  className="w-full px-2 sm:px-2.5 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 text-xs" />
              </div>
              <div>
                <label className="block text-2xs xs:text-xs font-medium text-gray-700 mb-1">Employee Category</label>
                <input type="text" name="employeeCategory" value={filters.employeeCategory} onChange={handleFilterChange}
                  placeholder="e.g., Sales, Manager"
                  className="w-full px-2 sm:px-2.5 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 text-xs" />
              </div>
              <div>
                <label className="block text-2xs xs:text-xs font-medium text-gray-700 mb-1">Customer Name</label>
                <input type="text" name="customerName" value={filters.customerName} onChange={handleFilterChange}
                  placeholder="Search by customer"
                  className="w-full px-2 sm:px-2.5 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 text-xs" />
              </div>
              <div>
                <label className="block text-2xs xs:text-xs font-medium text-gray-700 mb-1">Customer Mobile</label>
                <input type="text" name="customerMobileNumber" value={filters.customerMobileNumber} onChange={handleFilterChange}
                  placeholder="Enter mobile number"
                  className="w-full px-2 sm:px-2.5 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 text-xs" />
              </div>
              <div>
                <label className="block text-2xs xs:text-xs font-medium text-gray-700 mb-1">Specific Date</label>
                <input type="date" name="date" value={filters.date} onChange={handleFilterChange}
                  className="w-full px-2 sm:px-2.5 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 text-xs" />
              </div>
              <div>
                <label className="block text-2xs xs:text-xs font-medium text-gray-700 mb-1">Start Date</label>
                <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange}
                  className="w-full px-2 sm:px-2.5 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 text-xs" />
              </div>
              <div>
                <label className="block text-2xs xs:text-xs font-medium text-gray-700 mb-1">End Date</label>
                <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange}
                  className="w-full px-2 sm:px-2.5 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 text-xs" />
              </div>
            </div>

            <div className="flex flex-col xs:flex-row justify-end gap-2">
              <button onClick={clearFilters}
                className="w-full xs:w-auto px-3 py-1.5 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 text-xs font-medium">
                Clear Filters
              </button>
              <button onClick={applyFilters}
                className="w-full xs:w-auto px-4 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-md hover:from-blue-700 hover:to-cyan-700 text-xs font-medium">
                Search Invoices
              </button>
            </div>
          </div>
        </div>

        {/* Invoices List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-3 sm:px-4 py-2 sm:py-2.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <h2 className="text-xs sm:text-sm font-semibold text-white">
              Invoice List ({totalCount || invoices.length})
            </h2>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button onClick={handlePrintFilteredList}
                className="px-2.5 py-1 bg-white text-purple-600 rounded-md hover:bg-gray-100 text-xs font-medium w-full sm:w-auto"
                title="Print filtered invoices list">
                🖨️ Print List
              </button>
              <button onClick={() => fetchInvoices(true)}
                className="px-2.5 py-1 bg-white text-blue-600 rounded-md hover:bg-gray-100 text-xs font-medium w-full sm:w-auto">
                🔄 Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12 px-4">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-3 text-sm font-medium text-gray-900">No invoices found</h3>
              <p className="mt-1 text-xs text-gray-500">
                {Object.values(filters).some(v => v) 
                  ? 'No invoices match your filter criteria.'
                  : 'There are no invoices to display.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Mobile Card View */}
              <div className="block lg:hidden">
                {invoices.map((invoice, index) => {
                  const isLastElement = index === invoices.length - 1;
                  return (
                    <div 
                      key={invoice._id} 
                      ref={isLastElement ? lastInvoiceElementRef : null}
                      className="border-b border-gray-200 p-3 hover:bg-gray-50 transition duration-150"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-900 truncate">{invoice.invoiceId}</div>
                          <div className="text-xs text-gray-500">{formatDate(invoice.createdAt)}</div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <div className="text-xs font-bold text-green-600">Rs. {formatCurrency(invoice.grandTotalAmount)}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
                        <div>
                          <span className="text-gray-500">Customer: </span>
                          <span className="font-medium">{invoice.customerName}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Employee: </span>
                          <span className="font-medium">{invoice.employeeName}</span>
                        </div>
                        {invoice.customerMobileNumber1 && (
                          <div>
                            <span className="text-gray-500">Mobile: </span>
                            <span className="font-medium">{invoice.customerMobileNumber1}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-500">Items: </span>
                          <span className="font-medium">{calculateTotalItems(invoice.products)}</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => handleViewInvoice(invoice)}
                          className="flex-1 px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 text-xs font-medium text-center">
                          View Details
                        </button>
                        <button onClick={() => handlePrint(invoice._id)}
                          className="px-2 py-1 bg-green-50 text-green-600 rounded hover:bg-green-100 text-xs font-medium">
                          🖨️ Print
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <table className="min-w-full divide-y divide-gray-200 hidden lg:table">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Invoice ID</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Customer</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Employee</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase hidden xl:table-cell">Items</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Grand Total</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-28">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map((invoice, index) => {
                    const isLastElement = index === invoices.length - 1;
                    return (
                      <tr 
                        key={invoice._id} 
                        ref={isLastElement ? lastInvoiceElementRef : null}
                        className="hover:bg-gray-50 transition duration-150"
                      >
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="text-xs font-medium text-gray-900">{invoice.invoiceId}</div>
                          <div className="text-xs text-gray-500 md:hidden">{formatDate(invoice.createdAt)}</div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">{formatDate(invoice.createdAt)}</td>
                        <td className="px-3 py-2 whitespace-nowrap hidden md:table-cell">
                          <div className="text-xs font-medium text-gray-900">{invoice.customerName}</div>
                          <div className="text-xs text-gray-500">{invoice.customerMobileNumber1}</div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap hidden lg:table-cell">
                          <div className="text-xs text-gray-900">{invoice.employeeName}</div>
                          <div className="text-xs text-gray-500">{invoice.employeeCategory}</div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-center hidden xl:table-cell">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {calculateTotalItems(invoice.products)} items
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-right text-xs font-bold text-green-600">
                          Rs. {formatCurrency(invoice.grandTotalAmount)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => handleViewInvoice(invoice)}
                              className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 text-xs font-medium">
                              View
                            </button>
                            <button onClick={() => handlePrint(invoice._id)}
                              className="inline-flex items-center px-2 py-1 bg-green-50 text-green-600 rounded hover:bg-green-100 text-xs font-medium">
                              🖨️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              {/* Loading More Indicator */}
              {loadingMore && (
                <div className="flex justify-center items-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-xs text-gray-600">Loading more invoices...</span>
                </div>
              )}
              
              {/* End of List Indicator */}
              {!hasMore && invoices.length > 0 && (
                <div className="text-center py-4 text-xs text-gray-500">
                  All invoices loaded ({invoices.length} total)
                </div>
              )}
            </div>
          )}
        </div>

        {/* Invoice Details Modal */}
        {selectedInvoice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-3 md:p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-3 sm:px-4 py-2 sm:py-2.5 flex justify-between items-center sticky top-0 z-10">
                <h3 className="text-xs sm:text-sm font-semibold text-white truncate mr-2">Invoice Details</h3>
                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                  <button onClick={() => handlePrint(selectedInvoice._id)}
                    className="px-2 sm:px-2.5 py-1 bg-white text-green-600 rounded-md hover:bg-gray-100 text-xs font-medium whitespace-nowrap">
                    🖨️ Print
                  </button>
                  <button onClick={() => setSelectedInvoice(null)} className="text-white hover:text-gray-200">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                <div className="border-b border-gray-200 pb-2 sm:pb-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                    <div className="min-w-0">
                      <h4 className="text-sm sm:text-base font-bold text-gray-900 truncate">{selectedInvoice.invoiceId}</h4>
                      <p className="text-xs text-gray-500">Created: {formatDate(selectedInvoice.createdAt)}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-lg sm:text-xl font-bold text-green-600">Rs. {formatCurrency(selectedInvoice.grandTotalAmount)}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  <div className="bg-blue-50 rounded-md p-2 sm:p-3">
                    <h5 className="text-xs font-semibold text-blue-900 mb-1.5 sm:mb-2">Employee Details</h5>
                    <div className="space-y-1 text-xs">
                      <p><span className="text-gray-500">Name:</span> <span className="font-medium break-words">{selectedInvoice.employeeName}</span></p>
                      <p><span className="text-gray-500">Category:</span> <span className="font-medium break-words">{selectedInvoice.employeeCategory}</span></p>
                      <p><span className="text-gray-500">Mobile:</span> <span className="font-medium break-words">{selectedInvoice.employeeMobileNumber}</span></p>
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-md p-2 sm:p-3">
                    <h5 className="text-xs font-semibold text-green-900 mb-1.5 sm:mb-2">Customer Details</h5>
                    <div className="space-y-1 text-xs">
                      <p><span className="text-gray-500">Name:</span> <span className="font-medium break-words">{selectedInvoice.customerName}</span></p>
                      <p><span className="text-gray-500">Mobile:</span> <span className="font-medium break-words">{selectedInvoice.customerMobileNumber1}</span></p>
                    </div>
                  </div>
                </div>

                <div>
                  <h5 className="text-xs font-semibold text-gray-900 mb-1.5 sm:mb-2">Products ({selectedInvoice.products.length})</h5>
                  <div className="overflow-x-auto">
                    {/* Mobile Product Cards */}
                    <div className="block md:hidden space-y-2">
                      {selectedInvoice.products.map((product, index) => (
                        <div key={index} className="border border-gray-200 rounded-md p-2 bg-gray-50">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs font-medium text-gray-900">{product.productName}</span>
                            <span className="text-xs text-gray-500">#{index + 1}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-xs">
                            <div><span className="text-gray-500">Category:</span> {product.productCategory}</div>
                            <div><span className="text-gray-500">Qty:</span> {product.productQuantity}</div>
                            <div><span className="text-gray-500">Unit Price:</span> Rs. {formatCurrency(product.productSalePrice)}</div>
                            <div className="font-semibold text-green-600">Rs. {formatCurrency(product.productTotalAmount)}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Product Table */}
                    <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-md hidden md:table">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2.5 py-1.5 text-left text-xs font-medium text-gray-500">#</th>
                          <th className="px-2.5 py-1.5 text-left text-xs font-medium text-gray-500">Product</th>
                          <th className="px-2.5 py-1.5 text-left text-xs font-medium text-gray-500 hidden md:table-cell">Category</th>
                          <th className="px-2.5 py-1.5 text-center text-xs font-medium text-gray-500">Qty</th>
                          <th className="px-2.5 py-1.5 text-right text-xs font-medium text-gray-500">Unit Price</th>
                          <th className="px-2.5 py-1.5 text-right text-xs font-medium text-gray-500">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedInvoice.products.map((product, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-2.5 py-1.5 text-xs text-gray-500">{index + 1}</td>
                            <td className="px-2.5 py-1.5 text-xs font-medium text-gray-900">{product.productName}</td>
                            <td className="px-2.5 py-1.5 text-xs text-gray-500 hidden md:table-cell">{product.productCategory}</td>
                            <td className="px-2.5 py-1.5 text-xs text-center text-gray-900">{product.productQuantity}</td>
                            <td className="px-2.5 py-1.5 text-xs text-right text-gray-900">Rs. {formatCurrency(product.productSalePrice)}</td>
                            <td className="px-2.5 py-1.5 text-xs text-right font-semibold text-green-600">Rs. {formatCurrency(product.productTotalAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan="5" className="px-2.5 py-1.5 text-xs font-medium text-gray-900 text-right">Subtotal:</td>
                          <td className="px-2.5 py-1.5 text-xs font-bold text-gray-900 text-right">
                            Rs. {formatCurrency(selectedInvoice.products.reduce((sum, p) => sum + (p.productTotalAmount || 0), 0))}
                          </td>
                        </tr>
                        {selectedInvoice.deliveryCharges > 0 && (
                          <tr>
                            <td colSpan="5" className="px-2.5 py-1.5 text-xs font-medium text-gray-900 text-right">Delivery:</td>
                            <td className="px-2.5 py-1.5 text-xs text-right">Rs. {formatCurrency(selectedInvoice.deliveryCharges)}</td>
                          </tr>
                        )}
                        <tr className="border-t-2 border-blue-200">
                          <td colSpan="5" className="px-2.5 py-1.5 text-xs font-bold text-gray-900 text-right bg-gradient-to-r from-blue-50 to-cyan-50">Grand Total:</td>
                          <td className="px-2.5 py-1.5 text-sm font-bold text-green-600 text-right bg-gradient-to-r from-blue-50 to-cyan-50">
                            Rs. {formatCurrency(selectedInvoice.grandTotalAmount)}
                          </td>
                        </tr>
                        {selectedInvoice.employeeCommission && selectedInvoice.employeeCommission.length > 0 && (
                          <tr>
                            <td colSpan="5" className="px-2.5 py-1.5 text-xs font-medium text-green-700 text-right">Commission:</td>
                            <td className="px-2.5 py-1.5 text-xs font-bold text-green-700 text-right">
                              Rs. {formatCurrency(calculateEmployeeCommission(selectedInvoice.products, selectedInvoice.employeeCommission))}
                            </td>
                          </tr>
                        )}
                      </tfoot>
                    </table>

                    {/* Mobile Totals */}
                    <div className="block md:hidden mt-3 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="font-medium">Subtotal:</span>
                        <span className="font-bold">Rs. {formatCurrency(selectedInvoice.products.reduce((sum, p) => sum + (p.productTotalAmount || 0), 0))}</span>
                      </div>
                      {selectedInvoice.deliveryCharges > 0 && (
                        <div className="flex justify-between">
                          <span className="font-medium">Delivery:</span>
                          <span>Rs. {formatCurrency(selectedInvoice.deliveryCharges)}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t-2 border-blue-200 pt-1">
                        <span className="font-bold">Grand Total:</span>
                        <span className="font-bold text-green-600">Rs. {formatCurrency(selectedInvoice.grandTotalAmount)}</span>
                      </div>
                      {selectedInvoice.employeeCommission && selectedInvoice.employeeCommission.length > 0 && (
                        <div className="flex justify-between">
                          <span className="font-medium text-green-700">Commission:</span>
                          <span className="font-bold text-green-700">
                            Rs. {formatCurrency(calculateEmployeeCommission(selectedInvoice.products, selectedInvoice.employeeCommission))}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
        }
        .text-2xs {
          font-size: 0.65rem;
        }
      `}</style>
    </div>
  );
};

export default InvoiceRead;
