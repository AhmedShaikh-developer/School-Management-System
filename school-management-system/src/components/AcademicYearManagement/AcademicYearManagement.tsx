import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useTenant } from '../../App';
import axios from 'axios';

interface AcademicYear {
  id: number;
  tenant_id: string;
  label: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

interface AcademicYearFormData {
  label: string;
  startDate: string;
  endDate: string;
  status: 'draft' | 'active' | 'archived';
}

const AcademicYearManagement: React.FC = () => {
  const { tenantId, tenantToken } = useTenant();
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<AcademicYearFormData>({
    label: '',
    startDate: '',
    endDate: '',
    status: 'draft'
  });

  useEffect(() => {
    if (tenantId && tenantToken) {
      loadAcademicYears();
    }
  }, [tenantId, tenantToken]);

  const loadAcademicYears = async () => {
    try {
      setError(null);
      
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/academic-years`,
        {
          headers: {
            'Authorization': `Bearer ${tenantToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        setAcademicYears(response.data.data);
      } else {
        const errorMsg = response.data.message || 'Failed to load academic years';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || 'Unknown error occurred';
      setError(errorMsg);
      
      if (error.response?.status === 401) {
        toast.error('Authentication failed. Please log in again.');
      } else if (error.response?.status === 404) {
        toast.error('Academic year service not found. Please check if the backend is running.');
      } else {
        toast.error(`Failed to load academic years: ${errorMsg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.label || !formData.startDate || !formData.endDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (editingId) {
        // Update existing academic year
        await axios.put(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/academic-years/${editingId}`,
          {
            label: formData.label,
            startDate: formData.startDate,
            endDate: formData.endDate,
            status: formData.status
          },
          {
            headers: {
              'Authorization': `Bearer ${tenantToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        toast.success('Academic year updated successfully');
      } else {
        // Create new academic year
        await axios.post(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/academic-years`,
          {
            label: formData.label,
            startDate: formData.startDate,
            endDate: formData.endDate,
            status: formData.status
          },
          {
            headers: {
              'Authorization': `Bearer ${tenantToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        toast.success('Academic year created successfully');
      }

      resetForm();
      loadAcademicYears();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save academic year');
    }
  };

  const handleEdit = (academicYear: AcademicYear) => {
    setEditingId(academicYear.id);
    setFormData({
      label: academicYear.label,
      startDate: academicYear.start_date,
      endDate: academicYear.end_date,
      status: academicYear.status
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this academic year?')) {
      return;
    }

    try {
      await axios.delete(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/academic-years/${id}`,
        {
          headers: {
            'Authorization': `Bearer ${tenantToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      toast.success('Academic year deleted successfully');
      loadAcademicYears();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete academic year');
    }
  };

  const handleActivate = async (id: number) => {
    if (!window.confirm('Are you sure you want to activate this academic year? This will deactivate any currently active academic year.')) {
      return;
    }

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/academic-years/${id}/activate`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${tenantToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        toast.success('Academic year activated successfully');
        // Force a fresh reload of the data
        await loadAcademicYears();
      } else {
        toast.error(response.data.message || 'Failed to activate academic year');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to activate academic year');
    }
  };

  const resetForm = () => {
    setFormData({
      label: '',
      startDate: '',
      endDate: '',
      status: 'draft'
    });
    setEditingId(null);
    setShowForm(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            ✅ Active
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            📝 Draft
          </span>
        );
      case 'archived':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            📁 Archived
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            ❓ Unknown
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading academic years...</p>
          <p className="text-sm text-gray-500 mt-2">Tenant ID: {tenantId || 'Not set'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Academic Year Management</h2>
          <p className="text-gray-600">Manage academic years for your school</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add Academic Year
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingId ? 'Edit Academic Year' : 'Add New Academic Year'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Academic Year Label *
                </label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 2024-2025"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date *
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-red-800">Error Loading Academic Years</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <button
              onClick={loadAcademicYears}
              className="ml-auto bg-red-100 text-red-800 px-3 py-1 rounded-md text-sm hover:bg-red-200 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Academic Years List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Academic Years</h3>
        </div>
        
        {!error && academicYears.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No academic years yet</h3>
            <p className="text-gray-600 mb-4">Get started by creating your first academic year</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Create Academic Year
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Academic Year
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
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
                {academicYears.map((ay) => (
                  <tr key={ay.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{ay.label}</div>
                      <div className="text-sm text-gray-500">ID: {ay.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(ay.start_date).toLocaleDateString()} - {new Date(ay.end_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(ay.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {ay.status !== 'active' && (
                          <button
                            onClick={() => handleActivate(ay.id)}
                            className="text-green-600 hover:text-green-900 transition-colors"
                            title="Activate this academic year"
                          >
                            Activate
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(ay)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="Edit this academic year"
                        >
                          Edit
                        </button>
                        {ay.status !== 'active' && (
                          <button
                            onClick={() => handleDelete(ay.id)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Delete this academic year"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>



      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Academic Year Management Features:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Create academic years with custom labels and date ranges</li>
          <li>• Only one academic year can be active at a time</li>
          <li>• Active academic year is required for attendance system</li>
          <li>• Existing classes and students are automatically linked to active academic year</li>
          <li>• Academic years can be archived but not deleted if referenced by classes/students</li>
        </ul>
      </div>
    </div>
  );
};

export default AcademicYearManagement;
