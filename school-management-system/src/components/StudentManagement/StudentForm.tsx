import React, { useState, useEffect, useCallback } from 'react';
import { XMarkIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';
import { useTenant } from '../../App';
import { toast } from 'react-toastify';
import { Student, StudentFormProps } from '../../types/student';

const StudentForm: React.FC<StudentFormProps> = ({
  student,
  classes,
  onClose,
  onSuccess
}) => {
  const { tenantToken } = useTenant();
  const [formData, setFormData] = useState<Student>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: null,
    gender: '',
    address: '',
    class_id: undefined,
    enrollment_date: new Date().toISOString().split('T')[0],
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    medical_conditions: '',
    allergies: '',
    blood_group: '',
    nationality: '',
    religion: '',
    mother_tongue: '',
    previous_school: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedData, setLastSavedData] = useState<string>('');

  // Initialize form data
  useEffect(() => {
    if (student) {
      const initialData = {
        ...student,
        class_id: student.class_id || undefined
      };
      setFormData(initialData);
    } else {
      // For new students, auto-select the first class if only one exists
      if (classes.length === 1) {
        setFormData(prev => ({ ...prev, class_id: classes[0].id }));
      }
    }
  }, [student, classes]);

  // Auto-save functionality - only for existing students
  const autoSave = useCallback(async (data: Student) => {
    // Don't auto-save new students (only existing ones)
    if (!student) return;
    
    if (!data.first_name || !data.last_name || !data.email) return;
    
    const dataString = JSON.stringify(data);
    if (dataString === lastSavedData) return;

    setAutoSaveStatus('saving');
    
    try {
      const url = `http://localhost:5000/api/students/${student.id}`;
      const method = 'PUT';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        setAutoSaveStatus('saved');
        setLastSavedData(dataString);
        
        // Clear saved status after 3 seconds
        setTimeout(() => setAutoSaveStatus('idle'), 3000);
      } else {
        setAutoSaveStatus('error');
      }
    } catch (error) {
      console.error('Auto-save error:', error);
      setAutoSaveStatus('error');
    }
  }, [student, tenantToken, lastSavedData]);

  // Debounced auto-save
  useEffect(() => {
    // Don't auto-save when form is loading or for new students
    if (loading || !student) return;
    
    const timer = setTimeout(() => {
      autoSave(formData);
    }, 2000);

    return () => clearTimeout(timer);
  }, [formData, autoSave, loading, student]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Class selection validation - allow "unassigned" as a valid choice
    // For editing existing students, null class_id is valid (means unassigned)
    // For new students, we require a selection
    if (formData.class_id === undefined) {
      newErrors.class_id = 'Please select a class or choose "Assign Later"';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'class_id') {
      let parsedValue: number | undefined;
      
      if (value === 'unassigned') {
        parsedValue = undefined;
      } else if (value === '') {
        parsedValue = undefined;
      } else {
        parsedValue = parseInt(value, 10);
        if (isNaN(parsedValue)) {
          parsedValue = undefined;
        }
      }
      
      setFormData(prev => ({ ...prev, [name]: parsedValue }));
    } else if (name === 'date_of_birth' || name === 'enrollment_date') {
      // Handle date fields - convert empty strings to null
      setFormData(prev => ({
        ...prev,
        [name]: value && value.trim() !== '' ? value : null
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear error when user starts typing
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
    
    // Prevent multiple submissions
    if (loading || submitted) {
      return;
    }
    
    // Additional check for new students to prevent duplicate creation
    if (!student && submitted) {
      return;
    }
    
    // Additional check for new students to prevent duplicate creation by email
    if (!student) {
      // This is a simple check - in a real app you might want to check the database
      // For now, we'll just log it and continue
      
      // Check if we already have a student with this email in the current session
      if (window.sessionStorage.getItem(`student_created_${formData.email}`)) {
        toast.error('Student with this email already exists');
        return;
      }
    }
    
    const validationResult = validateForm();
    
    if (!validationResult) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);
    setSubmitted(true);
    
    try {
      // Prepare data for submission
      let processedClassId: number | null = null;
      
      if (formData.class_id && formData.class_id !== 'unassigned') {
        processedClassId = typeof formData.class_id === 'number' ? formData.class_id : Number(formData.class_id);
      } else {
        // If class_id is 'unassigned' or undefined, keep it as null (unassigned)
      }
      
      const submitData = {
        ...formData,
        class_id: processedClassId
      };

      const url = student ? `http://localhost:5000/api/students/${student.id}` : 'http://localhost:5000/api/students';
      const method = student ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      });

      if (response.ok) {
        const result = await response.json();
        
        // For new students, mark this email as created in this session
        if (!student) {
          window.sessionStorage.setItem(`student_created_${formData.email}`, 'true');
          
          // Also set a flag to prevent further submissions
          setSubmitted(true);
        }
        
        onSuccess(result.data);
        toast.success(student ? 'Student updated successfully!' : 'Student created successfully!');
      } else {
        const error = await response.json();
        console.error('🔍 Error response data:');
        console.error('  - Full error response:', error);
        console.error('  - Error message:', error.error);
        toast.error(error.error || 'Failed to save student');
      }
    } catch (error) {
      console.error('Error saving student:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
      setSubmitted(false);
    }
  };

  const getAutoSaveIndicator = () => {
    switch (autoSaveStatus) {
      case 'saving':
        return (
          <div className="flex items-center text-yellow-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
            Saving...
          </div>
        );
      case 'saved':
        return (
          <div className="flex items-center text-green-600">
            <CloudArrowUpIcon className="h-4 w-4 mr-2" />
            Saved
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center text-red-600">
            <XMarkIcon className="h-4 w-4 mr-2" />
            Save failed
          </div>
        );
      default:
        return null;
    }
  };

  const getClassSelectionHelp = () => {
    if (classes.length === 0) {
      return (
        <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded-md border border-amber-200">
          ⚠️ No classes have been created yet. Please create classes first or choose "Assign Later".
        </div>
      );
    }
    if (classes.length === 1) {
      return (
        <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded-md border border-blue-200">
          ℹ️ Only one class available. Students will be automatically assigned to {classes[0].class_name}.
        </div>
      );
    }
    return (
      <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded-md border border-gray-200">
        ℹ️ Select a class for the student or choose "Assign Later" to assign them later.
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-4 sm:top-20 mx-auto p-3 sm:p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
          <h3 className="text-lg font-medium text-gray-900">
            {student ? 'Edit Student' : 'Add New Student'}
          </h3>
                     <div className="flex items-center space-x-4 w-full sm:w-auto">
             {student && getAutoSaveIndicator()}
             <button
               onClick={onClose}
               className="text-gray-400 hover:text-gray-600"
             >
               <XMarkIcon className="h-6 w-6" />
             </button>
           </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Basic Information */}
          <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
            <h4 className="text-md font-medium text-gray-900 mb-3 sm:mb-4">Basic Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">First Name *</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                    errors.first_name ? 'border-red-500' : ''
                  }`}
                />
                {errors.first_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Last Name *</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                    errors.last_name ? 'border-red-500' : ''
                  }`}
                />
                {errors.last_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.last_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                    errors.email ? 'border-red-500' : ''
                  }`}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth || ''}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Address</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Academic Information */}
          <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
            <h4 className="text-md font-medium text-gray-900 mb-3 sm:mb-4">Academic Information</h4>
            
            {/* Class Selection Help */}
            {getClassSelectionHelp()}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Class Assignment *</label>
                                 <select
                   name="class_id"
                   value={formData.class_id === null ? 'unassigned' : (formData.class_id || '')}
                   onChange={handleInputChange}
                   className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                     errors.class_id ? 'border-red-500' : ''
                   }`}
                 >
                   <option value="">Select class</option>
                                       {classes.map(cls => {
                      return (
                        <option key={cls.id} value={cls.id}>
                          {cls.class_name} ({cls.grade_level})
                        </option>
                      );
                    })}
                   <option value="unassigned">📋 Assign Later</option>
                 </select>
                {errors.class_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.class_id}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Students assigned later will appear in the "Unassigned" section until placed in a class.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Enrollment Date</label>
                <input
                  type="date"
                  name="enrollment_date"
                  value={formData.enrollment_date || ''}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Previous School</label>
                <input
                  type="text"
                  name="previous_school"
                  value={formData.previous_school}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Mother Tongue</label>
                <input
                  type="text"
                  name="mother_tongue"
                  value={formData.mother_tongue}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
            <h4 className="text-md font-medium text-gray-900 mb-3 sm:mb-4">Emergency Contact</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Contact Name</label>
                <input
                  type="text"
                  name="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Contact Phone</label>
                <input
                  type="tel"
                  name="emergency_contact_phone"
                  value={formData.emergency_contact_phone}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Relationship</label>
                <input
                  type="text"
                  name="emergency_contact_relationship"
                  value={formData.emergency_contact_relationship}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Medical Information */}
          <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
            <h4 className="text-md font-medium text-gray-900 mb-3 sm:mb-4">Medical Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Blood Group</label>
                <select
                  name="blood_group"
                  value={formData.blood_group}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Select blood group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Nationality</label>
                <input
                  type="text"
                  name="nationality"
                  value={formData.nationality}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Religion</label>
                <input
                  type="text"
                  name="religion"
                  value={formData.religion}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Medical Conditions</label>
                <textarea
                  name="medical_conditions"
                  value={formData.medical_conditions}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Any medical conditions or special needs"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Allergies</label>
                <textarea
                  name="allergies"
                  value={formData.allergies}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Any allergies or dietary restrictions"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Saving...' : (student ? 'Update Student' : 'Create Student')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentForm;
