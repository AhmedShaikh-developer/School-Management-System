import React, { useState, useEffect } from 'react';
import { XMarkIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import { Student } from '../../types/student';

interface ClassAssignmentModalProps {
  student: Student;
  classes: Array<{ id: number; class_name: string; grade_level: string }>;
  onClose: () => void;
  onSuccess: (student: Student) => void;
}

const ClassAssignmentModal: React.FC<ClassAssignmentModalProps> = ({
  student,
  classes,
  onClose,
  onSuccess
}) => {
  const [selectedClassId, setSelectedClassId] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (classes.length === 1) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedClassId) {
      toast.error('Please select a class');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch(`http://localhost:5000/api/students/${student.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('tenantToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          class_id: selectedClassId
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast.success('Class assigned successfully!');
        onSuccess(result.data);
        onClose();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to assign class');
      }
    } catch (error) {
      console.error('Error assigning class:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (classes.length === 0) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-4 sm:top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">No Classes Available</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          
          <div className="text-center py-6">
            <AcademicCapIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-sm text-gray-500 mb-4">
              No classes have been created yet. Please create classes first before assigning students.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-4 sm:top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Assign Class to Student</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">Student:</p>
          <p className="font-medium text-gray-900">
            {student.first_name} {student.last_name}
          </p>
          <p className="text-sm text-gray-500">ID: {student.student_id}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Class *
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value ? parseInt(e.target.value) : '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Choose a class...</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.class_name} (Grade {cls.grade_level})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedClassId}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Assigning...' : 'Assign Class'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClassAssignmentModal;
