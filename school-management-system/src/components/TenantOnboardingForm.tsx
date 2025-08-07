import React, { useState } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface TenantFormData {
  schoolName: string;
  domain: string;
  adminName: string;
  adminEmail: string;
  phone: string;
  schoolType: string;
  studentCount: number;
  address: string;
  website: string;
}

interface DomainCheckResult {
  available: boolean;
  message: string;
}

const step1ValidationSchema = Yup.object({
  schoolName: Yup.string()
    .min(2, 'School name must be at least 2 characters')
    .max(255, 'School name must not exceed 255 characters')
    .matches(/^[a-zA-Z0-9\s\-.]+$/, 'School name can only contain letters, numbers, spaces, hyphens, and dots')
    .required('School name is required'),
  
  domain: Yup.string()
    .min(3, 'Domain must be at least 3 characters')
    .max(100, 'Domain must not exceed 100 characters')
    .matches(/^[a-zA-Z0-9.-]+$/, 'Domain can only contain letters, numbers, dots, and hyphens')
    .test('domain-format', 'Domain cannot contain consecutive dots or start/end with hyphens', function(value) {
      if (!value) return true;
      return !value.includes('..') && !value.startsWith('-') && !value.endsWith('-');
    })
    .required('Domain is required'),
  
  schoolType: Yup.string()
    .oneOf(['primary', 'secondary', 'high', 'university', 'other'], 'Please select a valid school type')
    .required('School type is required'),
  
  studentCount: Yup.number()
    .min(1, 'Student count must be at least 1')
    .max(100000, 'Student count must not exceed 100,000')
    .optional(),
  
  address: Yup.string()
    .max(500, 'Address must not exceed 500 characters')
    .optional(),
  
  website: Yup.string()
    .test('is-url', 'Please provide a valid website URL', function(value) {
      if (!value) return true; // Allow empty
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    })
    .optional(),
});

const step2ValidationSchema = Yup.object({
  adminName: Yup.string()
    .min(2, 'Admin name must be at least 2 characters')
    .max(100, 'Admin name must not exceed 100 characters')
    .matches(/^[a-zA-Z\s]+$/, 'Admin name can only contain letters and spaces')
    .required('Admin name is required'),
  
  adminEmail: Yup.string()
    .email('Please provide a valid email address')
    .test('email-format', 'Please provide a valid email address', function(value) {
      if (!value) return this.createError({ message: 'Admin email is required' });
      
      // Basic email format check
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return this.createError({ message: 'Please provide a valid email address' });
      }
      
      // Check for common invalid patterns
      if (value.includes('..') || value.startsWith('.') || value.endsWith('.')) {
        return this.createError({ message: 'Email address contains invalid characters' });
      }
      
      // Check domain has at least one dot and valid TLD
      const parts = value.split('@');
      if (parts.length !== 2) {
        return this.createError({ message: 'Email address format is invalid' });
      }
      
      const domain = parts[1];
      if (!domain || !domain.includes('.')) {
        return this.createError({ message: 'Email domain appears to be invalid' });
      }
      
      const tld = domain.split('.').pop();
      if (!tld || tld.length < 2) {
        return this.createError({ message: 'Email domain appears to be invalid' });
      }
      
      return true;
    })
    .required('Admin email is required'),
  
  phone: Yup.string()
    .test('phone-format', 'Please provide a valid phone number', function(value) {
      if (!value) return true; // Optional field
      
      // Remove all non-digit characters except + at the beginning
      const cleaned = value.replace(/[^\d+]/g, '');
      
      // Check if it starts with + (international) or is a local number
      if (cleaned.startsWith('+')) {
        // International format: +[country code][number] (total 7-15 digits)
        const internationalRegex = /^\+[1-9]\d{6,14}$/;
        if (!internationalRegex.test(cleaned)) {
          return this.createError({ message: 'Please provide a valid international phone number (e.g., +1234567890)' });
        }
      } else {
        // Local format: [number] (7-15 digits, can start with 0 in some countries)
        const localRegex = /^[0-9]\d{6,14}$/;
        if (!localRegex.test(cleaned)) {
          return this.createError({ message: 'Please provide a valid phone number (7-15 digits)' });
        }
      }
      
      return true;
    })
    .optional(),
});

