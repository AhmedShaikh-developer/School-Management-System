import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import { useTenant } from '../../App';
import { FeeStructure, FeeStructureFormProps } from '../../types/fee';

const FeeStructureForm: React.FC<FeeStructureFormProps> = ({
  feeStructure,
  classes,
  academicYears,
  onClose,
  onSuccess
}) => {
  const { tenantToken } = useTenant();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<FeeStructure>>({
    class_id: 0,
    ay_id: 0,
    tuition_fee: 0,
    library_fee: 0,
    lab_fee: 0,
    sports_fee: 0,
    transport_fee: 0,
    examination_fee: 0,
    development_fee: 0,
    other_fees: [],
    total_annual_fee: 0,
    installments: 1,
    installment_amount: 0,
    due_dates: [],
    status: 'active'
  });

  const [otherFeeName, setOtherFeeName] = useState('');
  const [otherFeeAmount, setOtherFeeAmount] = useState(0);
  const [otherFeeDescription, setOtherFeeDescription] = useState('');

  useEffect(() => {
    if (feeStructure) {
      setFormData(feeStructure);
    }
  }, [feeStructure]);

  useEffect(() => {
    calculateTotalAndInstallment();
  }, [formData.tuition_fee, formData.library_fee, formData.lab_fee, formData.sports_fee, formData.transport_fee, formData.examination_fee, formData.development_fee, formData.other_fees, formData.installments]);

  const calculateTotalAndInstallment = () => {
    const total = (formData.tuition_fee || 0) +
      (formData.library_fee || 0) +
      (formData.lab_fee || 0) +
      (formData.sports_fee || 0) +
      (formData.transport_fee || 0) +
      (formData.examination_fee || 0) +
      (formData.development_fee || 0) +
      (formData.other_fees || []).reduce((sum, fee) => sum + (fee.amount || 0), 0);

    const installmentAmount = formData.installments ? Math.ceil(total / formData.installments) : total;

    setFormData(prev => ({
      ...prev,
      total_annual_fee: total,
      installment_amount: installmentAmount
    }));
  };

  const addOtherFee = () => {
    if (!otherFeeName || otherFeeAmount <= 0) {
      toast.error('Please provide fee name and amount');
      return;
    }

    const newFee = {
      id: Date.now().toString(),
      name: otherFeeName,
      amount: otherFeeAmount,
      is_optional: true,
      description: otherFeeDescription
    };

    setFormData(prev => ({
      ...prev,
      other_fees: [...(prev.other_fees || []), newFee]
    }));

    setOtherFeeName('');
    setOtherFeeAmount(0);
    setOtherFeeDescription('');
  };

  const removeOtherFee = (feeId: string) => {
    setFormData(prev => ({
      ...prev,
      other_fees: (prev.other_fees || []).filter(fee => fee.id !== feeId)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.class_id || !formData.ay_id) {
      toast.error('Please select class and academic year');
      return;
    }

    if (!formData.total_annual_fee || formData.total_annual_fee <= 0) {
      toast.error('Total annual fee must be greater than 0');
      return;
    }

    setLoading(true);
    try {
      const url = feeStructure 
        ? `http://localhost:5000/api/fees/structures/${feeStructure.id}`
        : 'http://localhost:5000/api/fees/structures';
      
      const method = feeStructure ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success(feeStructure ? 'Fee structure updated successfully' : 'Fee structure created successfully');
          onSuccess(data.data);
        } else {
          toast.error(data.error || 'Failed to save fee structure');
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save fee structure');
      }
    } catch (error) {
      console.error('Error saving fee structure:', error);
      toast.error('Failed to save fee structure');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900">
            {feeStructure ? 'Edit Fee Structure' : 'Create New Fee Structure'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Class *
              </label>
              <select
                value={formData.class_id || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, class_id: parseInt(e.target.value) }))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              >
                <option value="">Select Class</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.class_name} ({cls.grade_level})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Academic Year *
              </label>
              <select
                value={formData.ay_id || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, ay_id: parseInt(e.target.value) }))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              >
                <option value="">Select Academic Year</option>
                {academicYears.map(ay => (
                  <option key={ay.id} value={ay.id}>
                    {ay.label} ({ay.status})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Core Fees */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tuition Fee *
              </label>
              <input
                type="number"
                value={formData.tuition_fee || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, tuition_fee: parseFloat(e.target.value) || 0 }))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="0"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Library Fee
              </label>
              <input
                type="number"
                value={formData.library_fee || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, library_fee: parseFloat(e.target.value) || 0 }))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lab Fee
              </label>
              <input
                type="number"
                value={formData.lab_fee || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, lab_fee: parseFloat(e.target.value) || 0 }))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sports Fee
              </label>
              <input
                type="number"
                value={formData.sports_fee || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, sports_fee: parseFloat(e.target.value) || 0 }))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transport Fee
              </label>
              <input
                type="number"
                value={formData.transport_fee || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, transport_fee: parseFloat(e.target.value) || 0 }))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Examination Fee
              </label>
              <input
                type="number"
                value={formData.examination_fee || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, examination_fee: parseFloat(e.target.value) || 0 }))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Development Fee
              </label>
              <input
                type="number"
                value={formData.development_fee || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, development_fee: parseFloat(e.target.value) || 0 }))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Installments
              </label>
              <input
                type="number"
                value={formData.installments || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, installments: parseInt(e.target.value) || 1 }))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="1"
                min="1"
                max="12"
              />
            </div>
          </div>

          {/* Other Fees */}
          <div className="border-t pt-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Other Optional Fees</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <input
                type="text"
                value={otherFeeName}
                onChange={(e) => setOtherFeeName(e.target.value)}
                placeholder="Fee Name"
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <input
                type="number"
                value={otherFeeAmount || ''}
                onChange={(e) => setOtherFeeAmount(parseFloat(e.target.value) || 0)}
                placeholder="Amount"
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <input
                type="text"
                value={otherFeeDescription}
                onChange={(e) => setOtherFeeDescription(e.target.value)}
                placeholder="Description (optional)"
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={addOtherFee}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Add Fee
              </button>
            </div>

            {formData.other_fees && formData.other_fees.length > 0 && (
              <div className="space-y-2">
                {formData.other_fees.map((fee) => (
                  <div key={fee.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium">{fee.name}</span>
                      <span className="ml-2 text-gray-600">₹{fee.amount}</span>
                      {fee.description && (
                        <span className="ml-2 text-sm text-gray-500">({fee.description})</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeOtherFee(fee.id!)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-700">Total Annual Fee:</span>
                <span className="ml-2 text-lg font-bold text-gray-900">₹{formData.total_annual_fee || 0}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Installments:</span>
                <span className="ml-2 text-lg font-bold text-gray-900">{formData.installments || 1}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Installment Amount:</span>
                <span className="ml-2 text-lg font-bold text-gray-900">₹{formData.installment_amount || 0}</span>
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.status || 'active'}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : (feeStructure ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeeStructureForm;
