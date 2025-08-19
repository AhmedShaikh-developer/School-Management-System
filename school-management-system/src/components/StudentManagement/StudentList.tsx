import React, { useState } from 'react';
import { PencilIcon, TrashIcon, ArrowRightIcon, EyeIcon, DocumentIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import { Student, StudentListProps } from '../../types/student';

const StudentList: React.FC<StudentListProps> = ({
  students,
  loading,
  pagination,
  onPageChange,
  onEdit,
  onDelete,
  onTransfer,
  onAssignClass
}) => {
  const [deletingStudent, setDeletingStudent] = useState<number | null>(null);

  const handleDelete = async (studentId: number) => {
    if (!window.confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
      return;
    }

    setDeletingStudent(studentId);
    try {
      const response = await fetch(`http://localhost:5000/api/students/${studentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('tenantToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        onDelete(studentId);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete student');
      }
    } catch (error) {
      console.error('Error deleting student:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setDeletingStudent(null);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (status?: string) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', text: 'Active' },
      inactive: { color: 'bg-gray-100 text-gray-800', text: 'Inactive' },
      graduated: { color: 'bg-blue-100 text-blue-800', text: 'Graduated' },
      transferred: { color: 'bg-yellow-100 text-yellow-800', text: 'Transferred' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-12">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
          <p className="mt-2 text-center text-sm text-gray-600">Loading students...</p>
        </div>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-12">
          <div className="text-center">
            <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No students found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by adding your first student or importing from CSV.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Table Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
          <h3 className="text-lg font-medium text-gray-900">
            Students ({pagination.total_students})
          </h3>
          <div className="text-sm text-gray-500">
            Showing {((pagination.current_page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.current_page * pagination.limit, pagination.total_students)} of{' '}
            {pagination.total_students} results
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student
              </th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Class
              </th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Enrollment
              </th>
              <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {students.map((student) => (
              <tr key={student.id} className="hover:bg-gray-50">
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-xs sm:text-sm font-medium text-blue-600">
                          {student.first_name?.charAt(0) || ''}{student.last_name?.charAt(0) || ''}
                        </span>
                      </div>
                    </div>
                    <div className="ml-2 sm:ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {student.first_name || ''} {student.last_name || ''}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500">
                        ID: {student.student_id || 'N/A'}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{student.email}</div>
                  {student.phone && (
                    <div className="text-sm text-gray-500">{student.phone}</div>
                  )}
                </td>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                  {student.class_name ? (
                    <div>
                      <div className="text-sm text-gray-900">{student.class_name}</div>
                      <div className="text-sm text-gray-500">Grade {student.grade_level}</div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Not Assigned</span>
                  )}
                </td>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(student.status || 'inactive')}
                </td>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(student.enrollment_date || undefined)}
                </td>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex flex-wrap justify-end gap-1 sm:gap-2">
                    {/* View Details button */}
                    <button
                      onClick={() => onEdit(student)}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 hover:border-gray-400 transition-colors"
                      title="View student details"
                    >
                      <EyeIcon className="h-3 w-3 sm:mr-1" />
                      <span className="hidden md:inline">View</span>
                    </button>
                    
                    {/* Assign Class button for unassigned students */}
                    {!student.class_id && (
                      <button
                        onClick={() => onAssignClass(student)}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-green-100 border border-green-300 rounded-md hover:bg-green-200 hover:border-green-400 transition-colors"
                        title="Assign class to this student"
                      >
                        <AcademicCapIcon className="h-3 w-3 sm:mr-1" />
                        <span className="hidden md:inline">Assign Class</span>
                      </button>
                    )}
                    
                    <button
                      onClick={() => onEdit(student)}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded-md hover:bg-blue-200 hover:border-blue-400 transition-colors"
                      title="Edit student information"
                    >
                      <PencilIcon className="h-3 w-3 sm:mr-1" />
                      <span className="hidden md:inline">Edit</span>
                    </button>
                    
                    <button
                      onClick={() => student.id && onTransfer(student.id)}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 border border-yellow-300 rounded-md hover:bg-yellow-200 hover:border-yellow-400 transition-colors"
                      title="Transfer student to another class"
                      disabled={!student.id}
                    >
                      <ArrowRightIcon className="h-3 w-3 sm:mr-1" />
                      <span className="hidden md:inline">Transfer</span>
                    </button>
                    
                    <button
                      onClick={() => student.id && handleDelete(student.id)}
                      disabled={deletingStudent === student.id || !student.id}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 hover:border-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete this student"
                    >
                      {deletingStudent === student.id ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600 sm:mr-1"></div>
                      ) : (
                        <TrashIcon className="h-3 w-3 sm:mr-1" />
                      )}
                      <span className="hidden md:inline">Delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => onPageChange(pagination.current_page - 1)}
              disabled={pagination.current_page === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(pagination.current_page + 1)}
              disabled={pagination.current_page === pagination.total_pages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">{((pagination.current_page - 1) * pagination.limit) + 1}</span>
                {' '}to{' '}
                <span className="font-medium">
                  {Math.min(pagination.current_page * pagination.limit, pagination.total_students)}
                </span>
                {' '}of{' '}
                <span className="font-medium">{pagination.total_students}</span>
                {' '}results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => onPageChange(pagination.current_page - 1)}
                  disabled={pagination.current_page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Previous</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {Array.from({ length: pagination.total_pages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      page === pagination.current_page
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={() => onPageChange(pagination.current_page + 1)}
                  disabled={pagination.current_page === pagination.total_pages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Next</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentList;
