import React, { useState, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import { toast } from 'react-toastify';

interface CustomDomainFormData {
  domain: string;
  verificationType: 'txt' | 'file';
}

interface DomainInfo {
  id: number;
  domain: string;
  verification_type: string;
  verification_status: string;
  verification_token: string;
  created_at: string;
}

const validationSchema = Yup.object({
  domain: Yup.string()
    .matches(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/, 'Please enter a valid domain')
    .required('Domain is required'),
  verificationType: Yup.string()
    .oneOf(['txt', 'file'], 'Please select a verification type')
    .required('Verification type is required')
});

const CustomDomainSetup: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const [domains, setDomains] = useState<DomainInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);

  const initialValues: CustomDomainFormData = {
    domain: '',
    verificationType: 'txt'
  };

  // Load existing domains
  useEffect(() => {
    loadDomains();
  }, [tenantId]);

  const loadDomains = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/domains/tenant/${tenantId}`
      );
      if (response.data.success) {
        setDomains(response.data.data.domains);
      }
    } catch (error) {
      console.error('Error loading domains:', error);
    }
  };

  const handleSubmit = async (values: CustomDomainFormData, { setSubmitting, resetForm }: any) => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/domains/add`,
        {
          tenantId,
          domain: values.domain,
          verificationType: values.verificationType
        }
      );

      if (response.data.success) {
        toast.success('Domain added successfully!');
        resetForm();
        loadDomains();
      } else {
        toast.error(response.data.message || 'Failed to add domain');
      }
    } catch (error: any) {
      console.error('Error adding domain:', error);
      toast.error(error.response?.data?.message || 'Failed to add domain');
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  const handleVerify = async (domain: string) => {
    setVerifying(domain);
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/domains/verify/${domain}`
      );

      if (response.data.success) {
        if (response.data.data.verified) {
          toast.success('Domain verified successfully!');
        } else {
          toast.error('Domain verification failed. Please check your DNS settings.');
        }
        loadDomains();
      } else {
        toast.error(response.data.message || 'Failed to verify domain');
      }
    } catch (error: any) {
      console.error('Error verifying domain:', error);
      toast.error(error.response?.data?.message || 'Failed to verify domain');
    } finally {
      setVerifying(null);
    }
  };

  const handleDelete = async (domain: string) => {
    if (!window.confirm(`Are you sure you want to delete ${domain}?`)) {
      return;
    }

    try {
      const response = await axios.delete(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/domains/${domain}`,
        {
          data: { tenantId }
        }
      );

      if (response.data.success) {
        toast.success('Domain deleted successfully!');
        loadDomains();
      } else {
        toast.error(response.data.message || 'Failed to delete domain');
      }
    } catch (error: any) {
      console.error('Error deleting domain:', error);
      toast.error(error.response?.data?.message || 'Failed to delete domain');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">Verified</span>;
      case 'pending':
        return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">Pending</span>;
      case 'failed':
        return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">Failed</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Add Custom Domain</h2>
        
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting }) => (
            <Form className="space-y-4">
              <div>
                <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-2">
                  Domain Name
                </label>
                <Field
                  type="text"
                  id="domain"
                  name="domain"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="example.com"
                />
                <ErrorMessage name="domain" component="div" className="text-red-500 text-sm mt-1" />
              </div>

              <div>
                <label htmlFor="verificationType" className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Method
                </label>
                <Field
                  as="select"
                  id="verificationType"
                  name="verificationType"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="txt">TXT Record</option>
                  <option value="file">File Upload</option>
                </Field>
                <ErrorMessage name="verificationType" component="div" className="text-red-500 text-sm mt-1" />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Adding Domain...' : 'Add Domain'}
              </button>
            </Form>
          )}
        </Formik>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Domains</h2>
        
        {domains.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No custom domains added yet.</p>
        ) : (
          <div className="space-y-4">
            {domains.map((domain) => (
              <div key={domain.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{domain.domain}</h3>
                    <p className="text-sm text-gray-500">
                      Verification: {domain.verification_type.toUpperCase()}
                    </p>
                    <p className="text-sm text-gray-500">
                      Token: {domain.verification_token}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(domain.verification_status)}
                    {domain.verification_status === 'pending' && (
                      <button
                        onClick={() => handleVerify(domain.domain)}
                        disabled={verifying === domain.domain}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        {verifying === domain.domain ? 'Verifying...' : 'Verify'}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(domain.domain)}
                      className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">How it works:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Add your custom domain (e.g., school.com)</li>
          <li>• Verify ownership via TXT record or file upload</li>
          <li>• Once verified, your domain will route to your school</li>
          <li>• If verification fails, the system falls back to subdomain</li>
        </ul>
      </div>
    </div>
  );
};

export default CustomDomainSetup; 