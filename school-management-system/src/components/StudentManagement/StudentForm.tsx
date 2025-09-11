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
    ay_id: null, // Academic Year ID
    enrollment_date: new Date().toISOString().split('T')[0],
    photo_url: null, // Student photo URL
    biometric_data: null, // Biometric data
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
  const [academicYears, setAcademicYears] = useState<Array<{ id: number; label: string; status: string }>>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Initialize form data
  useEffect(() => {
    if (student) {
      const initialData = {
        ...student,
        class_id: student.class_id || null, // Use null for unassigned students
        ay_id: student.ay_id || null
      };
      setFormData(initialData);
      
      // Set photo preview if photo_url exists
      if (student.photo_url) {
        console.log('Setting photo preview from student data:', student.photo_url);
        // Ensure the photo URL is properly formatted
        const photoUrl = student.photo_url.startsWith('http') ? student.photo_url : `http://localhost:5000${student.photo_url}`;
        console.log('Formatted photo URL:', photoUrl);
        setPhotoPreview(photoUrl);
      }
    } else {
      // For new students, auto-select the first class if only one exists
      if (classes.length === 1) {
        setFormData(prev => ({ ...prev, class_id: classes[0].id }));
      }
    }
    
    // Fetch academic years
    fetchAcademicYears();
  }, [student, classes]);

  // Fetch academic years
  const fetchAcademicYears = async () => {
    try {
      console.log('Fetching academic years...');
      const response = await fetch('http://localhost:5000/api/academic-years', {
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Academic years response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Academic years response data:', data);
        
        if (data.success) {
          setAcademicYears(data.data);
          
          // Auto-select active academic year for new students
          if (!student) {
            const activeAY = data.data.find((ay: any) => ay.status === 'active');
            if (activeAY) {
              console.log('Auto-selecting active academic year:', activeAY);
              setFormData(prev => ({ ...prev, ay_id: activeAY.id }));
            }
          }
        } else {
          console.error('Failed to fetch academic years:', data.error);
        }
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch academic years:', errorData);
      }
    } catch (error) {
      console.error('Error fetching academic years:', error);
    }
  };

  // Handle photo file selection
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('Photo file selected:', file.name, 'Size:', file.size, 'Type:', file.type);
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Photo size should be less than 5MB');
        return;
      }
      
      setPhotoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        console.log('Photo preview created, size:', result?.length);
        setPhotoPreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove photo
  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setFormData(prev => ({ ...prev, photo_url: null }));
  };

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

    // Academic year validation
    if (!formData.ay_id) {
      newErrors.ay_id = 'Academic year is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'class_id') {
      let parsedValue: number | null | undefined;
      
      if (value === 'unassigned') {
        parsedValue = null; // Set to null for unassigned
      } else if (value === '') {
        parsedValue = undefined; // Keep undefined for validation
      } else {
        parsedValue = parseInt(value, 10);
        if (isNaN(parsedValue)) {
          parsedValue = undefined;
        }
      }
      
      setFormData(prev => ({ ...prev, [name]: parsedValue }));
    } else if (name === 'ay_id') {
      // Handle academic year ID
      let parsedValue: number | null = null;
      if (value && value !== '') {
        parsedValue = parseInt(value, 10);
        if (isNaN(parsedValue)) {
          parsedValue = null;
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
      } else if (formData.class_id === 'unassigned') {
        processedClassId = null; // Explicitly set to null for unassigned
      }
      
      const submitData = {
        ...formData,
        class_id: processedClassId,
        // Ensure all required fields are properly formatted
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone?.trim() || null,
        date_of_birth: formData.date_of_birth || null,
        gender: formData.gender || null,
        address: formData.address?.trim() || null,
        ay_id: formData.ay_id || null,
        enrollment_date: formData.enrollment_date || new Date().toISOString().split('T')[0],
        emergency_contact_name: formData.emergency_contact_name?.trim() || null,
        emergency_contact_phone: formData.emergency_contact_phone?.trim() || null,
        emergency_contact_relationship: formData.emergency_contact_relationship?.trim() || null,
        medical_conditions: formData.medical_conditions?.trim() || null,
        allergies: formData.allergies?.trim() || null,
        blood_group: formData.blood_group?.trim() || null,
        nationality: formData.nationality?.trim() || null,
        religion: formData.religion?.trim() || null,
        mother_tongue: formData.mother_tongue?.trim() || null,
        previous_school: formData.previous_school?.trim() || null
      };

      // If there's a new photo file, upload it first
      if (photoFile) {
        console.log('Uploading photo file:', photoFile.name, 'Size:', photoFile.size);
        const formDataPhoto = new FormData();
        formDataPhoto.append('photo', photoFile);
        
        const photoResponse = await fetch('http://localhost:5000/api/students/upload-photo', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tenantToken}`
          },
          body: formDataPhoto
        });
        
        if (photoResponse.ok) {
          const photoResult = await photoResponse.json();
          console.log('Photo upload successful:', photoResult);
          submitData.photo_url = photoResult.data.photo_url;
        } else {
          const errorData = await photoResponse.json();
          console.error('Photo upload failed:', errorData);
          toast.error('Failed to upload photo');
          setLoading(false);
          setSubmitted(false);
          return;
        }
      }

      console.log('Submitting student data:', submitData);

      // Final validation check
      if (!submitData.first_name || !submitData.last_name || !submitData.email) {
        toast.error('Please fill in all required fields');
        setLoading(false);
        setSubmitted(false);
        return;
      }

      if (!submitData.ay_id) {
        toast.error('Please select an academic year');
        setLoading(false);
        setSubmitted(false);
        return;
      }

      const url = student ? `http://localhost:5000/api/students/${student.id}` : 'http://localhost:5000/api/students';
      const method = student ? 'PUT' : 'POST';
      
      console.log('Making request to:', url, 'with method:', method);
      console.log('Request headers:', {
        'Authorization': `Bearer ${tenantToken}`,
        'Content-Type': 'application/json'
      });
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (response.ok) {
        const result = await response.json();
        console.log('Success response:', result);
        
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
        console.error('  - Error details:', error.details);
        console.error('  - Response status:', response.status);
        console.error('  - Response status text:', response.statusText);
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
      <div className="relative top-4 sm:top-20 mx-auto p-3 sm:p-5 border w-11/12 max-w-none shadow-lg rounded-md bg-white overflow-x-auto">
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

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 xl:space-y-8 min-w-full">
          {/* Basic Information */}
           <div className="bg-gray-50 p-3 sm:p-4 xl:p-6 rounded-lg w-full">
            <h4 className="text-md font-medium text-gray-900 mb-3 sm:mb-4">Basic Information</h4>
                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 xl:gap-6">
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
           <div className="bg-gray-50 p-3 sm:p-4 xl:p-6 rounded-lg w-full">
            <h4 className="text-md font-medium text-gray-900 mb-3 sm:mb-4">Academic Information</h4>
            
            {/* Class Selection Help */}
            {getClassSelectionHelp()}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 xl:gap-6 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Class *</label>
                                 <select
                   name="class_id"
                   value={formData.class_id === null ? 'unassigned' : (formData.class_id || '')}
                   onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
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
                <label className="block text-sm font-medium text-gray-700">Academic Year *</label>
                <select
                  name="ay_id"
                  value={formData.ay_id || ''}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="">Select academic year</option>
                  {academicYears.map(ay => (
                    <option key={ay.id} value={ay.id}>
                      {ay.label} ({ay.status === 'active' ? 'Active' : ay.status})
                    </option>
                  ))}
                </select>
                {errors.ay_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.ay_id}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Select the academic year for this student.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 xl:gap-6 mt-4">
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
              </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 xl:gap-6 mt-4">
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

              <div>
                <label className="block text-sm font-medium text-gray-700">Biometric Data</label>
                <textarea
                  name="biometric_data"
                  value={formData.biometric_data ? JSON.stringify(formData.biometric_data, null, 2) : ''}
                  onChange={(e) => {
                    try {
                      const value = e.target.value.trim();
                      if (value) {
                        const parsed = JSON.parse(value);
                        setFormData(prev => ({ ...prev, biometric_data: parsed }));
                      } else {
                        setFormData(prev => ({ ...prev, biometric_data: null }));
                      }
                    } catch (error) {
                      // Invalid JSON, don't update
                    }
                  }}
                  rows={3}
                  placeholder="Enter biometric data in JSON format (optional)"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter biometric data in valid JSON format (e.g., &#123;"fingerprint": "data", "face": "data"&#125;)
                </p>
              </div>
            </div>
          </div>

                                {/* Photo Upload */}
           <div className="bg-gray-50 p-3 sm:p-4 xl:p-6 rounded-lg w-full">
             <h4 className="text-md font-medium text-gray-900 mb-3 sm:mb-4">Student Photo</h4>
             <div className="space-y-4 overflow-hidden max-w-full">
                             {/* Current Photo Display */}
               {photoPreview && (
                 <div className="flex items-center space-x-4 max-w-full">
                   <div className="relative w-20 h-20 overflow-hidden rounded-lg border-2 border-gray-200 flex-shrink-0">
                     <img 
                       src={photoPreview} 
                       alt="Student photo" 
                       className="w-full h-full object-cover"
                       onError={(e) => {
                         console.error('Error loading image:', e);
                         setPhotoPreview(null);
                       }}
                     />
                   </div>
                   <button
                     type="button"
                     onClick={removePhoto}
                     className="text-red-600 hover:text-red-800 text-sm font-medium flex-shrink-0"
                   >
                     Remove Photo
                   </button>
                 </div>
               )}
              
              {/* Photo Upload Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {photoPreview ? 'Change Photo' : 'Upload Photo'}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Accepted formats: JPG, PNG, GIF. Maximum size: 5MB.
                </p>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
           <div className="bg-gray-50 p-3 sm:p-4 xl:p-6 rounded-lg w-full">
            <h4 className="text-md font-medium text-gray-900 mb-3 sm:mb-4">Emergency Contact</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 xl:gap-6">
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
           <div className="bg-gray-50 p-3 sm:p-4 xl:p-6 rounded-lg w-full">
            <h4 className="text-md font-medium text-gray-900 mb-3 sm:mb-4">Medical Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 xl:gap-6">
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

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 xl:gap-6">
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
