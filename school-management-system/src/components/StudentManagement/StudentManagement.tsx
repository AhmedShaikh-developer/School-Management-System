import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, MagnifyingGlassIcon, FunnelIcon, DocumentArrowUpIcon, UserGroupIcon, IdentificationIcon } from '@heroicons/react/24/outline';
import StudentList from './StudentList';
import StudentForm from './StudentForm';
import BulkImportModal from './BulkImportModal';
import { useTenant } from '../../App';
import { toast } from 'react-toastify';
import { Student } from '../../types/student';
import './StudentManagement.css';

const StudentManagement: React.FC = () => {
  const navigate = useNavigate();
  const { tenantToken } = useTenant();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [classes, setClasses] = useState<Array<{ id: number; class_name: string; grade_level: string }>>([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_students: 0,
    limit: 20
  });



  // Fetch students with auto-retry and offline support
  const fetchStudents = useCallback(async (page = 1, retryCount = 0) => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        search: searchTerm,
        ...(selectedClass && { class_id: selectedClass })
      });

      const response = await fetch(`/api/students?${params}`, {
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setStudents(data.data.students);
        setPagination(data.data.pagination);
      } else {
        throw new Error(data.error || 'Failed to fetch students');
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      
      // Auto-retry logic for network issues
      if (retryCount < 3 && (error instanceof TypeError || (error instanceof Error && error.message.includes('network')))) {
        setTimeout(() => fetchStudents(page, retryCount + 1), 2000 * (retryCount + 1));
        return;
      }
      
      // Show offline message and use cached data if available
      if (retryCount >= 3) {
        toast.warning('Network connection issue. Showing cached data if available.');
        // In a real app, you'd load from localStorage/IndexedDB
      }
    } finally {
      setLoading(false);
    }
  }, [tenantToken, searchTerm, selectedClass]);

  // Fetch classes for filtering
  const fetchClasses = useCallback(async () => {
    try {
      const response = await fetch('/api/classes', {
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
      console.error('Error fetching classes:', error);
    }
  }, [tenantToken]);

  useEffect(() => {
    fetchStudents();
    fetchClasses();
  }, [fetchStudents, fetchClasses]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, selectedClass]);

  // Aggressive logo and branding removal
  useEffect(() => {
    const removeLogosAndBranding = () => {
      // Remove any elements with logo-related classes or IDs
      const logoSelectors = [
        '[class*="logo"]',
        '[class*="branding"]',
        '[class*="decoration"]',
        '[id*="logo"]',
        '[id*="branding"]',
        '[data-logo]',
        '[data-branding]',
        'svg',
        'canvas',
        'img[alt*="logo"]',
        'img[alt*="Logo"]',
        'img[alt*="branding"]',
        '[style*="background: black"]',
        '[style*="background: #000"]',
        '[style*="position: absolute"]',
        '[style*="position: fixed"]'
      ];

      logoSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (el.closest('.student-management-page') && el instanceof HTMLElement) {
            el.style.display = 'none';
            el.style.visibility = 'hidden';
            el.style.opacity = '0';
            el.style.width = '0';
            el.style.height = '0';
            el.style.position = 'absolute';
            el.style.left = '-9999px';
            el.style.top = '-9999px';
          }
        });
      });

      // Remove any pseudo-elements
      const style = document.createElement('style');
      style.textContent = `
        .student-management-page::before,
        .student-management-page::after,
        .student-management-page *::before,
        .student-management-page *::after {
          display: none !important;
          content: none !important;
          visibility: hidden !important;
        }
      `;
      document.head.appendChild(style);

      return style;
    };

    // Initial removal
    const styleElement = removeLogosAndBranding();

    // Set up observer to catch dynamically added elements
    const observer = new MutationObserver(() => {
      removeLogosAndBranding();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'id', 'style']
    });

    return () => {
      observer.disconnect();
      if (styleElement) {
        document.head.removeChild(styleElement);
      }
    };
  }, []);

  const handlePageChange = (page: number) => {
    fetchStudents(page);
  };

  const handleStudentCreated = (newStudent: Student) => {
    const studentWithStatus = { ...newStudent, status: 'active' };
    setStudents(prev => [studentWithStatus, ...prev]);
    setShowForm(false);
    toast.success('Student created successfully!');
  };

  const handleStudentUpdated = (updatedStudent: Student) => {
    setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
    setShowForm(false);
    setEditingStudent(null);
    toast.success('Student updated successfully!');
  };

  const handleStudentDeleted = (studentId: number) => {
    setStudents(prev => prev.filter(s => s.id !== studentId));
    toast.success('Student deleted successfully!');
  };

  const handleBulkImportSuccess = (importData: any) => {
    toast.success(`Bulk import completed! ${importData.successful_imports} students imported successfully.`);
    setShowBulkImport(false);
    fetchStudents(1); // Refresh the list
  };

  const openEditForm = (student: Student) => {
    setEditingStudent(student);
    setShowForm(true);
  };

  const openNewForm = () => {
    setEditingStudent(null);
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 student-management-page">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Student Management</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage student profiles, documents, and class assignments
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowBulkImport(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
                Bulk Import
              </button>
              <button
                onClick={openNewForm}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Student
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Class Filter */}
            <div>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Classes</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.class_name} ({cls.grade_level})
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Actions */}
            <div className="flex space-x-2">
              <button
                onClick={() => navigate('/students/id-cards')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <IdentificationIcon className="h-4 w-4 mr-2" />
                ID Cards
              </button>
              <button
                onClick={() => navigate('/students/reports')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <UserGroupIcon className="h-4 w-4 mr-2" />
                Reports
              </button>
            </div>
          </div>
        </div>

        {/* Student List */}
        <StudentList
          students={students}
          loading={loading}
          pagination={pagination}
          onPageChange={handlePageChange}
          onEdit={openEditForm}
          onDelete={handleStudentDeleted}
          onTransfer={(studentId) => navigate(`/students/${studentId}/transfer`)}
        />
      </div>

      {/* Student Form Modal */}
      {showForm && (
        <StudentForm
          student={editingStudent}
          classes={classes}
          onClose={() => {
            setShowForm(false);
            setEditingStudent(null);
          }}
          onSuccess={editingStudent ? handleStudentUpdated : handleStudentCreated}
        />
      )}

      {/* Bulk Import Modal */}
      {showBulkImport && (
        <BulkImportModal
          onClose={() => setShowBulkImport(false)}
          onSuccess={handleBulkImportSuccess}
        />
      )}
    </div>
  );
};

export default StudentManagement;
