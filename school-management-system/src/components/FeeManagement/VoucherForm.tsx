import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useTenant } from '../../App';

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  class_id: number;
  class_name?: string;
  grade_level?: string;
}

interface FeeStructure {
  id: number;
  class_id: number;
  academic_year_id: number;
  tuition_fee: number;
  other_fees: any[];
  total_annual_fee: number;
  installment_amount: number;
}

interface AcademicYear {
  id: number;
  name: string;
  label: string;
  status: string;
  start_date?: string;
  end_date?: string;
}

interface VoucherFormProps {
  isOpen: boolean;
  onClose: () => void;
  onVoucherGenerated: () => void;
}

const VoucherForm: React.FC<VoucherFormProps> = ({ isOpen, onClose, onVoucherGenerated }) => {
  const { tenantToken } = useTenant();
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    student_id: '',
    fee_structure_id: '',
    academic_year_id: '',
    due_date: '',
    payment_terms: 'full', // full, installment
    installment_count: 1,
    notes: ''
  });

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedFeeStructure, setSelectedFeeStructure] = useState<FeeStructure | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Check if we have a valid token
      if (!tenantToken) {
        console.error('❌ No tenant token available');
        toast.error('Please log in again to access fee management');
        onClose();
        return;
      }
      
      setFetchingData(true);
      Promise.all([
        fetchStudents(),
        fetchFeeStructures(),
        fetchAcademicYears(),
        fetchClasses()
      ]).finally(() => {
        setFetchingData(false);
      });
    }
  }, [isOpen, tenantToken, onClose]);

  // Monitor form data changes
  useEffect(() => {
    console.log('🔍 Form data changed:', formData);
    console.log('🔍 Current form state:');
    console.log('  - student_id:', formData.student_id, '✅', !!formData.student_id);
    console.log('  - fee_structure_id:', formData.fee_structure_id, '✅', !!formData.fee_structure_id);
    console.log('  - academic_year_id:', formData.academic_year_id, '✅', !!formData.academic_year_id);
    console.log('  - due_date:', formData.due_date, '✅', !!formData.due_date);
  }, [formData]);

  const fetchStudents = async () => {
    try {
      console.log('🔍 Fetching students with token:', tenantToken ? 'Token exists' : 'No token');
      
      const response = await fetch('http://localhost:5000/api/students?limit=1000', {
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 Students API response status:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Students API response:', data);
        console.log('🔍 Data structure analysis:');
        console.log('  - Data type:', typeof data);
        console.log('  - Data keys:', Object.keys(data));
        console.log('  - Data.data:', data.data);
        console.log('  - Data.data type:', typeof data.data);
        console.log('  - Data.data length:', data.data?.length);
        console.log('  - Is data.data array?', Array.isArray(data.data));
        
        if (data.data && data.data.students && Array.isArray(data.data.students)) {
          console.log('✅ Setting students to data.data.students array');
          setStudents(data.data.students);
        } else if (Array.isArray(data.data)) {
          console.log('✅ Setting students to data.data array');
          setStudents(data.data);
        } else if (Array.isArray(data)) {
          console.log('✅ Setting students to data array directly');
          setStudents(data);
        } else if (data.students && Array.isArray(data.students)) {
          console.log('✅ Setting students to data.students array');
          setStudents(data.students);
        } else {
          console.log('❌ No valid students array found, setting empty array');
          console.log('  - Available data:', data);
          setStudents([]);
        }
      } else {
        console.error('❌ Failed to fetch students:', response.status, response.statusText);
        if (response.status === 401) {
          console.error('🔐 Authentication failed - token may be expired or invalid');
        }
        setStudents([]);
      }
    } catch (error) {
      console.error('💥 Error fetching students:', error);
      setStudents([]);
    }
  };

  const fetchFeeStructures = async () => {
    try {
      console.log('🔍 Fetching fee structures...');
      const response = await fetch('http://localhost:5000/api/fees/structures', {
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Fee Structures API response:', data);
        console.log('🔍 Fee Structures data structure:');
        console.log('  - Data type:', typeof data);
        console.log('  - Data keys:', Object.keys(data));
        console.log('  - Data.data:', data.data);
        
        if (data.data && data.data.fee_structures && Array.isArray(data.data.fee_structures)) {
          console.log('✅ Setting fee structures to data.data.fee_structures array');
          console.log('🔍 Sample fee structure:', data.data.fee_structures[0]);
          setFeeStructures(data.data.fee_structures);
        } else if (Array.isArray(data.data)) {
          console.log('✅ Setting fee structures to data.data array');
          console.log('🔍 Sample fee structure:', data.data[0]);
          setFeeStructures(data.data);
        } else {
          console.log('❌ No valid fee structures array found');
          setFeeStructures([]);
        }
      } else {
        console.error('❌ Failed to fetch fee structures:', response.status, response.statusText);
        setFeeStructures([]);
      }
    } catch (error) {
      console.error('💥 Error fetching fee structures:', error);
      setFeeStructures([]);
    }
  };

  const fetchAcademicYears = async () => {
    try {
      console.log('🔍 Fetching academic years...');
      const response = await fetch('http://localhost:5000/api/academic-years', {
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Academic Years API response:', data);
        console.log('🔍 Academic Years data structure:');
        console.log('  - Data type:', typeof data);
        console.log('  - Data keys:', Object.keys(data));
        console.log('  - Data.data:', data.data);
        
        if (data.data && data.data.academic_years && Array.isArray(data.data.academic_years)) {
          console.log('✅ Setting academic years to data.data.academic_years array');
          setAcademicYears(data.data.academic_years);
        } else if (Array.isArray(data.data)) {
          console.log('✅ Setting academic years to data.data array');
          setAcademicYears(data.data);
        } else {
          console.log('❌ No valid academic years array found');
          setAcademicYears([]);
        }
      } else {
        console.error('❌ Failed to fetch academic years:', response.status, response.statusText);
        setAcademicYears([]);
      }
    } catch (error) {
      console.error('💥 Error fetching academic years:', error);
        setAcademicYears([]);
      }
    };

  const fetchClasses = async () => {
    try {
      console.log('🔍 Fetching classes...');
      const response = await fetch('http://localhost:5000/api/classes', {
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Classes API response:', data);
        console.log('🔍 Classes data structure:');
        console.log('  - Data type:', typeof data);
        console.log('  - Data keys:', Object.keys(data));
        console.log('  - Data.data:', data.data);
        
        if (data.data && data.data.classes && Array.isArray(data.data.classes)) {
          console.log('✅ Setting classes to data.data.classes array');
          setClasses(data.data.classes);
        } else if (Array.isArray(data.data)) {
          console.log('✅ Setting classes to data.data array');
          setClasses(data.data);
        } else {
          console.log('❌ No valid classes array found');
          setClasses([]);
        }
      } else {
        console.error('❌ Failed to fetch classes:', response.status, response.statusText);
        setClasses([]);
      }
    } catch (error) {
      console.error('💥 Error fetching classes:', error);
      setClasses([]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    console.log('🔍 Input change:', name, '=', value);
    
    // Update form data immediately
    setFormData(prev => {
      const newFormData = { ...prev, [name]: value };
      console.log('🔍 Form data updated:', name, '=', value, 'New formData:', newFormData);
      return newFormData;
    });

    // Handle auto-selection logic
    if (name === 'student_id') {
      const student = students.find(s => s.id.toString() === value);
      setSelectedStudent(student || null);
      
      if (student) {
        console.log('🔍 Student selected:', student);
        
        // Find fee structure that matches the student's class
        const feeStructure = feeStructures.find(fs => 
          fs.class_id === student.class_id
        );
        
        if (feeStructure) {
          console.log('✅ Auto-selecting fee structure:', feeStructure.id);
          setFormData(prev => {
            const updatedFormData = { ...prev, fee_structure_id: feeStructure.id.toString() };
            console.log('🔍 Updated formData with fee structure:', updatedFormData);
            return updatedFormData;
          });
          setSelectedFeeStructure(feeStructure);
          
          // Only set academic year if fee structure has one and none is currently selected
          if (feeStructure.academic_year_id && !formData.academic_year_id) {
            console.log('✅ Auto-setting academic year to:', feeStructure.academic_year_id);
            setFormData(prev => {
              const updatedFormData = { ...prev, academic_year_id: feeStructure.academic_year_id.toString() };
              console.log('🔍 Updated formData with academic year:', updatedFormData);
              return updatedFormData;
            });
          } else if (!feeStructure.academic_year_id && !formData.academic_year_id) {
            console.log('⚠️ Fee structure has no academic_year_id - user must select academic year manually');
            toast.warning('Please select an Academic Year for this fee structure');
          }
        } else {
          console.log('❌ No matching fee structure found');
        }
      }
    }

    if (name === 'fee_structure_id') {
      const feeStructure = feeStructures.find(fs => fs.id.toString() === value);
      setSelectedFeeStructure(feeStructure || null);
      
      if (feeStructure) {
        console.log('🔍 Fee structure selected:', feeStructure);
        // Only set academic year if fee structure has one and it's different from current
        if (feeStructure.academic_year_id && feeStructure.academic_year_id.toString() !== formData.academic_year_id) {
          console.log('✅ Setting academic_year_id to:', feeStructure.academic_year_id);
          setFormData(prev => ({ ...prev, academic_year_id: feeStructure.academic_year_id.toString() }));
        } else if (!feeStructure.academic_year_id) {
          console.log('⚠️ Fee structure has no academic_year_id - keeping current selection');
        }
      }
    }
  };

  const getStudentName = (studentId: string) => {
    const student = students.find(s => s.id.toString() === studentId);
    if (student) {
      const className = Array.isArray(classes) ? classes.find(c => c.id === student.class_id)?.class_name || classes.find(c => c.id === student.class_id)?.name || 'Unknown Class' : 'Unknown Class';
      return `${student.first_name} ${student.last_name} (${className})`;
    }
    return '';
  };

  const getFeeStructureDetails = (feeStructureId: string) => {
    const feeStructure = feeStructures.find(fs => fs.id.toString() === feeStructureId);
    if (feeStructure) {
      const className = Array.isArray(classes) ? classes.find(c => c.id === feeStructure.class_id)?.class_name || classes.find(c => c.id === feeStructure.class_id)?.name || 'Unknown Class' : 'Unknown Class';
      const ay = academicYears.find(ay => ay.id === feeStructure.academic_year_id);
      return `${className} - ${ay?.label || ay?.name || 'Unknown Year'} - $${feeStructure.total_annual_fee}`;
    }
    return '';
  };

  const calculateInstallmentAmount = () => {
    if (selectedFeeStructure && formData.payment_terms === 'installment') {
      return Math.ceil(selectedFeeStructure.total_annual_fee / formData.installment_count);
    }
    return selectedFeeStructure?.total_annual_fee || 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
          console.log('🔍 Form submission - current formData:', formData);
      console.log('🔍 Validation check:');
      console.log('  - student_id:', formData.student_id, '✅', !!formData.student_id);
      console.log('  - fee_structure_id:', formData.fee_structure_id, '✅', !!formData.fee_structure_id);
      console.log('  - academic_year_id:', formData.academic_year_id, '✅', !!formData.academic_year_id);
      console.log('  - due_date:', formData.due_date, '✅', !!formData.due_date);
      
      console.log('🔍 Selected objects:');
      console.log('  - selectedStudent:', selectedStudent);
      console.log('  - selectedFeeStructure:', selectedFeeStructure);
      console.log('  - selectedAcademicYear:', academicYears.find(ay => ay.id.toString() === formData.academic_year_id));
    
    if (!formData.student_id || !formData.fee_structure_id || !formData.academic_year_id || !formData.due_date) {
      const missingFields = [];
      if (!formData.student_id) missingFields.push('Student');
      if (!formData.fee_structure_id) missingFields.push('Fee Structure');
      if (!formData.academic_year_id) missingFields.push('Academic Year');
      if (!formData.due_date) missingFields.push('Due Date');
      
      toast.error(`Please fill in: ${missingFields.join(', ')}`);
      return;
    }

    setLoading(true);
    
    try {
      // Get academic year from fee structure or form
      let academicYearId = null;
      if (selectedFeeStructure?.academic_year_id) {
        academicYearId = selectedFeeStructure.academic_year_id;
        console.log('✅ Using academic_year_id from fee structure:', academicYearId);
      } else if (formData.academic_year_id) {
        academicYearId = parseInt(formData.academic_year_id);
        console.log('✅ Using academic_year_id from form:', academicYearId);
      } else {
        console.log('❌ No academic_year_id available - this should not happen due to validation');
        toast.error('Academic Year is required. Please select an academic year.');
        return;
      }

      const voucherData = {
        student_id: parseInt(formData.student_id),
        fee_structure_id: parseInt(formData.fee_structure_id),
        ay_id: academicYearId,  // ← Changed from academic_year_id to ay_id
        due_date: formData.due_date,
        installment_count: formData.payment_terms === 'installment' ? formData.installment_count : 1,
        total_amount: selectedFeeStructure?.total_annual_fee || 0,
        notes: formData.notes,
        status: 'pending'
      };

      console.log('🔍 Sending voucher data to backend:', voucherData);
      console.log('🔍 Selected fee structure:', selectedFeeStructure);

             const response = await fetch('http://localhost:5000/api/fees/vouchers', {
         method: 'POST',
         headers: {
           'Authorization': `Bearer ${tenantToken}`,
           'Content-Type': 'application/json'
         },
         body: JSON.stringify(voucherData)
       });

      if (response.ok) {
        const data = await response.json();
        const installmentCount = data.installment_count || 1;
        const installmentAmount = data.installment_amount || 0;
        const totalAmount = data.total_amount || 0;
        
        if (installmentCount > 1) {
          toast.success(`${installmentCount} vouchers created successfully! Each installment: $${installmentAmount} (Total: $${totalAmount})`);
        } else {
          toast.success('Voucher generated successfully!');
        }
        
        onVoucherGenerated();
        onClose();
        resetForm();
      } else {
        console.error('❌ Backend error response:', response.status, response.statusText);
        try {
          const errorData = await response.json();
          console.error('❌ Backend error details:', errorData);
          toast.error(errorData.message || `Backend error: ${response.status}`);
        } catch (parseError) {
          console.error('❌ Could not parse error response:', parseError);
          toast.error(`Backend error: ${response.status} - ${response.statusText}`);
        }
      }
    } catch (error) {
      console.error('Error generating voucher:', error);
      toast.error('Failed to generate voucher');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      student_id: '',
      fee_structure_id: '',
      academic_year_id: '',
      due_date: '',
      payment_terms: 'full',
      installment_count: 1,
      notes: ''
    });
    setSelectedStudent(null);
    setSelectedFeeStructure(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Generate Fee Voucher</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

                     <form onSubmit={handleSubmit} className="space-y-4">
             {/* Loading State */}
             {fetchingData && (
               <div className="text-center py-4">
                 <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                 <p className="mt-2 text-sm text-gray-600">Loading form data...</p>
               </div>
             )}
             
             {/* Student Selection */}
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">
                 Student *
               </label>
               <select
                 name="student_id"
                 value={formData.student_id}
                 onChange={handleInputChange}
                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                 required
                 disabled={fetchingData}
               >
                 <option value="">Select Student</option>
                                   {Array.isArray(students) && students.map(student => {
                    const className = Array.isArray(classes) ? classes.find(c => c.id === student.class_id)?.class_name || classes.find(c => c.id === student.class_id)?.name || 'Unknown Class' : 'Unknown Class';
                    return (
                      <option key={student.id} value={student.id}>
                        {student.first_name} {student.last_name} - {className}
                      </option>
                    );
                  })}
               </select>
               {!fetchingData && Array.isArray(students) && students.length === 0 && (
                 <p className="mt-1 text-sm text-red-600">No students found. Please add students first.</p>
               )}
             </div>

                         {/* Academic Year */}
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">
                 Academic Year * <span className="text-red-500">(Required)</span>
               </label>
                             <select
                 name="academic_year_id"
                 value={formData.academic_year_id}
                 onChange={handleInputChange}
                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                 required
                 disabled={fetchingData}
               >
                                                  <option value="">Select Academic Year</option>
                 {Array.isArray(academicYears) && academicYears.map(ay => (
                   <option key={ay.id} value={ay.id}>
                     {ay.label || ay.name} ({ay.status})
                   </option>
                 ))}
               </select>
               {!fetchingData && Array.isArray(academicYears) && academicYears.length === 0 && (
                 <p className="mt-1 text-sm text-red-600">No academic years found. Please add academic years first.</p>
               )}
             </div>

            {/* Fee Structure */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fee Structure *
              </label>
                             <select
                 name="fee_structure_id"
                 value={formData.fee_structure_id}
                 onChange={handleInputChange}
                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                 required
                 disabled={fetchingData}
               >
                                                  <option value="">Select Fee Structure</option>
                                   {Array.isArray(feeStructures) && feeStructures
                    .filter(fs => {
                      // If no academic year is selected, show all fee structures
                      if (!formData.academic_year_id) return true;
                      // If academic year is selected, show fee structures for that year
                      // Handle case where fee structure doesn't have academic_year_id set
                      if (!fs.academic_year_id) {
                        console.log('🔍 Fee structure', fs.id, 'has no academic_year_id - showing it anyway');
                        return true; // Show fee structures without academic year
                      }
                      console.log('🔍 Filtering fee structure:', fs.id, 'academic_year_id:', fs.academic_year_id, 'selected:', formData.academic_year_id);
                      return fs.academic_year_id.toString() === formData.academic_year_id;
                    })
                    .map(fs => {
                      const className = Array.isArray(classes) ? classes.find(c => c.id === fs.class_id)?.class_name || classes.find(c => c.id === fs.class_id)?.name || 'Unknown Class' : 'Unknown Class';
                      return (
                        <option key={fs.id} value={fs.id}>
                          {className} - ${fs.total_annual_fee}
                        </option>
                      );
                    })}
               </select>
               {!fetchingData && Array.isArray(feeStructures) && feeStructures.length === 0 && (
                 <p className="mt-1 text-sm text-red-600">No fee structures found. Please add fee structures first.</p>
               )}
             </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date *
              </label>
              <input
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Payment Terms */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Terms
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="payment_terms"
                    value="full"
                    checked={formData.payment_terms === 'full'}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  Full Payment
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="payment_terms"
                    value="installment"
                    checked={formData.payment_terms === 'installment'}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  Installments
                </label>
              </div>
            </div>

            {/* Installment Count */}
            {formData.payment_terms === 'installment' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Installments
                </label>
                <select
                  name="installment_count"
                  value={formData.installment_count}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={2}>2 Installments</option>
                  <option value={3}>3 Installments</option>
                  <option value={4}>4 Installments</option>
                  <option value={6}>6 Installments</option>
                  <option value={12}>12 Installments</option>
                </select>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Additional notes for the voucher..."
              />
            </div>

            {/* Fee Summary */}
            {selectedFeeStructure && (
              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="font-medium text-gray-900 mb-2">Fee Summary</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <div>Total Annual Fee: <span className="font-medium">${selectedFeeStructure.total_annual_fee}</span></div>
                  {formData.payment_terms === 'installment' && (
                    <div>Installment Amount: <span className="font-medium">${calculateInstallmentAmount()}</span></div>
                  )}
                  <div>Due Date: <span className="font-medium">{formData.due_date}</span></div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate Voucher'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VoucherForm;
