import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useTenant } from '../../App';
import { toast } from 'react-toastify';
import { Class, ClassFormProps } from '../../types/class';

const ClassForm: React.FC<ClassFormProps> = ({ classData, onClose, onSuccess }) => {
  const { tenantToken, tenantId } = useTenant();
  const [formData, setFormData] = useState<Class>({
    class_name: '',
    grade_level: '',
    section: '',
    capacity: undefined,
    academic_year: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (classData) {
      setFormData({
        class_name: classData.class_name || '',
        grade_level: classData.grade_level || '',
        section: classData.section || '',
        capacity: classData.capacity || undefined,
        academic_year: classData.academic_year || ''
      });
    }
  }, [classData]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.class_name.trim()) {
      newErrors.class_name = 'Class name is required';
    }

    if (!formData.grade_level.trim()) {
      newErrors.grade_level = 'Grade level is required';
    }

    if (formData.capacity !== undefined && formData.capacity < 1) {
      newErrors.capacity = 'Capacity must be at least 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'capacity' ? (value ? parseInt(value) : undefined) : value
    }));
    
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const url = classData 
        ? `http://localhost:5000/api/classes/${classData.id}`
        : 'http://localhost:5000/api/classes';
      
      const method = classData ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tenantToken}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        toast.success(classData ? 'Class updated successfully!' : 'Class created successfully!');
        onSuccess(data.data);
        onClose();
      } else {
        toast.error(data.message || 'Failed to save class');
      }
    } catch (error) {
      console.error('Error saving class:', error);
      toast.error('Failed to save class. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {classData ? 'Edit Class' : 'Add New Class'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="class_name" className="block text-sm font-medium text-gray-700">
              Class Name *
            </label>
            <input
              type="text"
              id="class_name"
              name="class_name"
              value={formData.class_name}
              onChange={handleInputChange}
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                errors.class_name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., Science, Mathematics"
            />
            {errors.class_name && (
              <p className="mt-1 text-sm text-red-600">{errors.class_name}</p>
            )}
          </div>

          <div>
            <label htmlFor="grade_level" className="block text-sm font-medium text-gray-700">
              Grade Level *
            </label>
            <select
              id="grade_level"
              name="grade_level"
              value={formData.grade_level}
              onChange={handleInputChange}
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                errors.grade_level ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select Grade Level</option>
              <option value="Pre-K">Pre-K</option>
              <option value="K">Kindergarten</option>
              <option value="1">Grade 1</option>
              <option value="2">Grade 2</option>
              <option value="3">Grade 3</option>
              <option value="4">Grade 4</option>
              <option value="5">Grade 5</option>
              <option value="6">Grade 6</option>
              <option value="7">Grade 7</option>
              <option value="8">Grade 8</option>
              <option value="9">Grade 9</option>
              <option value="10">Grade 10</option>
              <option value="11">Grade 11</option>
              <option value="12">Grade 12</option>
            </select>
            {errors.grade_level && (
              <p className="mt-1 text-sm text-red-600">{errors.grade_level}</p>
            )}
          </div>

          <div>
            <label htmlFor="section" className="block text-sm font-medium text-gray-700">
              Section
            </label>
            <input
              type="text"
              id="section"
              name="section"
              value={formData.section}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., A, B, C (optional)"
            />
          </div>

          <div>
            <label htmlFor="capacity" className="block text-sm font-medium text-gray-700">
              Capacity
            </label>
            <input
              type="number"
              id="capacity"
              name="capacity"
              value={formData.capacity || ''}
              onChange={handleInputChange}
              min="1"
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                errors.capacity ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., 30 (optional)"
            />
            {errors.capacity && (
              <p className="mt-1 text-sm text-red-600">{errors.capacity}</p>
            )}
          </div>

          <div>
            <label htmlFor="academic_year" className="block text-sm font-medium text-gray-700">
              Academic Year
            </label>
            <input
              type="text"
              id="academic_year"
              name="academic_year"
              value={formData.academic_year}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 2024-2025 (optional)"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : (classData ? 'Update Class' : 'Create Class')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClassForm;
