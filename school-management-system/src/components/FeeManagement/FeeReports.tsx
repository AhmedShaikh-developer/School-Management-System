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
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('current_month');
  const [selectedClass, setSelectedClass] = useState('all');

  useEffect(() => {
    fetchFeeStats();
    fetchMonthlyData();
  }, [tenantToken, selectedPeriod, selectedClass]);

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
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
            <option value="1">Class 1</option>
            <option value="2">Class 2</option>
            <option value="3">Class 3</option>
            <option value="4">Class 4</option>
            <option value="5">Class 5</option>
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
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((classNum) => (
              <div key={classNum} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-700">Class {classNum}</span>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">
                    {formatCurrency(Math.floor(Math.random() * 50000) + 20000)}
                  </span>
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${Math.floor(Math.random() * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Method Distribution */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Method Distribution</h3>
          <div className="space-y-3">
            {[
              { method: 'Cash', percentage: 45, color: 'bg-green-500' },
              { method: 'Online', percentage: 35, color: 'bg-blue-500' },
              { method: 'Cheque', percentage: 15, color: 'bg-purple-500' },
              { method: 'Bank Transfer', percentage: 5, color: 'bg-indigo-500' }
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{item.method}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`${item.color} h-2 rounded-full`}
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 w-12">{item.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <DocumentChartBarIcon className="h-5 w-5 mr-2" />
            Export Report
          </button>
          <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <ChartBarIcon className="h-5 w-5 mr-2" />
            Generate Analytics
          </button>
          <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <CurrencyDollarIcon className="h-5 w-5 mr-2" />
            Payment Summary
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeeReports;