interface TenantOnboardingFormProps {
  onSuccess?: (tenantId: string) => void;
}

const TenantOnboardingForm: React.FC<TenantOnboardingFormProps> = ({ onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [domainChecking, setDomainChecking] = useState(false);
  const [domainStatus, setDomainStatus] = useState<DomainCheckResult | null>(null);
  const [step, setStep] = useState(1);

  const initialValues: TenantFormData = {
    schoolName: '',
    domain: '',
    adminName: '',
    adminEmail: '',
    phone: '',
    schoolType: 'primary',
    studentCount: 0,
    address: '',
    website: '',
  };

  const checkDomainAvailability = async (domain: string): Promise<DomainCheckResult> => {
    try {
      setDomainChecking(true);
      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/tenants/domain/${domain}/check`);
      return response.data.data;
    } catch (error) {
      console.error('Error checking domain:', error);
      return {
        available: false,
        message: 'Error checking domain availability'
      };
    } finally {
      setDomainChecking(false);
    }
  };

  const handleDomainBlur = async (domain: string) => {
    if (domain && domain.length >= 3) {
      const result = await checkDomainAvailability(domain);
      setDomainStatus(result);
    } else {
      setDomainStatus(null);
    }
  };

  const handleSubmit = async (values: TenantFormData, { setSubmitting, resetForm }: any) => {
    setIsSubmitting(true);
    
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/tenants/onboard`,
        values,
        {
          timeout: 300000, // 5 minutes timeout
        }
      );

      if (response.data.success) {
        toast.success('School onboarded successfully! Check your email for login credentials.');
        resetForm();
        setStep(1);
        setDomainStatus(null);
        
        // Call onSuccess callback if provided
        if (onSuccess && response.data.data?.tenantId) {
          onSuccess(response.data.data.tenantId);
        }
      } else {
        toast.error(response.data.message || 'Failed to onboard school');
      }
    } catch (error: any) {
      console.error('Onboarding error:', error);
      
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else if (error.code === 'ECONNABORTED') {
        toast.error('Request timed out. Please try again.');
      } else {
        toast.error('An error occurred during onboarding. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
      setSubmitting(false);
    }
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              School Onboarding
            </h1>
            <p className="text-gray-600">
              Set up your school management system in minutes
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className={`flex items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  step >= 1 ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'
                }`}>
                  1
                </div>
                <span className="ml-2 font-medium">School Details</span>
              </div>
              <div className={`flex-1 h-1 mx-4 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
              <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  step >= 2 ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'
                }`}>
                  2
                </div>
                <span className="ml-2 font-medium">Admin Information</span>
              </div>
            </div>
          </div>

                                <Formik
             initialValues={initialValues}
             validationSchema={step === 1 ? step1ValidationSchema : step2ValidationSchema}
             onSubmit={handleSubmit}
           >
             {({ values, errors, touched, isValid, dirty }: any) => (
               <Form className="space-y-6">
                {step === 1 && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                      School Information
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="schoolName" className="block text-sm font-medium text-gray-700 mb-2">
                          School Name *
                        </label>
                        <Field
                          type="text"
                          id="schoolName"
                          name="schoolName"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter school name"
                        />
                        <ErrorMessage name="schoolName" component="div" className="text-red-500 text-sm mt-1" />
                      </div>

                      <div>
                        <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-2">
                          Domain *
                        </label>
                        <Field
                          type="text"
                          id="domain"
                          name="domain"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="your-school"
                          onBlur={(e: React.FocusEvent<HTMLInputElement>) => handleDomainBlur(e.target.value)}
                        />
                        <ErrorMessage name="domain" component="div" className="text-red-500 text-sm mt-1" />
                        {domainChecking && (
                          <div className="text-blue-500 text-sm mt-1">Checking domain availability...</div>
                        )}
                        {domainStatus && (
                          <div className={`text-sm mt-1 ${domainStatus.available ? 'text-green-500' : 'text-red-500'}`}>
                            {domainStatus.message}
                          </div>
                        )}
                      </div>

                      <div>
                        <label htmlFor="schoolType" className="block text-sm font-medium text-gray-700 mb-2">
                          School Type *
                        </label>
                        <Field
                          as="select"
                          id="schoolType"
                          name="schoolType"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="primary">Primary School</option>
                          <option value="secondary">Secondary School</option>
                          <option value="high">High School</option>
                          <option value="university">University</option>
                          <option value="other">Other</option>
                        </Field>
                        <ErrorMessage name="schoolType" component="div" className="text-red-500 text-sm mt-1" />
                      </div>

                      <div>
                        <label htmlFor="studentCount" className="block text-sm font-medium text-gray-700 mb-2">
                          Number of Students
                        </label>
                        <Field
                          type="number"
                          id="studentCount"
                          name="studentCount"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter student count"
                        />
                        <ErrorMessage name="studentCount" component="div" className="text-red-500 text-sm mt-1" />
                      </div>

                      <div className="md:col-span-2">
                        <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                          School Address
                        </label>
                        <Field
                          as="textarea"
                          id="address"
                          name="address"
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter school address"
                        />
                        <ErrorMessage name="address" component="div" className="text-red-500 text-sm mt-1" />
                      </div>

                      <div className="md:col-span-2">
                        <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-2">
                          School Website
                        </label>
                        <Field
                          type="url"
                          id="website"
                          name="website"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="https://www.yourschool.com"
                        />
                        <ErrorMessage name="website" component="div" className="text-red-500 text-sm mt-1" />
                      </div>
                    </div>

                                         <div className="flex justify-end">
                       <button
                         type="button"
                         onClick={nextStep}
                         disabled={
                           !isValid || 
                           !dirty || 
                           (domainStatus ? !domainStatus.available : false) ||
                           !values.schoolName || 
                           !values.domain || 
                           !values.schoolType
                         }
                         className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                       >
                         Next
                       </button>
                     </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                      Administrator Information
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="adminName" className="block text-sm font-medium text-gray-700 mb-2">
                          Admin Name *
                        </label>
                        <Field
                          type="text"
                          id="adminName"
                          name="adminName"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter admin name"
                        />
                        <ErrorMessage name="adminName" component="div" className="text-red-500 text-sm mt-1" />
                      </div>

                      <div>
                        <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700 mb-2">
                          Admin Email *
                        </label>
                        <Field
                          type="email"
                          id="adminEmail"
                          name="adminEmail"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="admin@school.com"
                        />
                        <ErrorMessage name="adminEmail" component="div" className="text-red-500 text-sm mt-1" />
                      </div>

                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                          Phone Number
                        </label>
                        <Field
                          type="tel"
                          id="phone"
                          name="phone"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="+1234567890"
                        />
                        <ErrorMessage name="phone" component="div" className="text-red-500 text-sm mt-1" />
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                      <h3 className="text-sm font-medium text-blue-900 mb-2">What happens next?</h3>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Your school database will be created automatically</li>
                        <li>• An admin account will be set up for you</li>
                        <li>• You'll receive login credentials via email</li>
                        <li>• The process typically takes 2-3 minutes</li>
                      </ul>
                    </div>

                    <div className="flex justify-between">
                      <button
                        type="button"
                        onClick={prevStep}
                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting || !isValid || !dirty}
                        className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Onboarding...
                          </div>
                        ) : (
                          'Complete Onboarding'
                        )}
                      </button>
                    </div>
                  </div>
                                 )}
               </Form>
             )}
          </Formik>
        </div>
      </div>
    </div>
  );
};

export default TenantOnboardingForm; 