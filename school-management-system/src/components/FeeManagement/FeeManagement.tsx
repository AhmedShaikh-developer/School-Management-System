import React, { useState, useEffect } from 'react';
import { 
  DocumentTextIcon,
  CreditCardIcon,
  BellIcon,
  GiftIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import { useTenant } from '../../App';
import FeeStructureManagement from './FeeStructureManagement';
import VoucherManagement from './VoucherManagement';
import PaymentManagement from './PaymentManagement';
import DiscountManagement from './DiscountManagement';
import ScholarshipManagement from './ScholarshipManagement';
import ReminderManagement from './ReminderManagement';
import FeeReports from './FeeReports';

interface FeeStats {
  total_collections: number;
  pending_amount: number;
  overdue_amount: number;
  total_vouchers: number;
  paid_vouchers: number;
  pending_vouchers: number;
  overdue_vouchers: number;
}

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

const FeeManagement: React.FC = () => {
  const { tenantToken } = useTenant();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<FeeStats | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [feeTablesExist, setFeeTablesExist] = useState<boolean | null>(null);

  // Fetch initial data
  useEffect(() => {
    fetchClasses();
    fetchAcademicYears();
    checkFeeTablesExist();
    if (activeTab === 'overview') {
      fetchStats();
    }
  }, [tenantToken, activeTab]);

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
      }
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  };

  const fetchAcademicYears = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/academic-years', {
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAcademicYears(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch academic years:', error);
    }
  };

  const checkFeeTablesExist = async () => {
    try {
      // Try to fetch fee structures to check if tables exist
      const response = await fetch('http://localhost:5000/api/fees/structures', {
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      // If we get a response (even empty), tables exist
      setFeeTablesExist(response.ok);
    } catch (error) {
      // If there's an error, tables likely don't exist
      setFeeTablesExist(false);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      // This would be implemented as a stats endpoint in the backend
      // For now, we'll simulate the stats
      const mockStats: FeeStats = {
        total_collections: 1250000,
        pending_amount: 450000,
        overdue_amount: 125000,
        total_vouchers: 850,
        paid_vouchers: 520,
        pending_vouchers: 280,
        overdue_vouchers: 50
      };
      
      setStats(mockStats);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      toast.error('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const sendOverdueReminders = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/fees/reminders/overdue', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'Overdue reminders sent successfully');
        fetchStats(); // Refresh stats
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to send reminders');
      }
    } catch (error) {
      console.error('Error sending reminders:', error);
      toast.error('Failed to send reminders');
    } finally {
      setLoading(false);
    }
  };

  const sendUpcomingReminders = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/fees/reminders/upcoming', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'Upcoming due reminders sent successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to send reminders');
      }
    } catch (error) {
      console.error('Error sending reminders:', error);
      toast.error('Failed to send reminders');
    } finally {
      setLoading(false);
    }
  };

  const setupFeeManagement = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/fees/setup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'Fee management tables initialized successfully');
        // Refresh stats and table existence check after setup
        fetchStats();
        checkFeeTablesExist();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to setup fee management');
      }
    } catch (error) {
      console.error('Error setting up fee management:', error);
      toast.error('Failed to setup fee management');
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

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'structures', name: 'Fee Structures', icon: Cog6ToothIcon },
    { id: 'vouchers', name: 'Vouchers', icon: DocumentTextIcon },
    { id: 'payments', name: 'Payments', icon: CreditCardIcon },
    { id: 'discounts', name: 'Discounts', icon: GiftIcon },
    { id: 'scholarships', name: 'Scholarships', icon: GiftIcon },
    { id: 'reminders', name: 'Reminders', icon: BellIcon },
    { id: 'reports', name: 'Reports', icon: ChartBarIcon }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Collections</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats ? formatCurrency(stats.total_collections) : '₹0'}
                  </p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Amount</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats ? formatCurrency(stats.pending_amount) : '₹0'}
                  </p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <div>
                  <p className="text-sm font-medium text-gray-600">Overdue Amount</p>
                  <p className="text-2xl font-bold text-red-600">
                    {stats ? formatCurrency(stats.overdue_amount) : '₹0'}
                  </p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Vouchers</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {stats ? stats.total_vouchers : 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Voucher Status */}
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Voucher Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {stats ? stats.paid_vouchers : 0}
                  </p>
                  <p className="text-sm text-green-800">Paid</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats ? stats.pending_vouchers : 0}
                  </p>
                  <p className="text-sm text-yellow-800">Pending</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">
                    {stats ? stats.overdue_vouchers : 0}
                  </p>
                  <p className="text-sm text-red-800">Overdue</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <h3 className="text-md font-medium text-gray-900 mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                  onClick={sendOverdueReminders}
                  disabled={loading}
                  className="flex items-center justify-center px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors text-sm"
                >
                  <BellIcon className="h-4 w-4 mr-1" />
                  Overdue
                </button>
                
                <button
                  onClick={sendUpcomingReminders}
                  disabled={loading}
                  className="flex items-center justify-center px-3 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 transition-colors text-sm"
                >
                  <BellIcon className="h-4 w-4 mr-1" />
                  Due
                </button>
                
                <button
                  onClick={() => setActiveTab('vouchers')}
                  className="flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Vouchers
                </button>
                
                <button
                  onClick={() => setActiveTab('payments')}
                  className="flex items-center justify-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                >
                  <CreditCardIcon className="h-4 w-4 mr-1" />
                  Payment
                </button>
              </div>
              
              {/* Setup Button */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={setupFeeManagement}
                  disabled={loading}
                  className={`w-full flex items-center justify-center px-4 py-2 rounded-md transition-colors text-sm ${
                    feeTablesExist 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                >
                  <Cog6ToothIcon className="h-4 w-4 mr-2" />
                  {feeTablesExist 
                    ? 'Fee Management Ready ✓' 
                    : 'Setup Fee Management Tables'
                  }
                </button>
                {feeTablesExist === false && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Click to create required database tables
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      
      case 'structures':
        return <FeeStructureManagement classes={classes} academicYears={academicYears} />;
      
      case 'vouchers':
        return <VoucherManagement classes={classes} academicYears={academicYears} />;
      
      case 'payments':
        return <PaymentManagement />;
      
      case 'discounts':
        return <DiscountManagement />;
      
      case 'scholarships':
        return <ScholarshipManagement />;
      
      case 'reminders':
        return <ReminderManagement />;
      
      case 'reports':
        return <FeeReports />;
      
      default:
        return <div>Tab not implemented yet</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Fee Management</h1>
          <p className="mt-2 text-gray-600">
            Manage fee structures, generate vouchers, process payments, and track collections
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-96">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default FeeManagement;
