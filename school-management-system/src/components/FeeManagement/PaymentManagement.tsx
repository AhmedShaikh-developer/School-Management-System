import React, { useState, useEffect } from 'react';
import { PlusIcon, EyeIcon, DocumentArrowDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import { useTenant } from '../../App';
import { FeePayment, Voucher } from '../../types/fee';
import jsPDF from 'jspdf';

interface PaymentFormData {
  voucher_id: number;
  amount_paid: number;
  payment_method: 'cash' | 'online' | 'cheque' | 'bank_transfer';
  transaction_id: string;
  gateway_reference: string;
  notes: string;
}

const PaymentManagement: React.FC = () => {
  const { tenantToken } = useTenant();
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [paymentFormData, setPaymentFormData] = useState<PaymentFormData>({
    voucher_id: 0,
    amount_paid: 0,
    payment_method: 'cash',
    transaction_id: '',
    gateway_reference: '',
    notes: ''
  });
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);

  useEffect(() => {
    fetchPayments();
    fetchVouchers();
  }, [tenantToken, page, filterStatus, filterMethod]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });
      
      if (filterStatus) params.append('status', filterStatus);
      if (filterMethod) params.append('payment_method', filterMethod);

      const response = await fetch(`http://localhost:5000/api/fees/payments?${params}`, {
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPayments(data.data);
          setTotalPages(data.pagination?.total_pages || 1);
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to fetch payments');
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  const fetchVouchers = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/fees/vouchers?limit=1000', {
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Filter only pending vouchers for payment
          const pendingVouchers = data.data.filter((voucher: Voucher) => 
            voucher.status === 'pending' && voucher.balance_amount > 0
          );
          setVouchers(pendingVouchers);
        }
      }
    } catch (error) {
      console.error('Error fetching vouchers:', error);
    }
  };

  const handleVoucherSelect = (voucherId: number) => {
    const voucher = vouchers.find(v => v.id === voucherId);
    setSelectedVoucher(voucher || null);
    setPaymentFormData(prev => ({
      ...prev,
      voucher_id: voucherId,
      amount_paid: voucher?.balance_amount || 0
    }));
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!paymentFormData.voucher_id || !paymentFormData.amount_paid || !paymentFormData.payment_method) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (paymentFormData.amount_paid <= 0) {
      toast.error('Payment amount must be greater than 0');
      return;
    }

    if (selectedVoucher && paymentFormData.amount_paid > selectedVoucher.balance_amount) {
      toast.error('Payment amount cannot exceed balance amount');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/fees/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentFormData)
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'Payment recorded successfully');
        setShowPaymentForm(false);
        setPaymentFormData({
          voucher_id: 0,
          amount_paid: 0,
          payment_method: 'cash',
          transaction_id: '',
          gateway_reference: '',
          notes: ''
        });
        setSelectedVoucher(null);
        fetchPayments();
        fetchVouchers();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to record payment');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (payment: FeePayment) => {
    const details = `
Payment Details:
• Receipt Number: ${payment.receipt_number}
• Student ID: ${payment.student_id}
• Amount Paid: ${formatCurrency(payment.amount_paid)}
• Payment Method: ${payment.payment_method.replace('_', ' ').toUpperCase()}
• Payment Date: ${new Date(payment.payment_date).toLocaleDateString()}
• Status: ${payment.status.toUpperCase()}
${payment.transaction_id ? `• Transaction ID: ${payment.transaction_id}` : ''}
${payment.gateway_reference ? `• Gateway Reference: ${payment.gateway_reference}` : ''}
${payment.notes ? `• Notes: ${payment.notes}` : ''}
    `.trim();
    
    toast.info(details, {
      autoClose: 8000,
      style: {
        whiteSpace: 'pre-line',
        fontSize: '14px'
      }
    });
  };

  const handleDownloadReceipt = async (payment: FeePayment) => {
    try {
      // Get student name and voucher details from payment data
      const studentName = payment.student_name || 'Unknown Student';
      const feeMonth = payment.month || 'N/A';
      const academicYear = payment.academic_year_label || 'N/A';
      
      // Create a new PDF document
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Set up colors
      const primaryColor: [number, number, number] = [59, 130, 246]; // Blue
      const secondaryColor: [number, number, number] = [107, 114, 128]; // Gray
      const successColor: [number, number, number] = [34, 197, 94]; // Green
      
      // Header Section
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, pageWidth, 30, 'F');
      
      // School/Company Name
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('PAYMENT RECEIPT', pageWidth / 2, 20, { align: 'center' });
      
      // Receipt Number and Date
      doc.setTextColor(...secondaryColor);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Receipt No: ${payment.receipt_number}`, 20, 45);
      doc.text(`Date: ${new Date(payment.payment_date).toLocaleDateString('en-IN')}`, pageWidth - 20, 45, { align: 'right' });
      
      // Line separator
      doc.setDrawColor(...secondaryColor);
      doc.line(20, 50, pageWidth - 20, 50);
      
      // Payment Details Section
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Payment Details', 20, 65);
      
      // Payment information
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      let yPosition = 80;
      
      const paymentDetails = [
        { label: 'Student Name:', value: studentName },
        { label: 'Student ID:', value: payment.student_id.toString() },
        { label: 'Fee Month:', value: feeMonth || 'N/A' },
        { label: 'Academic Year:', value: academicYear || 'N/A' },
        { label: 'Payment Method:', value: payment.payment_method.replace('_', ' ').toUpperCase() },
        { label: 'Status:', value: payment.status.toUpperCase() }
      ];
      
      if (payment.transaction_id) {
        paymentDetails.push({ label: 'Transaction ID:', value: payment.transaction_id });
      }
      
      if (payment.gateway_reference) {
        paymentDetails.push({ label: 'Gateway Reference:', value: payment.gateway_reference });
      }
      
      paymentDetails.forEach((detail, index) => {
        doc.setTextColor(0, 0, 0);
        doc.text(detail.label, 20, yPosition);
        doc.setTextColor(...primaryColor);
        doc.text(detail.value, 80, yPosition);
        yPosition += 8;
      });
      
      // Amount highlight box
      yPosition += 10;
      doc.setFillColor(240, 248, 255);
      doc.rect(20, yPosition - 5, pageWidth - 40, 15, 'F');
      doc.setDrawColor(...primaryColor);
      doc.rect(20, yPosition - 5, pageWidth - 40, 15, 'S');
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Total Amount Paid:', 25, yPosition + 3);
      doc.setTextColor(...successColor);
      doc.setFontSize(14);
      // Fix currency formatting - use proper INR symbol
      const amountText = `Rs. ${payment.amount_paid.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
      doc.text(amountText, pageWidth - 25, yPosition + 3, { align: 'right' });
      
      // Notes section (if available)
      if (payment.notes) {
        yPosition += 25;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Notes:', 20, yPosition);
        doc.setFont('helvetica', 'normal');
        
        // Split notes into multiple lines if too long
        const notesLines = doc.splitTextToSize(payment.notes, pageWidth - 40);
        doc.text(notesLines, 20, yPosition + 8);
      }
      
      // Footer
      yPosition = pageHeight - 30;
      doc.setDrawColor(...secondaryColor);
      doc.line(20, yPosition, pageWidth - 20, yPosition);
      
      doc.setTextColor(...secondaryColor);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Thank you for your payment!', pageWidth / 2, yPosition + 10, { align: 'center' });
      doc.text('This is a computer generated receipt.', pageWidth / 2, yPosition + 18, { align: 'center' });
      
      // Save the PDF
      doc.save(`receipt-${payment.receipt_number}.pdf`);
      
      toast.success('PDF receipt downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF receipt:', error);
      toast.error('Failed to generate PDF receipt');
    }
  };

  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      completed: { bg: 'bg-green-100', text: 'text-green-800' },
      failed: { bg: 'bg-red-100', text: 'text-red-800' },
      refunded: { bg: 'bg-gray-100', text: 'text-gray-800' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
        {status}
      </span>
    );
  };

  const getMethodBadge = (method: string) => {
    const methodConfig = {
      cash: { bg: 'bg-green-100', text: 'text-green-800' },
      online: { bg: 'bg-blue-100', text: 'text-blue-800' },
      cheque: { bg: 'bg-purple-100', text: 'text-purple-800' },
      bank_transfer: { bg: 'bg-indigo-100', text: 'text-indigo-800' }
    };

    const config = methodConfig[method as keyof typeof methodConfig] || methodConfig.cash;
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
        {method.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Fee Payments</h2>
        <button
          onClick={() => setShowPaymentForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Record Payment
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Payment Method
            </label>
            <select
              value={filterMethod}
              onChange={(e) => {
                setFilterMethod(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">All Methods</option>
              <option value="cash">Cash</option>
              <option value="online">Online</option>
              <option value="cheque">Cheque</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setFilterStatus('');
                setFilterMethod('');
                setPage(1);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Receipt Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount Paid
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Loading payments...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No payments found
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {payment.receipt_number}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(payment.payment_date).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="font-medium">{payment.student_name || 'Unknown Student'}</div>
                        <div className="text-gray-500">ID: {payment.student_id}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(payment.amount_paid)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getMethodBadge(payment.payment_method)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(payment.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewDetails(payment)}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                          title="View Details"
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          View
                        </button>
                        <button
                          onClick={() => handleDownloadReceipt(payment)}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                          title="Download Receipt"
                        >
                          <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                          Download
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Page <span className="font-medium">{page}</span> of{' '}
                  <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment Form Modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                Record Payment
              </h3>
              <button
                onClick={() => setShowPaymentForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-6">
              {/* Voucher Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Voucher *
                </label>
                <select
                  value={paymentFormData.voucher_id}
                  onChange={(e) => handleVoucherSelect(parseInt(e.target.value))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value={0}>Select a voucher...</option>
                  {vouchers.map((voucher) => (
                    <option key={voucher.id} value={voucher.id}>
                      {voucher.voucher_number} - {voucher.student_name} - {formatCurrency(voucher.balance_amount)} (Due: {new Date(voucher.due_date).toLocaleDateString()})
                    </option>
                  ))}
                </select>
                {vouchers.length === 0 && (
                  <p className="text-sm text-gray-500 mt-1">No pending vouchers available for payment</p>
                )}
              </div>

              {/* Voucher Details */}
              {selectedVoucher && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Voucher Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Student:</span>
                      <span className="ml-2 font-medium">{selectedVoucher.student_name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Class:</span>
                      <span className="ml-2 font-medium">{selectedVoucher.class_name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Due Date:</span>
                      <span className="ml-2 font-medium">{new Date(selectedVoucher.due_date).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Balance:</span>
                      <span className="ml-2 font-medium text-green-600">{formatCurrency(selectedVoucher.balance_amount)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Amount *
                </label>
                <input
                  type="number"
                  value={paymentFormData.amount_paid}
                  onChange={(e) => setPaymentFormData(prev => ({ ...prev, amount_paid: parseFloat(e.target.value) || 0 }))}
                  min="0"
                  max={selectedVoucher?.balance_amount || 0}
                  step="0.01"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
                {selectedVoucher && (
                  <p className="text-sm text-gray-500 mt-1">
                    Maximum: {formatCurrency(selectedVoucher.balance_amount)}
                  </p>
                )}
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method *
                </label>
                <select
                  value={paymentFormData.payment_method}
                  onChange={(e) => setPaymentFormData(prev => ({ ...prev, payment_method: e.target.value as any }))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="cash">Cash</option>
                  <option value="online">Online</option>
                  <option value="cheque">Cheque</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              {/* Transaction ID (for online/bank transfer) */}
              {(paymentFormData.payment_method === 'online' || paymentFormData.payment_method === 'bank_transfer') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transaction ID
                  </label>
                  <input
                    type="text"
                    value={paymentFormData.transaction_id}
                    onChange={(e) => setPaymentFormData(prev => ({ ...prev, transaction_id: e.target.value }))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Enter transaction ID"
                  />
                </div>
              )}

              {/* Gateway Reference (for online payments) */}
              {paymentFormData.payment_method === 'online' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gateway Reference
                  </label>
                  <input
                    type="text"
                    value={paymentFormData.gateway_reference}
                    onChange={(e) => setPaymentFormData(prev => ({ ...prev, gateway_reference: e.target.value }))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Enter gateway reference"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={paymentFormData.notes}
                  onChange={(e) => setPaymentFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Additional notes (optional)"
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPaymentForm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !paymentFormData.voucher_id}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentManagement;

