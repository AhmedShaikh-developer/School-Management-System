import React, { useState, useEffect } from 'react';
import { ChartBarIcon, DocumentChartBarIcon, CurrencyDollarIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { useTenant } from '../../App';

interface FeeStats {
  total_collections: number;
  pending_amount: number;
  overdue_amount: number;
  total_students: number;
  collection_rate: number;
}

interface MonthlyData {
  month: string;
  collections: number;
  pending: number;
}

interface ClassPerformance {
  class_id: number;
  class_name: string;
  grade_level: string;
  collections: number;
  pending: number;
  total_due: number;
  student_count: number;
  collection_rate: number;
}

interface PaymentMethod {
  method: string;
  amount: number;
  count: number;
  percentage: number;
}

interface Class {
  id: number;
  class_name: string;
  grade_level: string;
}

const FeeReports: React.FC = () => {
  const { tenantToken } = useTenant();
  const [stats, setStats] = useState<FeeStats>({
    total_collections: 0,
    pending_amount: 0,
    overdue_amount: 0,
    total_students: 0,
    collection_rate: 0
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [classPerformance, setClassPerformance] = useState<ClassPerformance[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('current_month');
  const [selectedClass, setSelectedClass] = useState('all');
  const [showPaymentSummary, setShowPaymentSummary] = useState(false);

  useEffect(() => {
    fetchClasses();
    fetchFeeStats();
    fetchMonthlyData();
    fetchClassPerformance();
    fetchPaymentMethods();
  }, [tenantToken, selectedPeriod, selectedClass]);

  const fetchClasses = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/classes', {
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setClasses(data.data);
        }
      } else {
        console.error('Failed to fetch classes');
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchFeeStats = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        period: selectedPeriod,
        class_id: selectedClass
      });

      const response = await fetch(`http://localhost:5000/api/fees/reports/stats?${params}`, {
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats(data.data);
        }
      } else {
        console.error('Failed to fetch fee stats');
      }
    } catch (error) {
      console.error('Error fetching fee stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyData = async () => {
    try {
      const params = new URLSearchParams({
        period: selectedPeriod,
        class_id: selectedClass
      });

      const response = await fetch(`http://localhost:5000/api/fees/reports/monthly?${params}`, {
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMonthlyData(data.data);
        }
      } else {
        console.error('Failed to fetch monthly data');
      }
    } catch (error) {
      console.error('Error fetching monthly data:', error);
    }
  };

  const fetchClassPerformance = async () => {
    try {
      const params = new URLSearchParams({
        period: selectedPeriod
      });

      const response = await fetch(`http://localhost:5000/api/fees/reports/class-wise?${params}`, {
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setClassPerformance(data.data);
        }
      } else {
        console.error('Failed to fetch class performance data');
      }
    } catch (error) {
      console.error('Error fetching class performance data:', error);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const params = new URLSearchParams({
        period: selectedPeriod,
        class_id: selectedClass
      });

      const response = await fetch(`http://localhost:5000/api/fees/reports/payment-methods?${params}`, {
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPaymentMethods(data.data);
        }
      } else {
        console.error('Failed to fetch payment methods data');
      }
    } catch (error) {
      console.error('Error fetching payment methods data:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Helper function for CSV-safe currency formatting
  const formatCurrencyForCSV = (amount: number) => {
    return `Rs. ${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Quick Actions handlers
  const handleExportReport = () => {
    const csvData = [
      ['Fee Management Report'],
      ['Generated on:', new Date().toLocaleDateString()],
      ['Period:', selectedPeriod],
      ['Class:', selectedClass === 'all' ? 'All Classes' : classes.find(c => c.id.toString() === selectedClass)?.class_name || selectedClass],
      [''],
      ['Summary'],
      ['Total Collections', formatCurrencyForCSV(stats.total_collections)],
      ['Pending Amount', formatCurrencyForCSV(stats.pending_amount)],
      ['Overdue Amount', formatCurrencyForCSV(stats.overdue_amount)],
      ['Collection Rate', formatPercentage(stats.collection_rate)],
      [''],
      ['Monthly Data'],
      ['Month', 'Collections', 'Pending'],
      ...monthlyData.map(data => [data.month, formatCurrencyForCSV(data.collections), formatCurrencyForCSV(data.pending)]),
      [''],
      ['Class Performance'],
      ['Class', 'Collections', 'Pending', 'Total Due', 'Students', 'Collection Rate'],
      ...classPerformance.map(data => [
        data.class_name,
        formatCurrencyForCSV(data.collections),
        formatCurrencyForCSV(data.pending),
        formatCurrencyForCSV(data.total_due),
        data.student_count.toString(),
        formatPercentage(data.collection_rate)
      ]),
      [''],
      ['Payment Methods'],
      ['Method', 'Amount', 'Count', 'Percentage'],
      ...paymentMethods.map(data => [
        data.method,
        formatCurrencyForCSV(data.amount),
        data.count.toString(),
        formatPercentage(data.percentage)
      ])
    ];

    // Properly escape CSV content to handle special characters
    const escapeCSV = (field: string) => {
      if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    };

    const csvContent = csvData.map(row => 
      row.map(field => escapeCSV(field.toString())).join(',')
    ).join('\n');
    
    // Add BOM for proper UTF-8 encoding in Excel
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `fee_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerateAnalytics = () => {
    // Import jsPDF dynamically
    import('jspdf').then(({ jsPDF }) => {
      const doc = new jsPDF();
      
      // Set up the document
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Fee Management Analytics Report', 20, 30);
      
      // Add generation date
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 20, 40);
      doc.text(`Period: ${selectedPeriod} | Class: ${selectedClass === 'all' ? 'All Classes' : classes.find(c => c.id.toString() === selectedClass)?.class_name || selectedClass}`, 20, 47);
      
      let yPosition = 60;
      
      // Executive Summary Section
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Executive Summary', 20, yPosition);
      yPosition += 10;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Collections: ${formatCurrencyForCSV(stats.total_collections)}`, 20, yPosition);
      yPosition += 7;
      doc.text(`Pending Amount: ${formatCurrencyForCSV(stats.pending_amount)}`, 20, yPosition);
      yPosition += 7;
      doc.text(`Overdue Amount: ${formatCurrencyForCSV(stats.overdue_amount)}`, 20, yPosition);
      yPosition += 7;
      doc.text(`Collection Rate: ${formatPercentage(stats.collection_rate)}`, 20, yPosition);
      yPosition += 7;
      doc.text(`Total Students: ${stats.total_students}`, 20, yPosition);
      yPosition += 15;
      
      // Monthly Trends Section
      if (monthlyData.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Monthly Trends', 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        monthlyData.forEach(data => {
          doc.text(`${data.month}: Collections: ${formatCurrencyForCSV(data.collections)}, Pending: ${formatCurrencyForCSV(data.pending)}`, 20, yPosition);
          yPosition += 7;
        });
        yPosition += 10;
      }
      
      // Class Performance Section
      if (classPerformance.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Class Performance', 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        classPerformance.forEach(data => {
          doc.text(`${data.class_name}: ${formatPercentage(data.collection_rate)} collection rate (${data.student_count} students)`, 20, yPosition);
          yPosition += 7;
        });
        yPosition += 10;
      }
      
      // Payment Method Distribution Section
      if (paymentMethods.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Payment Method Distribution', 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        paymentMethods.forEach(data => {
          doc.text(`${data.method}: ${formatPercentage(data.percentage)} (${formatCurrencyForCSV(data.amount)})`, 20, yPosition);
          yPosition += 7;
        });
      }
      
      // Add footer
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text('Generated by School Management System', 20, pageHeight - 20);
      
      // Save the PDF
      doc.save(`fee_analytics_${new Date().toISOString().split('T')[0]}.pdf`);
    }).catch(error => {
      console.error('Error generating PDF:', error);
      alert('Failed to generate analytics report. Please try again.');
    });
  };

  const handlePaymentSummary = () => {
    setShowPaymentSummary(true);
  };

  const getPeriodLabel = (period: string) => {
    const periodLabels = {
      current_month: 'Current Month',
      last_month: 'Last Month',
      current_quarter: 'Current Quarter',
      current_year: 'Current Year'
    };
    return periodLabels[period as keyof typeof periodLabels] || period;
  };

  return (
    <div className="space-y-6 fee-reports">
      <style>{`
        /* Hide any images (logos) within the reports section */
        .fee-reports img { display: none !important; }
        /* Hide decorative icons (Heroicons are SVGs) */
        .fee-reports svg { display: none !important; }
      `}</style>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Fee Reports & Analytics</h2>
        <div className="flex space-x-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="current_month">Current Month</option>
            <option value="last_month">Last Month</option>
            <option value="current_quarter">Current Quarter</option>
            <option value="current_year">Current Year</option>
          </select>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="all">All Classes</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id.toString()}>
                {cls.class_name} (Grade {cls.grade_level})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Period Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <DocumentChartBarIcon className="h-5 w-5 text-blue-600 mr-2" />
          <span className="text-sm font-medium text-blue-800">
            Showing data for: {getPeriodLabel(selectedPeriod)}
            {selectedClass !== 'all' && ` - Class ${selectedClass}`}
          </span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Collections</p>
              <p className="text-2xl font-semibold text-gray-900">
                {loading ? '...' : formatCurrency(stats.total_collections)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ChartBarIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending Amount</p>
              <p className="text-2xl font-semibold text-gray-900">
                {loading ? '...' : formatCurrency(stats.pending_amount)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DocumentChartBarIcon className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Overdue Amount</p>
              <p className="text-2xl font-semibold text-gray-900">
                {loading ? '...' : formatCurrency(stats.overdue_amount)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UserGroupIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Collection Rate</p>
              <p className="text-2xl font-semibold text-gray-900">
                {loading ? '...' : formatPercentage(stats.collection_rate)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Trend Chart */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Collection Trends</h3>
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="text-gray-500">Loading chart data...</div>
          </div>
        ) : monthlyData.length === 0 ? (
          <div className="h-64 flex items-center justify-center">
            <div className="text-gray-500">No data available for the selected period</div>
          </div>
        ) : (
          <div className="h-64">
            {/* Simple bar chart representation */}
            <div className="flex items-end justify-between h-48 border-b border-l border-gray-200">
              {monthlyData.map((data, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div className="relative">
                    <div 
                      className="bg-blue-500 rounded-t w-8 mb-2"
                      style={{ height: `${(data.collections / Math.max(...monthlyData.map(d => d.collections))) * 120}px` }}
                    ></div>
                    <div 
                      className="bg-yellow-500 rounded-t w-8"
                      style={{ height: `${(data.pending / Math.max(...monthlyData.map(d => Math.max(d.collections, d.pending)))) * 80}px` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-600">{data.month}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-center space-x-6 mt-4">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
                <span className="text-sm text-gray-600">Collections</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded mr-2"></div>
                <span className="text-sm text-gray-600">Pending</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detailed Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Class-wise Performance */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Class-wise Performance</h3>
          {loading ? (
            <div className="h-32 flex items-center justify-center">
              <div className="text-gray-500">Loading class performance data...</div>
            </div>
          ) : classPerformance.length === 0 ? (
            <div className="h-32 flex items-center justify-center">
              <div className="text-gray-500">No class performance data available</div>
            </div>
          ) : (
            <div className="space-y-3">
              {classPerformance.map((classData) => (
                <div key={classData.class_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-700">{classData.class_name}</span>
                    <span className="text-xs text-gray-500">Grade {classData.grade_level} • {classData.student_count} students</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(classData.collections)}
                      </div>
                      <div className="text-xs text-gray-500">
                        of {formatCurrency(classData.total_due)}
                      </div>
                    </div>
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${Math.min(classData.collection_rate, 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-600 w-12">
                      {classData.collection_rate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment Method Distribution */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Method Distribution</h3>
          {loading ? (
            <div className="h-32 flex items-center justify-center">
              <div className="text-gray-500">Loading payment method data...</div>
            </div>
          ) : paymentMethods.length === 0 ? (
            <div className="h-32 flex items-center justify-center">
              <div className="text-gray-500">No payment method data available</div>
            </div>
          ) : (
            <div className="space-y-3">
              {paymentMethods.map((method, index) => {
                const colors = ['bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-indigo-500', 'bg-yellow-500'];
                const color = colors[index % colors.length];
                
                return (
                  <div key={method.method} className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-700 capitalize">{method.method}</span>
                      <span className="text-xs text-gray-500">{method.count} transactions</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`${color} h-2 rounded-full`}
                          style={{ width: `${method.percentage}%` }}
                        ></div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">{method.percentage.toFixed(1)}%</div>
                        <div className="text-xs text-gray-500">{formatCurrency(method.amount)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={handleExportReport}
            className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            <DocumentChartBarIcon className="h-5 w-5 mr-2" />
            Export Report
          </button>
          <button 
            onClick={handleGenerateAnalytics}
            className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            <ChartBarIcon className="h-5 w-5 mr-2" />
            Generate Analytics
          </button>
          <button 
            onClick={handlePaymentSummary}
            className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            <CurrencyDollarIcon className="h-5 w-5 mr-2" />
            Payment Summary
          </button>
        </div>
      </div>

      {/* Payment Summary Modal */}
      {showPaymentSummary && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Payment Summary</h3>
                <button
                  onClick={() => setShowPaymentSummary(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-blue-600">Total Collections</div>
                    <div className="text-2xl font-bold text-blue-900">{formatCurrency(stats.total_collections)}</div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-yellow-600">Pending Amount</div>
                    <div className="text-2xl font-bold text-yellow-900">{formatCurrency(stats.pending_amount)}</div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-red-600">Overdue Amount</div>
                    <div className="text-2xl font-bold text-red-900">{formatCurrency(stats.overdue_amount)}</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-green-600">Collection Rate</div>
                    <div className="text-2xl font-bold text-green-900">{formatPercentage(stats.collection_rate)}</div>
                  </div>
                </div>

                {/* Monthly Breakdown */}
                {monthlyData.length > 0 && (
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-2">Monthly Breakdown</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Collections</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pending</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {monthlyData.map((data, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{data.month}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(data.collections)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(data.pending)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Payment Methods */}
                {paymentMethods.length > 0 && (
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-2">Payment Methods</h4>
                    <div className="space-y-2">
                      {paymentMethods.map((method, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium text-gray-900">{method.method}</span>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">{formatCurrency(method.amount)}</div>
                            <div className="text-xs text-gray-500">{method.count} transactions ({formatPercentage(method.percentage)})</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Class Performance */}
                {classPerformance.length > 0 && (
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-2">Class Performance</h4>
                    <div className="space-y-2">
                      {classPerformance.map((classData, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <span className="font-medium text-gray-900">{classData.class_name}</span>
                            <div className="text-xs text-gray-500">{classData.student_count} students</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">{formatCurrency(classData.collections)}</div>
                            <div className="text-xs text-gray-500">{formatPercentage(classData.collection_rate)} collection rate</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Data Message */}
                {monthlyData.length === 0 && paymentMethods.length === 0 && classPerformance.length === 0 && (
                  <div className="text-center py-8">
                    <div className="text-gray-500">No data available for the selected period and class.</div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowPaymentSummary(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeeReports;
