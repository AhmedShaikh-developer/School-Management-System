import React, { useState, useEffect } from 'react';
import { PlusIcon, EyeIcon, DocumentArrowDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import { useTenant } from '../../App';
import { Voucher } from '../../types/fee';
import VoucherForm from './VoucherForm';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface Class {
  id: number;
  class_name: string;
  grade_level: string;
}

interface AcademicYear {
  id: number;
  label: string;
  status: string;
}

interface VoucherManagementProps {
  classes: Class[];
  academicYears: AcademicYear[];
}

const VoucherManagement: React.FC<VoucherManagementProps> = ({
  classes,
  academicYears
}) => {
  const { tenantToken, tenantInfo } = useTenant();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [filterClass, setFilterClass] = useState('');
  const [filterAY, setFilterAY] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchVouchers();
  }, [tenantToken, page, filterClass, filterAY, filterStatus]);

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });
      
      if (filterClass) params.append('class_id', filterClass);
      if (filterAY) params.append('ay_id', filterAY);
      if (filterStatus) params.append('status', filterStatus);

      const response = await fetch(`http://localhost:5000/api/fees/vouchers?${params}`, {
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setVouchers(data.data || []);
          setTotalPages(data.pagination?.total_pages || 1);
          
          // No need to show any message for empty results - this is normal
          if (!data.data || data.data.length === 0) {
            console.log('No vouchers found - displaying empty state');
          }
        }
      } else {
        const error = await response.json();
        console.error('Backend error:', error);
        // Only show error toast for actual failures, not empty results
        if (error.error && !error.error.includes('empty')) {
          toast.error(error.error);
        }
      }
    } catch (error) {
      console.error('Error fetching vouchers:', error);
      toast.error('Failed to fetch vouchers');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateVouchers = async (formData: any) => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/fees/vouchers/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success(data.message || 'Vouchers generated successfully');
          setShowGenerateForm(false);
          fetchVouchers();
        } else {
          toast.error(data.error || 'Failed to generate vouchers');
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to generate vouchers');
      }
    } catch (error) {
      console.error('Error generating vouchers:', error);
      toast.error('Failed to generate vouchers');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Handle view details
  const handleViewDetails = (voucher: Voucher) => {
    console.log('Viewing voucher details:', voucher);
    // For now, just show the voucher data in console
    // You can implement a modal or navigate to a details page later
    toast.info(`Voucher ${voucher.voucher_number || voucher.id} details: ${voucher.student_name || 'Student'} - $${voucher.final_amount || voucher.amount_due || 'Amount'}`);
  };

  // Handle download voucher
  const handleDownloadVoucher = async (voucher: Voucher) => {
    try {
      console.log('🔍 Downloading voucher:', voucher);
      console.log('🔍 Voucher data structure:');
      console.log('  - All voucher keys:', Object.keys(voucher));
      console.log('  - ay_id:', voucher.ay_id);
      console.log('  - final_amount:', voucher.final_amount);
      console.log('  - amount_due:', voucher.amount_due);
      console.log('  - student_name:', voucher.student_name);
      console.log('  - class_name:', voucher.class_name);
      
      // Get academic year name from the academicYears array
      console.log('🔍 Academic years available:', academicYears);
      console.log('🔍 Voucher ay_id:', voucher.ay_id);
      const academicYearName = academicYears.find(ay => ay.id === voucher.ay_id)?.label || 'Unknown';
      console.log('🔍 Academic year lookup:', { voucher_ay_id: voucher.ay_id, found_name: academicYearName });
      
      // Get school name from tenant info
      const schoolName = tenantInfo?.school_name || 'School Management System';
      console.log('🔍 School name for voucher:', schoolName);
      
      // Create professional PDF voucher
      const doc = new jsPDF();
      
      // Set document properties
      doc.setProperties({
        title: `Fee Voucher - ${voucher.voucher_number || voucher.id}`,
        subject: 'School Fee Voucher',
        author: 'School Management System',
        creator: 'School Management System'
      });
      
      // Add school header
      doc.setFontSize(24);
      doc.setTextColor(44, 62, 80);
      doc.text(schoolName.toUpperCase(), 105, 20, { align: 'center' });
      
      doc.setFontSize(16);
      doc.setTextColor(52, 73, 94);
      doc.text('Fee Voucher', 105, 35, { align: 'center' });
      
      // Add separator line
      doc.setDrawColor(52, 73, 94);
      doc.setLineWidth(0.5);
      doc.line(20, 40, 190, 40);
      
      // Add voucher details
      doc.setFontSize(12);
      doc.setTextColor(44, 62, 80);
      
      const startY = 55;
      const lineHeight = 8;
      
      // Left column
      doc.text('Voucher Number:', 20, startY);
      doc.text('Student Name:', 20, startY + lineHeight);
      doc.text('Class:', 20, startY + lineHeight * 2);
      doc.text('Academic Year:', 20, startY + lineHeight * 3);
      doc.text('Due Date:', 20, startY + lineHeight * 4);
      doc.text('Total Amount:', 20, startY + lineHeight * 5);
      doc.text('Installment Number:', 20, startY + lineHeight * 6);
      doc.text('Status:', 20, startY + lineHeight * 7);
      
      // Get the correct amount from available fields
      const voucherAmount = voucher.final_amount || voucher.amount_due || 0;
      console.log('🔍 Amount calculation:', { final_amount: voucher.final_amount, amount_due: voucher.amount_due, final: voucherAmount });
      
      // Right column (values)
      doc.setFontSize(12);
      doc.setTextColor(52, 73, 94);
      doc.text(`${voucher.voucher_number || voucher.id}`, 120, startY);
      doc.text(`${voucher.student_name || 'Student'}`, 120, startY + lineHeight);
      doc.text(`${voucher.class_name || 'Class'}`, 120, startY + lineHeight * 2);
      doc.text(`${academicYearName}`, 120, startY + lineHeight * 3);
      doc.text(`${new Date(voucher.due_date).toLocaleDateString()}`, 120, startY + lineHeight * 4);
      doc.text(`$${voucherAmount}`, 120, startY + lineHeight * 5);
      doc.text(`${voucher.installment_number || 1}`, 120, startY + lineHeight * 6);
      doc.text(`${voucher.status || 'Pending'}`, 120, startY + lineHeight * 7);
      
      // Add installment information if applicable
      if (voucher.installment_number > 1) {
        const installmentY = startY + lineHeight * 9;
        doc.setFontSize(14);
        doc.setTextColor(44, 62, 80);
        doc.text('Installment Details:', 20, installmentY);
        
        doc.setFontSize(10);
        doc.setTextColor(52, 73, 94);
        doc.text(`• Installment Number: ${voucher.installment_number}`, 20, installmentY + lineHeight);
        doc.text(`• Amount Due: $${voucher.amount_due || 0}`, 20, installmentY + lineHeight * 2);
        doc.text(`• Final Amount: $${voucher.final_amount || 0}`, 20, installmentY + lineHeight * 3);
      }
      
      // Add payment instructions
      const instructionsY = startY + lineHeight * (voucher.installment_number > 1 ? 13 : 9);
      doc.setFontSize(14);
      doc.setTextColor(44, 62, 80);
      doc.text('Payment Instructions:', 20, instructionsY);
      
      doc.setFontSize(10);
      doc.setTextColor(52, 73, 94);
      doc.text('• Please pay the amount before the due date', 20, instructionsY + lineHeight);
      doc.text('• Keep this voucher for your records', 20, instructionsY + lineHeight * 2);
      doc.text('• Contact the school office for any queries', 20, instructionsY + lineHeight * 3);
      
      // Add footer
      const footerY = instructionsY + lineHeight * 5;
      doc.setFontSize(10);
      doc.setTextColor(127, 140, 141);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, footerY);
      doc.text('School Management System', 105, footerY, { align: 'center' });
      
      // Save the PDF
      doc.save(`voucher_${voucher.voucher_number || voucher.id}.pdf`);
      
      toast.success('Professional PDF voucher downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF voucher:', error);
      toast.error('Failed to generate PDF voucher');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      paid: { bg: 'bg-green-100', text: 'text-green-800' },
      overdue: { bg: 'bg-red-100', text: 'text-red-800' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-800' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
        {status}
      </span>
    );
  };





  const getAcademicYearName = (ayId: number) => {
    return academicYears.find(ay => ay.id === ayId)?.label || 'Unknown';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Fee Vouchers</h2>
        <button
          onClick={() => setShowGenerateForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Generate Vouchers
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Class
            </label>
            <select
              value={filterClass}
              onChange={(e) => {
                setFilterClass(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">All Classes</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.class_name} ({cls.grade_level})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Academic Year
            </label>
            <select
              value={filterAY}
              onChange={(e) => {
                setFilterAY(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">All Academic Years</option>
              {academicYears.map(ay => (
                <option key={ay.id} value={ay.id}>
                  {ay.label} ({ay.status})
                </option>
              ))}
            </select>
          </div>

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
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setFilterClass('');
                setFilterAY('');
                setFilterStatus('');
                setPage(1);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Vouchers Table */}
      <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Voucher Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount Due
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
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
                    Loading vouchers...
                  </td>
                </tr>
              ) : vouchers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">
                    <div className="text-gray-500">
                      <div className="text-lg font-medium mb-2">No vouchers found</div>
                      <div className="text-sm">Click "Generate Voucher" to create your first fee voucher</div>
                    </div>
                  </td>
                </tr>
              ) : (
                vouchers.map((voucher) => (
                  <tr key={voucher.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {voucher.voucher_number}
                        </div>
                        <div className="text-sm text-gray-500">
                          {voucher.installment_number > 1 ? `Installment ${voucher.installment_number}` : 'Full Payment'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {voucher.student_name || 'Unknown Student'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {voucher.class_name || 'Unknown Class'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(voucher.final_amount || voucher.amount_due)}
                      </div>
                      {voucher.installment_number > 1 && (
                        <div className="text-xs text-blue-600">
                          {formatCurrency(voucher.amount_due)} due
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(voucher.due_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(voucher.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewDetails(voucher)}
                          className="inline-flex items-center px-2 py-1.5 border border-blue-300 text-xs font-medium rounded text-blue-700 bg-blue-50 hover:bg-blue-100 hover:border-blue-400 transition-colors duration-200"
                          title="View Details"
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          View
                        </button>
                        <button
                          onClick={() => handleDownloadVoucher(voucher)}
                          className="inline-flex items-center px-2 py-1.5 border border-green-300 text-xs font-medium rounded text-green-700 bg-green-50 hover:bg-green-100 hover:border-green-400 transition-colors duration-200"
                          title="Download Voucher"
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

      {/* Generate Vouchers Form Modal */}
      <VoucherForm
        isOpen={showGenerateForm}
        onClose={() => setShowGenerateForm(false)}
        onVoucherGenerated={() => {
          fetchVouchers();
          setShowGenerateForm(false);
        }}
      />
    </div>
  );
};

export default VoucherManagement;
