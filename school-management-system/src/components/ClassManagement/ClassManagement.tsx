import React, { useState, useEffect } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useTenant } from '../../App';
import { toast } from 'react-toastify';
import ClassList from './ClassList';
import ClassForm from './ClassForm';
import { Class } from '../../types/class';

const ClassManagement: React.FC = () => {
  const { tenantToken, tenantId } = useTenant();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      console.log('🔍 Fetching classes with token:', tenantToken ? 'Token exists' : 'No token');
      console.log('🔍 Tenant ID:', tenantId);
      
      const response = await fetch('http://localhost:5000/api/classes', {
        headers: {
          'Authorization': `Bearer ${tenantToken}`
        }
      });

      console.log('🔍 Response status:', response.status);
      const data = await response.json();
      console.log('🔍 Response data:', data);

      if (data.success) {
        console.log('✅ Fetched classes data:', data.data);
        setClasses(data.data);
      } else {
        console.log('❌ Failed to fetch classes:', data.message);
        toast.error(data.message || 'Failed to fetch classes');
      }
    } catch (error) {
      console.error('❌ Error fetching classes:', error);
      toast.error('Failed to fetch classes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClassCreated = (newClass: Class) => {
    const classWithTimestamp = {
      ...newClass,
      id: newClass.id || Date.now(), // Ensure we have an ID for the list
      created_at: newClass.created_at || new Date().toISOString()
    };
    setClasses(prev => [...prev, classWithTimestamp]);
    setShowForm(false);
  };

  const handleClassUpdated = (updatedClass: Class) => {
    const classWithTimestamp = {
      ...updatedClass,
      id: updatedClass.id || Date.now(), // Ensure we have an ID for the list
      created_at: updatedClass.created_at || new Date().toISOString()
    };
    setClasses(prev => prev.map(c => c.id === updatedClass.id ? classWithTimestamp : c));
    setEditingClass(null);
  };

  const handleEdit = (classData: Class) => {
    if (classData.id) {
      setEditingClass(classData);
      setShowForm(true);
    }
  };

  const handleDelete = async (classId: number) => {
    if (!window.confirm('Are you sure you want to delete this class?')) {
      return;
    }

    try {
      // Set loading state
      setLoading(true);
      
      console.log('🗑️ Deleting class ID:', classId);
      console.log('🔍 Using token:', tenantToken ? 'Token exists' : 'No token');
      console.log('🔍 Tenant ID:', tenantId);
      
      const response = await fetch(`http://localhost:5000/api/classes/${classId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${tenantToken}`
        }
      });

      console.log('🗑️ Delete response status:', response.status);
      const data = await response.json();
      console.log('🗑️ Delete response data:', data);

      if (data.success) {
        toast.success('Class permanently deleted!');
        console.log('✅ Delete successful, refreshing classes list...');
        // Refresh the classes list from the backend to ensure consistency
        await fetchClasses();
        console.log('✅ Classes list refreshed after deletion');
      } else {
        console.log('❌ Delete failed:', data.message);
        toast.error(data.message || 'Failed to delete class');
      }
    } catch (error) {
      console.error('❌ Error deleting class:', error);
      toast.error('Failed to delete class. Please try again.');
    } finally {
      // Clear loading state
      setLoading(false);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingClass(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Class Management</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage your school classes, grade levels, and sections
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add New Class
            </button>
          </div>
        </div>

        {/* Class List */}
        <div className="bg-white shadow rounded-lg">
          <ClassList
            classes={classes}
            onEdit={handleEdit}
            onDelete={handleDelete}
            loading={loading}
          />
        </div>

        {/* Class Form Modal */}
        {showForm && (
          <ClassForm
            classData={editingClass}
            onClose={handleCloseForm}
            onSuccess={editingClass ? handleClassUpdated : handleClassCreated}
          />
        )}
      </div>
    </div>
  );
};

export default ClassManagement;
