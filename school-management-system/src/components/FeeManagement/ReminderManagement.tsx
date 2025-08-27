import React, { useState, useEffect } from 'react';
import { BellIcon, PaperAirplaneIcon, EnvelopeIcon, ClockIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import { useTenant } from '../../App';
import { FeeReminder } from '../../types/fee';

const ReminderManagement: React.FC = () => {
  const { tenantToken } = useTenant();
  const [reminders, setReminders] = useState<FeeReminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [activeTab, setActiveTab] = useState<'overdue' | 'upcoming' | 'history'>('overdue');

  useEffect(() => {
    fetchReminders();
  }, [tenantToken, activeTab]);

  const fetchReminders = async () => {
    setLoading(true);
    try {
      let endpoint = 'http://localhost:5000/api/fees/reminders/history';
      
      if (activeTab === 'overdue') {
        endpoint = 'http://localhost:5000/api/fees/reminders/overdue';
      } else if (activeTab === 'upcoming') {
        endpoint = 'http://localhost:5000/api/fees/reminders/upcoming';
      }

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setReminders(data.data);
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to fetch reminders');
      }
    } catch (error) {
      console.error('Error fetching reminders:', error);
      toast.error('Failed to fetch reminders');
    } finally {
      setLoading(false);
    }
  };

  const sendOverdueReminders = async () => {
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
        if (data.success) {
          toast.success('Overdue reminders sent successfully');
          fetchReminders();
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to send overdue reminders');
      }
    } catch (error) {
      console.error('Error sending overdue reminders:', error);
      toast.error('Failed to send overdue reminders');
    }
  };

  const sendUpcomingReminders = async () => {
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
        if (data.success) {
          toast.success('Upcoming reminders sent successfully');
          fetchReminders();
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to send upcoming reminders');
      }
    } catch (error) {
      console.error('Error sending upcoming reminders:', error);
      toast.error('Failed to send upcoming reminders');
    }
  };

  const getTypeBadge = (type: string) => {
    const typeConfig = {
      sms: { bg: 'bg-blue-100', text: 'text-blue-800', icon: <PaperAirplaneIcon className="h-3 w-3" /> },
      email: { bg: 'bg-green-100', text: 'text-green-800', icon: <EnvelopeIcon className="h-3 w-3" /> }
    };

    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.sms;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
        {config.icon}
        <span className="ml-1">{type.toUpperCase()}</span>
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      sent: { bg: 'bg-green-100', text: 'text-green-800' },
      failed: { bg: 'bg-red-100', text: 'text-red-800' },
      queued: { bg: 'bg-blue-100', text: 'text-blue-800' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
        {status}
      </span>
    );
  };

  const filteredReminders = reminders.filter(reminder => {
    if (filterType && reminder.reminder_type !== filterType) return false;
    if (filterStatus && reminder.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Fee Reminders</h2>
        <div className="flex space-x-2">
          <button
            onClick={sendUpcomingReminders}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ClockIcon className="h-4 w-4 mr-2" />
            Send Upcoming
          </button>
          <button
            onClick={sendOverdueReminders}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
          >
            <BellIcon className="h-4 w-4 mr-2" />
            Send Overdue
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overdue')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overdue'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overdue Reminders
          </button>
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'upcoming'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Upcoming Reminders
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Reminder History
          </button>
        </nav>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Type
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
              <option value="queued">Queued</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setFilterType('');
                setFilterStatus('');
              }}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Reminders Table */}
      <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reminder Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Sent
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    Loading reminders...
                  </td>
                </tr>
              ) : filteredReminders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No reminders found
                  </td>
                </tr>
              ) : (
                filteredReminders.map((reminder) => (
                  <tr key={reminder.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          Student ID: {reminder.student_id}
                        </div>
                        <div className="text-sm text-gray-500">
                          Voucher ID: {reminder.voucher_id}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getTypeBadge(reminder.reminder_type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(reminder.due_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(reminder.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {reminder.last_sent_at 
                          ? new Date(reminder.last_sent_at).toLocaleDateString()
                          : 'Never'
                        }
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BellIcon className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Overdue</p>
              <p className="text-2xl font-semibold text-gray-900">
                {reminders.filter(r => r.status === 'pending' && new Date(r.due_date) < new Date()).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Upcoming</p>
              <p className="text-2xl font-semibold text-gray-900">
                {reminders.filter(r => r.status === 'pending' && new Date(r.due_date) > new Date()).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <PaperAirplaneIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Sent Today</p>
              <p className="text-2xl font-semibold text-gray-900">
                {reminders.filter(r => r.status === 'sent' && r.last_sent_at && new Date(r.last_sent_at).toDateString() === new Date().toDateString()).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <EnvelopeIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Failed</p>
              <p className="text-2xl font-semibold text-gray-900">
                {reminders.filter(r => r.status === 'failed').length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReminderManagement;
