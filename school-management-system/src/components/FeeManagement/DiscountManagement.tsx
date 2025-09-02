import React, { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import { useTenant } from '../../App';
import { Discount } from '../../types/fee';

const DiscountManagement: React.FC = () => {
  const { tenantToken } = useTenant();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDiscountForm, setShowDiscountForm] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  // Form data state
  const [formData, setFormData] = useState({
    name: '',
    type: 'percentage' as 'percentage' | 'fixed' | 'conditional',
    value: '',
    applicable_to: 'all' as 'all' | 'class' | 'student',
    class_ids: [] as number[],
    student_ids: [] as number[],
    max_amount: '',
    valid_from: '',
    valid_to: '',
    description: ''
  });
  
  // Data for dropdowns
  const [classes, setClasses] = useState<Array<{ id: number; class_name: string; grade_level: string }>>([]);
  const [students, setStudents] = useState<Array<{ id: number; first_name: string; last_name: string; class_id: number }>>([]);
  const [formLoading, setFormLoading] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    fetchDiscounts();
  }, [tenantToken]);

  useEffect(() => {
    if (showDiscountForm) {
      fetchClasses();
      fetchStudents();
    }
  }, [showDiscountForm]);

  const fetchDiscounts = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/fees/discounts', {
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDiscounts(data.data);
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to fetch discounts');
      }
    } catch (error) {

      toast.error('Failed to fetch discounts');
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/classes', {
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setClasses(data.data);
        } else {

          setClasses([]);
        }
      } else {

        setClasses([]);
      }
    } catch (error) {

      setClasses([]);
    }
  };

  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      const response = await fetch('http://localhost:5000/api/students?limit=1000', {
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Handle different possible response structures
        if (data.data && data.data.students && Array.isArray(data.data.students)) {
          setStudents(data.data.students);
        } else if (Array.isArray(data.data)) {
          setStudents(data.data);
        } else if (Array.isArray(data)) {
          setStudents(data);
        } else if (data.students && Array.isArray(data.students)) {
          setStudents(data.students);
        } else if (data.success && Array.isArray(data.data)) {
          setStudents(data.data);
        } else {
          setStudents([]);
        }
      } else {

        setStudents([]);
      }
    } catch (error) {

      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleDeleteDiscount = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this discount?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/fees/discounts/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success('Discount deleted successfully');
          fetchDiscounts();
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete discount');
      }
    } catch (error) {

      toast.error('Failed to delete discount');
    }
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    // Find the current discount to get its data
    const currentDiscount = discounts.find(d => d.id === id);
    if (!currentDiscount) {
      toast.error('Discount not found');
      return;
    }

    const discountData = currentDiscount as any;
    const currentStatus = discountData.status || 
                         (discountData.is_active === true ? 'active' : 
                          discountData.is_active === false ? 'inactive' : 'active');

    // Don't show confirmation if status is the same
    if (currentStatus === newStatus) {
      return;
    }

    // Show confirmation dialog
    if (!window.confirm(`Are you sure you want to change the status from "${currentStatus}" to "${newStatus}"?`)) {
      return;
    }

    try {
      // Prepare update data with all required fields (backend requires all fields)
      const updateData: any = {
        name: discountData.name || discountData.discount_name || 'Discount',
        type: discountData.type || discountData.discount_type || 'percentage',
        value: discountData.value || discountData.discount_value || 0,
        applicable_to: discountData.applicable_to || 'all',
        class_ids: discountData.class_ids || [],
        student_ids: discountData.student_ids || [],
        max_amount: discountData.max_amount || null,
        valid_from: discountData.valid_from || new Date().toISOString().split('T')[0],
        valid_to: discountData.valid_to || new Date().toISOString().split('T')[0],
        description: discountData.description || '',
        status: newStatus // Use the new status field
      };
      
      // Also update is_active for backward compatibility
      if (newStatus === 'active') {
        updateData.is_active = true;
      } else if (newStatus === 'inactive' || newStatus === 'expired') {
        updateData.is_active = false;
      }


      
      const response = await fetch(`http://localhost:5000/api/fees/discounts/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success(`Discount status changed to ${newStatus}`);
          fetchDiscounts();
        }
      } else {
        const error = await response.json();

        toast.error(error.error || error.message || 'Failed to update discount status');
      }
    } catch (error) {

      toast.error('Failed to update discount status');
    }
  };

  const handleEditDiscount = (discount: Discount) => {
    setEditingDiscount(discount);
    const discountData = discount as any; // Type assertion to handle field name differences
    setFormData({
      name: discountData.name || discountData.discount_name || '',
      type: discountData.type || discountData.discount_type || 'percentage',
      value: (discountData.value || discountData.discount_value)?.toString() || '',
      applicable_to: discount.applicable_to || 'all',
      class_ids: discount.class_ids || [],
      student_ids: discount.student_ids || [],
      max_amount: discount.max_amount?.toString() || '',
      valid_from: discount.valid_from || '',
      valid_to: discount.valid_to || '',
      description: discount.description || ''
    });
    setShowDiscountForm(true);
  };

  const handleFormClose = () => {
    setShowDiscountForm(false);
    setEditingDiscount(null);
    setFormData({
      name: '',
      type: 'percentage',
      value: '',
      applicable_to: 'all',
      class_ids: [],
      student_ids: [],
      max_amount: '',
      valid_from: '',
      valid_to: '',
      description: ''
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.value || !formData.valid_from || !formData.valid_to) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.applicable_to === 'class' && formData.class_ids.length === 0) {
      toast.error('Please select at least one class');
      return;
    }

    if (formData.applicable_to === 'student' && formData.student_ids.length === 0) {
      toast.error('Please select at least one student');
      return;
    }

    setFormLoading(true);
    try {
      const url = editingDiscount 
        ? `http://localhost:5000/api/fees/discounts/${editingDiscount.id}`
        : 'http://localhost:5000/api/fees/discounts';
      
      const method = editingDiscount ? 'PUT' : 'POST';

      const payload = {
        name: formData.name,
        type: formData.type,
        value: parseFloat(formData.value),
        applicable_to: formData.applicable_to,
        class_ids: formData.applicable_to === 'class' ? formData.class_ids : [],
        student_ids: formData.applicable_to === 'student' ? formData.student_ids : [],
        max_amount: formData.max_amount ? parseFloat(formData.max_amount) : null,
        valid_from: formData.valid_from,
        valid_to: formData.valid_to,
        description: formData.description
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${tenantToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success(editingDiscount ? 'Discount updated successfully' : 'Discount created successfully');
          handleFormClose();
          fetchDiscounts();
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save discount');
      }
    } catch (error) {

      toast.error('Failed to save discount');
    } finally {
      setFormLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      const id = parseInt(value);
      
      if (name === 'class_ids') {
        setFormData(prev => ({
          ...prev,
          class_ids: checked 
            ? [...prev.class_ids, id]
            : prev.class_ids.filter(cid => cid !== id)
        }));
      } else if (name === 'student_ids') {
        setFormData(prev => ({
          ...prev,
          student_ids: checked 
            ? [...prev.student_ids, id]
            : prev.student_ids.filter(sid => sid !== id)
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const getTypeBadge = (type: string) => {
    const typeConfig = {
      percentage: { bg: 'bg-blue-100', text: 'text-blue-800' },
      fixed: { bg: 'bg-green-100', text: 'text-green-800' },
      conditional: { bg: 'bg-purple-100', text: 'text-purple-800' }
    };

    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.percentage;
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
        {type}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { bg: 'bg-green-100', text: 'text-green-800' },
      inactive: { bg: 'bg-gray-100', text: 'text-gray-800' },
      expired: { bg: 'bg-red-100', text: 'text-red-800' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
        {status}
      </span>
    );
  };

  const filteredDiscounts = discounts.filter(discount => {
    const discountData = discount as any; // Type assertion to handle field name differences
    const discountType = discountData.type || discountData.discount_type;
    const discountStatus = discountData.status || 
                          discount.status || 
                          (discountData.is_active === true ? 'active' : 
                           discountData.is_active === false ? 'inactive' : 'active');
    
    if (filterType && discountType !== filterType) return false;
    if (filterStatus && discountStatus !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Fee Discounts</h2>
        <button
          onClick={() => setShowDiscountForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Discount
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Type
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed Amount</option>
              <option value="conditional">Conditional</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setFilterType('');
                setFilterStatus('');
              }}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Discounts Table */}
      <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Discount Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    Loading discounts...
                  </td>
                </tr>
              ) : filteredDiscounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No discounts found
                  </td>
                </tr>
              ) : (
                filteredDiscounts.map((discount) => {
                  const discountData = discount as any; // Type assertion to handle field name differences

                  return (
                    <tr key={discount.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {discountData.name || discountData.discount_name || 'Unnamed Discount'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {discount.description || 'No description'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getTypeBadge(discountData.type || discountData.discount_type || 'percentage')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {(discountData.type || discountData.discount_type) === 'percentage' 
                            ? `${discountData.value || discountData.discount_value || 0}%`
                            : `₹${discountData.value || discountData.discount_value || 0}`
                          }
                        </div>
                      </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(
                        discountData.status || 
                        discount.status || 
                        (discountData.is_active === true ? 'active' : 
                         discountData.is_active === false ? 'inactive' : 'active')
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditDiscount(discount)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit Discount"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => discount.id && handleDeleteDiscount(discount.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Discount"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                        <select
                          value={discountData.status || 
                                 discount.status || 
                                 (discountData.is_active === true ? 'active' : 
                                  discountData.is_active === false ? 'inactive' : 'active')}
                          onChange={(e) => discount.id && handleStatusChange(discount.id, e.target.value)}
                          className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          title="Change Status"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="expired">Expired</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Discount Form Modal */}
      {showDiscountForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                {editingDiscount ? 'Edit Discount' : 'Add New Discount'}
              </h3>
              <button
                onClick={handleFormClose}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-6">
              {/* Discount Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Discount Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter discount name"
                  required
                />
              </div>

              {/* Discount Type and Value */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount Type *
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                    <option value="conditional">Conditional</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount Value *
                  </label>
                  <input
                    type="number"
                    name="value"
                    value={formData.value}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder={formData.type === 'percentage' ? 'Enter percentage' : 'Enter amount'}
                    min="0"
                    step={formData.type === 'percentage' ? '0.01' : '1'}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.type === 'percentage' ? 'Enter percentage (e.g., 10 for 10%)' : 'Enter amount in rupees'}
                  </p>
                </div>
              </div>

              {/* Applicable To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Applicable To *
                </label>
                <select
                  name="applicable_to"
                  value={formData.applicable_to}
                  onChange={handleInputChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="all">All Students</option>
                  <option value="class">Specific Classes</option>
                  <option value="student">Specific Students</option>
                </select>
              </div>

              {/* Class Selection */}
              {formData.applicable_to === 'class' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Classes *
                  </label>
                  <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-3">
                    {Array.isArray(classes) && classes.length > 0 ? (
                      classes.map((cls) => (
                        <label key={cls.id} className="flex items-center space-x-2 py-1">
                          <input
                            type="checkbox"
                            name="class_ids"
                            value={cls.id}
                            checked={formData.class_ids.includes(cls.id)}
                            onChange={handleInputChange}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">
                            {cls.class_name} (Grade {cls.grade_level})
                          </span>
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No classes available</p>
                    )}
                  </div>
                </div>
              )}

              {/* Student Selection */}
              {formData.applicable_to === 'student' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Students *
                  </label>
                  <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-3">
                    {loadingStudents ? (
                      <p className="text-sm text-gray-500">Loading students...</p>
                    ) : Array.isArray(students) && students.length > 0 ? (
                      students.map((student) => (
                        <label key={student.id} className="flex items-center space-x-2 py-1">
                          <input
                            type="checkbox"
                            name="student_ids"
                            value={student.id}
                            checked={formData.student_ids.includes(student.id)}
                            onChange={handleInputChange}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">
                            {student.first_name} {student.last_name}
                          </span>
                        </label>
                      ))
                    ) : (
                      <div>
                        <p className="text-sm text-gray-500">No students available</p>
                        <button
                          type="button"
                          onClick={fetchStudents}
                          className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
                        >
                          Retry loading students
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Max Amount (for percentage discounts) */}
              {formData.type === 'percentage' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Amount (Optional)
                  </label>
                  <input
                    type="number"
                    name="max_amount"
                    value={formData.max_amount}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Enter maximum discount amount"
                    min="0"
                    step="1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum amount this percentage discount can reach
                  </p>
                </div>
              )}

              {/* Validity Period */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valid From *
                  </label>
                  <input
                    type="date"
                    name="valid_from"
                    value={formData.valid_from}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valid To *
                  </label>
                  <input
                    type="date"
                    name="valid_to"
                    value={formData.valid_to}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter discount description (optional)"
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleFormClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formLoading ? 'Saving...' : (editingDiscount ? 'Update Discount' : 'Create Discount')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscountManagement;
