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
import ClassAssignmentModal from './ClassAssignmentModal';

const StudentManagement: React.FC = () => {
  const navigate = useNavigate();
  const { tenantToken } = useTenant();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>(() => {
    // Try to restore from localStorage
    const saved = localStorage.getItem('studentManagement_selectedClass');
    return saved || '';
  });
  const [showForm, setShowForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showClassAssignment, setShowClassAssignment] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [assigningStudent, setAssigningStudent] = useState<Student | null>(null);
  const [classes, setClasses] = useState<Array<{ id: number; class_name: string; grade_level: string }>>([]);
     const [pagination, setPagination] = useState({
     current_page: 1,
     total_pages: 1,
     total_students: 0,
     limit: 20,
     status: 'active' // Always active since we use hard delete
   });

  // Debug selectedClass changes
  useEffect(() => {
    console.log('selectedClass state changed to:', selectedClass);
    // Save to localStorage whenever it changes
    if (selectedClass) {
      localStorage.setItem('studentManagement_selectedClass', selectedClass);
    } else {
      localStorage.removeItem('studentManagement_selectedClass');
    }
  }, [selectedClass]);


  // Fetch students with auto-retry and offline support
  const fetchStudents = useCallback(async (page = 1, retryCount = 0) => {
    console.log(`🔄 fetchStudents called - page: ${page}, retryCount: ${retryCount}`);
    console.log(`🔄 Current state: searchTerm: "${searchTerm}", selectedClass: "${selectedClass}", status: "${pagination.status}"`);
    
    try {
      setLoading(true);
      
      // Build the query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        search: searchTerm,
        ...(pagination.status && { status: pagination.status })
      });
      
      // Add class_id filter if selected
      if (selectedClass && selectedClass !== '') {
        params.append('class_id', selectedClass);
        console.log('Adding class_id filter:', selectedClass);
      }
      
      console.log('=== FETCH STUDENTS DEBUG ===');
      console.log('Fetching students with params:', params.toString());
      console.log('Search term:', searchTerm);
      console.log('Selected class:', selectedClass);
      console.log('Selected class type:', typeof selectedClass);
      console.log('Selected class truthy check:', !!selectedClass);
      console.log('Status:', pagination.status);
      console.log('Page:', page);
      console.log('==========================');

      const response = await fetch(`http://localhost:5000/api/students?${params}`, {
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response not OK:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Students response:', data);
      
      if (data.success) {
        console.log('🔍 Students data received:');
        console.log('  - Total students:', data.data.students.length);
        console.log('  - Pagination:', data.data.pagination);
        
        // Debug each student's class_id
        data.data.students.forEach((student: any, index: number) => {
          console.log(`  - Student ${index + 1}: ${student.first_name} ${student.last_name} - class_id: ${student.class_id} (type: ${typeof student.class_id})`);
        });
        
        console.log('Setting students:', data.data.students);
        console.log('Setting pagination:', data.data.pagination);
        
        // Verify the filter was applied correctly
        if (selectedClass === 'unassigned') {
          console.log('=== VERIFYING UNASSIGNED FILTER ===');
          const unassignedStudents = data.data.students.filter((s: any) => s.class_id === null);
          const assignedStudents = data.data.students.filter((s: any) => s.class_id !== null);
          console.log('Students returned by API:', data.data.students.length);
          console.log('Unassigned students in response:', unassignedStudents.length);
          console.log('Assigned students in response:', assignedStudents.length);
          
          if (assignedStudents.length > 0) {
            console.warn('WARNING: Assigned students found in unassigned filter response!');
            assignedStudents.forEach((s: any) => {
              console.warn(`  - ${s.first_name} ${s.last_name} (Class ID: ${s.class_id})`);
            });
          }
        }
        
        console.log('🔍 Setting students state with:', data.data.students);
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
  }, [tenantToken, searchTerm, selectedClass, pagination.status]);

  // Fetch classes for filtering
  const fetchClasses = useCallback(async () => {
    try {
      console.log('Fetching classes...');
      const response = await fetch('http://localhost:5000/api/classes', {
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Classes response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Classes response data:', data);
                               if (data.success) {
                  console.log('🔍 Classes fetched successfully:');
                  console.log('  - Raw classes data:', data.data);
                  console.log('  - Classes array length:', data.data.length);
                  data.data.forEach((cls: any, index: number) => {
                    console.log(`  - Class ${index + 1}: ID=${cls.id} (type: ${typeof cls.id}), Name="${cls.class_name}", Grade="${cls.grade_level}"`);
                    console.log(`    Raw class object:`, cls);
                    console.log(`    JSON.stringify:`, JSON.stringify(cls, null, 2));
                    
                    // Check if there are any type conversion issues
                    if (typeof cls.id !== 'number') {
                      console.warn(`⚠️ Class ${index + 1} has non-numeric ID:`, cls.id, 'type:', typeof cls.id);
                    }
                    
                    // Check for potential ID mismatches
                    if (cls.class_name && cls.class_name.includes('Class ')) {
                      const expectedId = cls.class_name.replace('Class ', '');
                      if (cls.id.toString() !== expectedId) {
                        console.warn(`⚠️ POTENTIAL ID MISMATCH: Class name "${cls.class_name}" suggests ID should be ${expectedId}, but actual ID is ${cls.id}`);
                      }
                    }
                  });
                  setClasses(data.data);
                } else {
                  console.error('Classes API returned success: false:', data);
                }
      } else {
        console.error('Classes API error status:', response.status);
        const errorText = await response.text();
        console.error('Classes API error response:', errorText);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  }, [tenantToken]);

  // Initial data fetch
  useEffect(() => {
    console.log('🚀 Initial data fetch useEffect triggered');
    fetchStudents();
    fetchClasses();
  }, []); // Only run once on mount

  // Monitor students state changes
  useEffect(() => {
    console.log('🔍 Students state changed:');
    console.log('  - Total students:', students.length);
    students.forEach((student, index) => {
      console.log(`  - Student ${index + 1}: ${student.first_name} ${student.last_name} - class_id: ${student.class_id} (type: ${typeof student.class_id})`);
    });
  }, [students]);

  // Debounced search - only trigger when search term changes
  useEffect(() => {
    if (searchTerm !== '') {
      console.log('🔍 Search effect triggered:', { searchTerm });
      const timer = setTimeout(() => {
        console.log('🔍 Executing search with:', { searchTerm });
        fetchStudents(1);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [searchTerm]); // Only depend on searchTerm

  // Class filter effect - trigger immediately when class filter changes
  useEffect(() => {
    console.log('🎯 Class filter effect triggered:', selectedClass);
    console.log('  - selectedClass type:', typeof selectedClass);
    console.log('  - selectedClass value:', selectedClass);
    console.log('  - selectedClass truthy check:', !!selectedClass);
    
    // Debug: Show which class this corresponds to
    if (selectedClass && selectedClass !== 'unassigned') {
      const selectedClassObj = classes.find(c => c.id.toString() === selectedClass);
      console.log('  - Corresponding class object:', selectedClassObj);
      if (selectedClassObj) {
        console.log('  - Class ID:', selectedClassObj.id, 'type:', typeof selectedClassObj.id);
        console.log('  - Class Name:', selectedClassObj.class_name);
        console.log('  - Grade Level:', selectedClassObj.grade_level);
      } else {
        console.warn('  - ⚠️ No class object found for selectedClass:', selectedClass);
        console.log('  - Available classes:', classes.map(c => ({ id: c.id, name: c.class_name })));
      }
    }
    
    fetchStudents(1);
  }, [selectedClass, classes]); // Added classes dependency to access it in the effect

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
    console.log('🎯 handleStudentCreated called with:', newStudent);
    console.log('  - Full newStudent object:', newStudent);
    console.log('  - newStudent.class_id:', newStudent.class_id, 'type:', typeof newStudent.class_id);
    console.log('  - JSON.stringify(newStudent):', JSON.stringify(newStudent, null, 2));
    
    const studentWithStatus = { ...newStudent, status: 'active' };
    console.log('🎯 Adding student to local state:', studentWithStatus);
    console.log('  - studentWithStatus.class_id:', studentWithStatus.class_id, 'type:', typeof studentWithStatus.class_id);
    
    setStudents(prev => [studentWithStatus, ...prev]);
    setShowForm(false);
    toast.success('Student created successfully!');
    console.log('🎯 Student creation completed successfully');
  };

  const handleStudentUpdated = (updatedStudent: Student) => {
    console.log('🎯 handleStudentUpdated called with:', updatedStudent);
    console.log('  - Full updatedStudent object:', updatedStudent);
    console.log('  - updatedStudent.class_id:', updatedStudent.class_id, 'type:', typeof updatedStudent.class_id);
    console.log('  - JSON.stringify(updatedStudent):', JSON.stringify(updatedStudent, null, 2));
    
    setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
    setShowForm(false);
    setEditingStudent(null);
    toast.success('Student updated successfully!');
    console.log('🎯 Student update completed successfully');
  };

  const handleStudentDeleted = (studentId: number) => {
    setStudents(prev => prev.filter(s => s.id !== studentId));
    toast.success('Student deleted successfully');
  };

  const handleAssignClass = (student: Student) => {
    setAssigningStudent(student);
    setShowClassAssignment(true);
  };

  const handleClassAssignmentSuccess = (updatedStudent: Student) => {
    setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
    toast.success('Class assigned successfully!');
    setShowClassAssignment(false);
    setAssigningStudent(null);
    // Refresh the list after class assignment
    fetchStudents(1);
  };

     const resetFilters = () => {
     console.log('Resetting filters');
     setSearchTerm('');
     setSelectedClass('');
     // Status is always 'active' since we use hard delete
     // Fetch students without filters
     fetchStudents(1);
   };

  const manualRefresh = () => {
    console.log('Manual refresh clicked');
    console.log('Current filter state:', { selectedClass, searchTerm, status: pagination.status });
    fetchStudents(1);
  };

  const handleBulkImportSuccess = (importData: any) => {
    console.log('Bulk import success handler called with:', importData);
    toast.success(`Bulk import completed! ${importData.successful_imports} students imported successfully.`);
    setShowBulkImport(false);
    console.log('Calling fetchStudents(1) to refresh the list...');
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 sm:py-6 gap-4 sm:gap-0">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Student Management</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage student profiles, documents, and class assignments
              </p>
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
              <button
                onClick={() => setShowBulkImport(true)}
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
                Bulk Import
              </button>
              <button
                onClick={openNewForm}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Student
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Unassigned Students Summary */}
      {(() => {
        const unassignedCount = students.filter(s => s.class_id === null).length;
        return unassignedCount > 0 ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
                      <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-amber-800">
                      {unassignedCount} student{unassignedCount !== 1 ? 's' : ''} {unassignedCount !== 1 ? 'are' : 'is'} not yet assigned to any class
                    </h3>
                    <p className="text-sm text-amber-700 mt-1">
                      These students were imported without class assignments and need to be placed in appropriate classes.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedClass('unassigned')}
                  className="bg-amber-600 text-white px-4 py-2 rounded-md hover:bg-amber-700 text-sm transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>View Unassigned</span>
                </button>
              </div>
            </div>
          </div>
        ) : null;
      })()}

      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
                     {/* Debug Info */}
           <div className="mb-4 p-3 bg-gray-100 rounded-md text-sm">
             <div className="font-medium text-gray-700 mb-2">Debug Info:</div>
             <div className="grid grid-cols-2 gap-4 text-xs">
               <div>Selected Class: <span className="font-mono bg-white px-2 py-1 rounded">{selectedClass || 'None'}</span></div>
               <div>Search Term: <span className="font-mono bg-white px-2 py-1 rounded">{searchTerm || 'None'}</span></div>
               <div>Total Students: <span className="font-mono bg-white px-2 py-1 rounded">{students.length}</span></div>
               {selectedClass && selectedClass !== 'unassigned' && (
                 <div className="col-span-2">
                   <span className="font-medium text-gray-700">Class Details: </span>
                   <span className="font-mono bg-white px-2 py-1 rounded">
                     {(() => {
                       const selectedClassObj = classes.find(c => c.id.toString() === selectedClass);
                       if (selectedClassObj) {
                         return `${selectedClassObj.class_name} (${selectedClassObj.grade_level}) [ID: ${selectedClassObj.id}]`;
                       }
                       return 'Class not found';
                     })()}
                   </span>
                 </div>
               )}
             </div>
           </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => {
                  console.log('Search input changed:', e.target.value);
                  setSearchTerm(e.target.value);
                }}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:ring-blue-500"
              />
            </div>

            {/* Class Filter */}
            <div>
              <select
                value={selectedClass}
                onChange={(e) => {
                  const newClass = e.target.value;
                  console.log('🔍 Class filter changed from', selectedClass, 'to', newClass);
                  console.log('  - New class type:', typeof newClass);
                  console.log('  - New class truthy check:', !!newClass);
                  console.log('  - New class length:', newClass.length);
                  
                  // Debug: Show which class object this corresponds to
                  if (newClass && newClass !== 'unassigned') {
                    const selectedClassObj = classes.find(c => c.id.toString() === newClass);
                    console.log('  - Selected class object:', selectedClassObj);
                    console.log('  - Class ID:', selectedClassObj?.id, 'type:', typeof selectedClassObj?.id);
                    console.log('  - Class Name:', selectedClassObj?.class_name);
                    console.log('  - Grade Level:', selectedClassObj?.grade_level);
                  }
                  
                  setSelectedClass(newClass);
                  // Remove setTimeout - let useEffect handle the fetch
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Classes</option>
                                 {classes.map(cls => {
                   console.log(`🔍 Rendering class option: ID=${cls.id}, Name="${cls.class_name}", Grade="${cls.grade_level}", Value=${cls.id}`);
                   return (
                     <option key={cls.id} value={cls.id}>
                       {cls.class_name} ({cls.grade_level})
                     </option>
                   );
                 })}
                <option value="unassigned">📋 Unassigned Students</option>
              </select>
            </div>

                         {/* Status Filter - Removed since we now use hard delete */}
             <div className="hidden">
               <select
                 value="active"
                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                 disabled
               >
                 <option value="active">Active Students</option>
               </select>
             </div>

            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 col-span-1 sm:col-span-2 lg:col-span-1 xl:col-span-1">
              <button
                onClick={manualRefresh}
                className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
              <button
                onClick={resetFilters}
                className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Reset Filters
              </button>
              <button
                onClick={() => navigate('/students/id-cards')}
                className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <IdentificationIcon className="h-4 w-4 mr-2" />
                ID Cards
              </button>
              <button
                onClick={() => navigate('/students/reports')}
                className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
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
          onAssignClass={handleAssignClass}
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

      {/* Class Assignment Modal */}
      {showClassAssignment && assigningStudent && (
        <ClassAssignmentModal
          student={assigningStudent}
          classes={classes}
          onClose={() => {
            setShowClassAssignment(false);
            setAssigningStudent(null);
          }}
          onSuccess={handleClassAssignmentSuccess}
        />
      )}
    </div>
  );
};

export default StudentManagement;
