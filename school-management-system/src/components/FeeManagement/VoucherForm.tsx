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
      fetchStudents();
      fetchFeeStructures();
      fetchAcademicYears();
      fetchClasses();
    }
  }, [isOpen]);

  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/students?limit=1000', {
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStudents(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchFeeStructures = async () => {
    try {
      const response = await fetch('/api/fees/structures', {
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFeeStructures(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching fee structures:', error);
    }
  };

  const fetchAcademicYears = async () => {
    try {
      const response = await fetch('/api/academic-years', {
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAcademicYears(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching academic years:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await fetch('/api/classes', {
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setClasses(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-select fee structure when student changes
    if (name === 'student_id') {
      const student = students.find(s => s.id.toString() === value);
      setSelectedStudent(student || null);
      
             if (student) {
         const feeStructure = feeStructures.find(fs => 
           fs.class_id === student.class_id && 
           fs.academic_year_id?.toString() === formData.academic_year_id
         );
         if (feeStructure) {
           setFormData(prev => ({ ...prev, fee_structure_id: feeStructure.id.toString() }));
           setSelectedFeeStructure(feeStructure);
         }
       }
    }

         // Auto-select academic year when fee structure changes
     if (name === 'fee_structure_id') {
       const feeStructure = feeStructures.find(fs => fs.id.toString() === value);
       setSelectedFeeStructure(feeStructure || null);
       
       if (feeStructure) {
         setFormData(prev => ({ ...prev, academic_year_id: feeStructure.academic_year_id?.toString() || '' }));
       }
     }
  };

  const getStudentName = (studentId: string) => {
    const student = students.find(s => s.id.toString() === studentId);
    if (student) {
      const className = classes.find(c => c.id === student.class_id)?.name || 'Unknown Class';
      return `${student.first_name} ${student.last_name} (${className})`;
    }
    return '';
  };

  const getFeeStructureDetails = (feeStructureId: string) => {
    const feeStructure = feeStructures.find(fs => fs.id.toString() === feeStructureId);
    if (feeStructure) {
      const className = classes.find(c => c.id === feeStructure.class_id)?.name || 'Unknown Class';
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
    
    if (!formData.student_id || !formData.fee_structure_id || !formData.due_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    
    try {
      const voucherData = {
        student_id: parseInt(formData.student_id),
        fee_structure_id: parseInt(formData.fee_structure_id),
        academic_year_id: parseInt(formData.academic_year_id),
        due_date: formData.due_date,
        payment_terms: formData.payment_terms,
        installment_count: formData.payment_terms === 'installment' ? formData.installment_count : 1,
        total_amount: selectedFeeStructure?.total_annual_fee || 0,
        installment_amount: calculateInstallmentAmount(),
        notes: formData.notes,
        status: 'pending'
      };

      const response = await fetch('/api/fees/vouchers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(voucherData)
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Voucher generated successfully!');
        onVoucherGenerated();
        onClose();
        resetForm();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to generate voucher');
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
              >
                <option value="">Select Student</option>
                {students.map(student => {
                  const className = classes.find(c => c.id === student.class_id)?.name || 'Unknown Class';
                  return (
                    <option key={student.id} value={student.id}>
                      {student.first_name} {student.last_name} - {className}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Academic Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Academic Year *
              </label>
              <select
                name="academic_year_id"
                value={formData.academic_year_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Academic Year</option>
                {academicYears.map(ay => (
                  <option key={ay.id} value={ay.id}>
                    {ay.label || ay.name} ({ay.status})
                  </option>
                ))}
              </select>
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
              >
                <option value="">Select Fee Structure</option>
                {feeStructures
                  .filter(fs => !formData.academic_year_id || fs.academic_year_id?.toString() === formData.academic_year_id)
                  .map(fs => {
                    const className = classes.find(c => c.id === fs.class_id)?.name || 'Unknown Class';
                    return (
                      <option key={fs.id} value={fs.id}>
                        {className} - ${fs.total_annual_fee}
                      </option>
                    );
                  })}
              </select>
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
