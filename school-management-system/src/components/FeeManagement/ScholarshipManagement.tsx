import React, { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, UserIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import { useTenant } from '../../App';
import { Scholarship, StudentScholarship } from '../../types/fee';

const ScholarshipManagement: React.FC = () => {
  const { tenantToken } = useTenant();
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [studentScholarships, setStudentScholarships] = useState<StudentScholarship[]>([]);
  const [loading, setLoading] = useState(false);
  const [showScholarshipForm, setShowScholarshipForm] = useState(false);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [editingScholarship, setEditingScholarship] = useState<Scholarship | null>(null);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [activeTab, setActiveTab] = useState<'scholarships' | 'assignments'>('scholarships');

  useEffect(() => {
    if (activeTab === 'scholarships') {
      fetchScholarships();
    } else {
      fetchStudentScholarships();
    }
  }, [tenantToken, activeTab]);

  const fetchScholarships = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/fees/scholarships', {
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setScholarships(data.data);
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to fetch scholarships');
      }
    } catch (error) {
      console.error('Error fetching scholarships:', error);
      toast.error('Failed to fetch scholarships');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentScholarships = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/fees/student-scholarships', {
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStudentScholarships(data.data);
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to fetch student scholarships');
      }
    } catch (error) {
      console.error('Error fetching student scholarships:', error);
      toast.error('Failed to fetch student scholarships');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteScholarship = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this scholarship?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/fees/scholarships/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success('Scholarship deleted successfully');
          fetchScholarships();
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete scholarship');
      }
    } catch (error) {
      console.error('Error deleting scholarship:', error);
      toast.error('Failed to delete scholarship');
    }
  };

  const handleEditScholarship = (scholarship: Scholarship) => {
    setEditingScholarship(scholarship);
    setShowScholarshipForm(true);
  };

  const handleFormClose = () => {
    setShowScholarshipForm(false);
    setShowAssignmentForm(false);
    setEditingScholarship(null);
  };

  const handleFormSubmit = async (formData: Partial<Scholarship>) => {
    try {
      const url = editingScholarship 
        ? `http://localhost:5000/api/fees/scholarships/${editingScholarship.id}`
        : 'http://localhost:5000/api/fees/scholarships';
      
      const method = editingScholarship ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success(editingScholarship ? 'Scholarship updated successfully' : 'Scholarship created successfully');
          handleFormClose();
          fetchScholarships();
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save scholarship');
      }
    } catch (error) {
      console.error('Error saving scholarship:', error);
      toast.error('Failed to save scholarship');
    }
  };

  const getTypeBadge = (type: string) => {
    const typeConfig = {
      merit_based: { bg: 'bg-blue-100', text: 'text-blue-800' },
      need_based: { bg: 'bg-green-100', text: 'text-green-800' },
      sports: { bg: 'bg-purple-100', text: 'text-purple-800' },
      academic: { bg: 'bg-indigo-100', text: 'text-indigo-800' }
    };

    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.merit_based;
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
        {type.replace('_', ' ')}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { bg: 'bg-green-100', text: 'text-green-800' },
      inactive: { bg: 'bg-gray-100', text: 'text-gray-800' },
      expired: { bg: 'bg-red-100', text: 'text-red-800' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
        {status}
      </span>
    );
  };

  const filteredScholarships = scholarships.filter(scholarship => {
    if (filterType && scholarship.scholarship_type !== filterType) return false;
    if (filterStatus && scholarship.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Fee Scholarships</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowAssignmentForm(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <UserIcon className="h-4 w-4 mr-2" />
            Assign Scholarship
          </button>
          <button
            onClick={() => setShowScholarshipForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Scholarship
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('scholarships')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'scholarships'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Scholarship Types
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'assignments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Student Assignments
          </button>
        </nav>
      </div>

      {/* Filters */}
      {activeTab === 'scholarships' && (
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
                <option value="merit_based">Merit Based</option>
                <option value="need_based">Need Based</option>
                <option value="sports">Sports</option>
                <option value="academic">Academic</option>
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
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="expired">Expired</option>
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
      )}

      {/* Content */}
      {activeTab === 'scholarships' ? (
        /* Scholarships Table */
        <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Scholarship Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
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
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      Loading scholarships...
                    </td>
                  </tr>
                ) : filteredScholarships.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No scholarships found
                    </td>
                  </tr>
                ) : (
                  filteredScholarships.map((scholarship) => (
                    <tr key={scholarship.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {scholarship.scholarship_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {scholarship.description}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getTypeBadge(scholarship.scholarship_type)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {scholarship.scholarship_type === 'percentage' 
                            ? `${scholarship.scholarship_value}%`
                            : `₹${scholarship.scholarship_value}`
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(scholarship.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditScholarship(scholarship)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit Scholarship"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => scholarship.id && handleDeleteScholarship(scholarship.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete Scholarship"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Student Scholarships Table */
        <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Scholarship
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Academic Year
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
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      Loading student scholarships...
                    </td>
                  </tr>
                ) : studentScholarships.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No student scholarships found
                    </td>
                  </tr>
                ) : (
                  studentScholarships.map((studentScholarship) => (
                    <tr key={studentScholarship.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          Student ID: {studentScholarship.student_id}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          Scholarship ID: {studentScholarship.scholarship_id}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          AY: {studentScholarship.academic_year_id}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(studentScholarship.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            className="text-blue-600 hover:text-blue-900"
                            title="View Details"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Scholarship Form Modal */}
      {showScholarshipForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                {editingScholarship ? 'Edit Scholarship' : 'Add New Scholarship'}
              </h3>
              <button
                onClick={handleFormClose}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">
                Scholarship form will be implemented here
              </p>
              <button
                onClick={handleFormClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Form Modal */}
      {showAssignmentForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                Assign Scholarship to Student
              </h3>
              <button
                onClick={handleFormClose}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">
                Scholarship assignment form will be implemented here
              </p>
              <button
                onClick={handleFormClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScholarshipManagement;
