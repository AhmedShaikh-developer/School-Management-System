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
  const [editingStudentScholarship, setEditingStudentScholarship] = useState<StudentScholarship | null>(null);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [activeTab, setActiveTab] = useState<'scholarships' | 'assignments'>('scholarships');
  
  // Form data state
  const [formData, setFormData] = useState({
    name: '',
    type: 'percentage' as 'percentage' | 'fixed',
    value: '',
    criteria: '',
    max_students: '',
    valid_from: '',
    valid_to: '',
    description: ''
  });
  
  const [formLoading, setFormLoading] = useState(false);
  
  // Assignment form data state
  const [assignmentFormData, setAssignmentFormData] = useState({
    student_id: '',
    scholarship_id: '',
    amount: '',
    valid_from: '',
    valid_to: '',
    notes: ''
  });
  
  const [assignmentFormLoading, setAssignmentFormLoading] = useState(false);
  const [students, setStudents] = useState<Array<{ id: number; first_name: string; last_name: string; class_id: number }>>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    if (activeTab === 'scholarships') {
      fetchScholarships();
    } else {
      fetchStudentScholarships();
    }
  }, [tenantToken, activeTab]);

  useEffect(() => {
    if (showAssignmentForm) {
      fetchStudents();
    }
  }, [showAssignmentForm]);

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
          // Map database field names to frontend field names
          const mappedScholarships = data.data.map((scholarship: any) => ({
            ...scholarship,
            scholarship_name: scholarship.name,
            scholarship_type: scholarship.type,
            scholarship_value: scholarship.value,
            status: scholarship.is_active ? 'active' : 'inactive'
          }));
          setScholarships(mappedScholarships);
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

  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      const response = await fetch('http://localhost:5000/api/students?limit=1000', {
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Handle different possible response structures
        if (data.data && data.data.students && Array.isArray(data.data.students)) {
          setStudents(data.data.students);
        } else if (Array.isArray(data.data)) {
          setStudents(data.data);
        } else if (Array.isArray(data)) {
          setStudents(data);
        } else if (data.students && Array.isArray(data.students)) {
          setStudents(data.students);
        } else if (data.success && Array.isArray(data.data)) {
          setStudents(data.data);
        } else {
          setStudents([]);
        }
      } else {
        setStudents([]);
      }
    } catch (error) {
      setStudents([]);
    } finally {
      setLoadingStudents(false);
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
    setFormData({
      name: scholarship.scholarship_name || (scholarship as any).name || '',
      type: scholarship.scholarship_type || (scholarship as any).type || 'percentage',
      value: scholarship.scholarship_value?.toString() || (scholarship as any).value?.toString() || '',
      criteria: scholarship.criteria || '',
      max_students: scholarship.max_students?.toString() || '',
      valid_from: scholarship.valid_from || '',
      valid_to: scholarship.valid_to || '',
      description: scholarship.description || ''
    });
    setShowScholarshipForm(true);
  };

  const handleEditStudentScholarship = (studentScholarship: StudentScholarship) => {
    setEditingStudentScholarship(studentScholarship);
    setAssignmentFormData({
      student_id: studentScholarship.student_id.toString(),
      scholarship_id: studentScholarship.scholarship_id.toString(),
      amount: studentScholarship.amount.toString(),
      valid_from: studentScholarship.valid_from,
      valid_to: studentScholarship.valid_to,
      notes: studentScholarship.notes || ''
    });
    setShowAssignmentForm(true);
  };

  const handleFormClose = () => {
    setShowScholarshipForm(false);
    setShowAssignmentForm(false);
    setEditingScholarship(null);
    setEditingStudentScholarship(null);
    setFormData({
      name: '',
      type: 'percentage',
      value: '',
      criteria: '',
      max_students: '',
      valid_from: '',
      valid_to: '',
      description: ''
    });
    setAssignmentFormData({
      student_id: '',
      scholarship_id: '',
      amount: '',
      valid_from: '',
      valid_to: '',
      notes: ''
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.value || !formData.criteria || !formData.valid_from || !formData.valid_to) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (parseFloat(formData.value) <= 0) {
      toast.error('Scholarship value must be greater than 0');
      return;
    }

    if (new Date(formData.valid_from) >= new Date(formData.valid_to)) {
      toast.error('Valid from date must be before valid to date');
      return;
    }

    setFormLoading(true);
    try {
      const url = editingScholarship 
        ? `http://localhost:5000/api/fees/scholarships/${editingScholarship.id}`
        : 'http://localhost:5000/api/fees/scholarships';
      
      const method = editingScholarship ? 'PUT' : 'POST';

      const payload = {
        scholarship_name: formData.name,
        scholarship_type: formData.type,
        scholarship_value: parseFloat(formData.value),
        criteria: formData.criteria,
        max_students: formData.max_students ? parseInt(formData.max_students) : null,
        valid_from: formData.valid_from,
        valid_to: formData.valid_to,
        description: formData.description
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
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
    } finally {
      setFormLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAssignmentFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!assignmentFormData.student_id || !assignmentFormData.scholarship_id || !assignmentFormData.amount || !assignmentFormData.valid_from || !assignmentFormData.valid_to) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (parseFloat(assignmentFormData.amount) <= 0) {
      toast.error('Scholarship amount must be greater than 0');
      return;
    }

    if (new Date(assignmentFormData.valid_from) >= new Date(assignmentFormData.valid_to)) {
      toast.error('Valid from date must be before valid to date');
      return;
    }

    setAssignmentFormLoading(true);
    try {
      const payload = {
        student_id: parseInt(assignmentFormData.student_id),
        scholarship_id: parseInt(assignmentFormData.scholarship_id),
        amount: parseFloat(assignmentFormData.amount),
        valid_from: assignmentFormData.valid_from,
        valid_to: assignmentFormData.valid_to,
        notes: assignmentFormData.notes
      };

      let url = 'http://localhost:5000/api/fees/scholarships/assign';
      let method = 'POST';
      
      // If editing, use PUT method and include the ID
      if (editingStudentScholarship) {
        url = `http://localhost:5000/api/fees/student-scholarships/${editingStudentScholarship.id}`;
        method = 'PUT';
      }

      const response = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success(editingStudentScholarship ? 'Scholarship assignment updated successfully' : 'Scholarship assigned successfully');
          handleFormClose();
          fetchStudentScholarships();
        }
      } else {
        const error = await response.json();
        toast.error(error.error || (editingStudentScholarship ? 'Failed to update scholarship assignment' : 'Failed to assign scholarship'));
      }
    } catch (error) {
      console.error('Error with scholarship assignment:', error);
      toast.error(editingStudentScholarship ? 'Failed to update scholarship assignment' : 'Failed to assign scholarship');
    } finally {
      setAssignmentFormLoading(false);
    }
  };

  const handleAssignmentInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAssignmentFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    // Find the current scholarship to get its data
    const currentScholarship = scholarships.find(s => s.id === id);
    if (!currentScholarship) {
      toast.error('Scholarship not found');
      return;
    }

    const currentStatus = currentScholarship.status;

    // Don't show confirmation if status is the same
    if (currentStatus === newStatus) {
      return;
    }

    // Show confirmation dialog
    if (!window.confirm(`Are you sure you want to change the status from "${currentStatus}" to "${newStatus}"?`)) {
      return;
    }

    try {
      // Prepare update data with all required fields (backend requires all fields)
      const updateData = {
        scholarship_name: currentScholarship.scholarship_name || (currentScholarship as any).name,
        scholarship_type: currentScholarship.scholarship_type || (currentScholarship as any).type,
        scholarship_value: currentScholarship.scholarship_value || (currentScholarship as any).value,
        criteria: currentScholarship.criteria,
        max_students: currentScholarship.max_students,
        valid_from: currentScholarship.valid_from,
        valid_to: currentScholarship.valid_to,
        description: currentScholarship.description,
        status: newStatus
      };
      
      const response = await fetch(`http://localhost:5000/api/fees/scholarships/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success(`Scholarship status changed to ${newStatus}`);
          fetchScholarships();
        }
      } else {
        const error = await response.json();
        toast.error(error.error || error.message || 'Failed to update scholarship status');
      }
    } catch (error) {
      console.error('Error updating scholarship status:', error);
      toast.error('Failed to update scholarship status');
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
                            {scholarship.scholarship_name || (scholarship as any).name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {scholarship.description}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getTypeBadge(scholarship.scholarship_type || (scholarship as any).type)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {(scholarship.scholarship_type || (scholarship as any).type) === 'percentage' 
                            ? `${scholarship.scholarship_value || (scholarship as any).value}%`
                            : `₹${scholarship.scholarship_value || (scholarship as any).value}`
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(scholarship.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
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
                          <select
                            value={scholarship.status}
                            onChange={(e) => scholarship.id && handleStatusChange(scholarship.id, e.target.value)}
                            className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            title="Change Status"
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="expired">Expired</option>
                          </select>
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
                    Period
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
                          {studentScholarship.first_name && studentScholarship.last_name 
                            ? `${studentScholarship.first_name} ${studentScholarship.last_name}`
                            : `Student ID: ${studentScholarship.student_id}`
                          }
                        </div>
                        {studentScholarship.first_name && studentScholarship.last_name && (
                          <div className="text-xs text-gray-500">
                            ID: {studentScholarship.student_id}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {studentScholarship.scholarship_name || `Scholarship ID: ${studentScholarship.scholarship_id}`}
                        </div>
                        {studentScholarship.scholarship_name && (
                          <div className="text-xs text-gray-500">
                            {studentScholarship.scholarship_type === 'percentage' 
                              ? `${studentScholarship.scholarship_value}%`
                              : `₹${studentScholarship.scholarship_value}`
                            }
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {studentScholarship.academic_year_name || 
                           (studentScholarship.academic_year_id ? `AY: ${studentScholarship.academic_year_id}` : 
                            `${new Date(studentScholarship.valid_from).toLocaleDateString()} to ${new Date(studentScholarship.valid_to).toLocaleDateString()}`)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(studentScholarship.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditStudentScholarship(studentScholarship)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit Assignment"
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

            <form onSubmit={handleFormSubmit} className="space-y-6">
              {/* Scholarship Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scholarship Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter scholarship name"
                  required
                />
              </div>

              {/* Scholarship Type and Value */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Scholarship Type *
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Scholarship Value *
                  </label>
                  <input
                    type="number"
                    name="value"
                    value={formData.value}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder={formData.type === 'percentage' ? 'Enter percentage' : 'Enter amount'}
                    min="0"
                    step={formData.type === 'percentage' ? '0.01' : '1'}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.type === 'percentage' ? 'Enter percentage (e.g., 25 for 25%)' : 'Enter amount in rupees'}
                  </p>
                </div>
              </div>

              {/* Criteria */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Criteria *
                </label>
                <textarea
                  name="criteria"
                  value={formData.criteria}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter scholarship criteria (e.g., Academic performance, Financial need, etc.)"
                  required
                />
              </div>

              {/* Max Students */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Students (Optional)
                </label>
                <input
                  type="number"
                  name="max_students"
                  value={formData.max_students}
                  onChange={handleInputChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter maximum number of students"
                  min="1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty for unlimited students
                </p>
              </div>

              {/* Validity Period */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valid From *
                  </label>
                  <input
                    type="date"
                    name="valid_from"
                    value={formData.valid_from}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valid To *
                  </label>
                  <input
                    type="date"
                    name="valid_to"
                    value={formData.valid_to}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter scholarship description (optional)"
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleFormClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formLoading ? 'Saving...' : (editingScholarship ? 'Update Scholarship' : 'Create Scholarship')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assignment Form Modal */}
      {showAssignmentForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                {editingStudentScholarship ? 'Edit Scholarship Assignment' : 'Assign Scholarship to Student'}
              </h3>
              <button
                onClick={handleFormClose}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAssignmentFormSubmit} className="space-y-6">
              {/* Student Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Student *
                </label>
                <select
                  name="student_id"
                  value={assignmentFormData.student_id}
                  onChange={handleAssignmentInputChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="">Choose a student</option>
                  {loadingStudents ? (
                    <option disabled>Loading students...</option>
                  ) : Array.isArray(students) && students.length > 0 ? (
                    students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.first_name} {student.last_name}
                      </option>
                    ))
                  ) : (
                    <option disabled>No students available</option>
                  )}
                </select>
              </div>

              {/* Scholarship Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Scholarship *
                </label>
                <select
                  name="scholarship_id"
                  value={assignmentFormData.scholarship_id}
                  onChange={handleAssignmentInputChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="">Choose a scholarship</option>
                  {scholarships.filter(s => s.status === 'active').map((scholarship) => (
                    <option key={scholarship.id} value={scholarship.id}>
                      {scholarship.scholarship_name || (scholarship as any).name} - {(scholarship.scholarship_type || (scholarship as any).type) === 'percentage' 
                        ? `${scholarship.scholarship_value || (scholarship as any).value}%`
                        : `₹${scholarship.scholarship_value || (scholarship as any).value}`
                      }
                    </option>
                  ))}
                </select>
              </div>

              {/* Scholarship Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scholarship Amount *
                </label>
                <input
                  type="number"
                  name="amount"
                  value={assignmentFormData.amount}
                  onChange={handleAssignmentInputChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter scholarship amount"
                  min="0"
                  step="0.01"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the amount in rupees
                </p>
              </div>

              {/* Validity Period */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valid From *
                  </label>
                  <input
                    type="date"
                    name="valid_from"
                    value={assignmentFormData.valid_from}
                    onChange={handleAssignmentInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valid To *
                  </label>
                  <input
                    type="date"
                    name="valid_to"
                    value={assignmentFormData.valid_to}
                    onChange={handleAssignmentInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={assignmentFormData.notes}
                  onChange={handleAssignmentInputChange}
                  rows={3}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter any additional notes (optional)"
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleFormClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignmentFormLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {assignmentFormLoading ? (editingStudentScholarship ? 'Updating...' : 'Assigning...') : (editingStudentScholarship ? 'Update Assignment' : 'Assign Scholarship')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScholarshipManagement;
