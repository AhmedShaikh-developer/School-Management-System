import React, { useState, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import { toast } from 'react-toastify';

interface TenantBiometricSettings {
  tenant_id: string;
  school_name: string;
  domain: string;
  status: string;
  biometric_enabled: boolean;
  device_configuration: any;
  allowed_devices: string[];
  max_devices: number;
  biometric_created_at?: string;
  biometric_updated_at?: string;
}

interface BiometricStats {
  overall: {
    total_tenants: number;
    biometric_enabled_count: number;
    biometric_disabled_count: number;
  };
  recent_usage: Array<{
    school_name: string;
    tenant_id: string;
    attendance_count: number;
  }>;
}

const validationSchema = Yup.object({
  biometric_enabled: Yup.boolean().required(),
  max_devices: Yup.number()
    .min(1, 'Maximum devices must be at least 1')
    .max(20, 'Maximum devices cannot exceed 20')
    .required('Maximum devices is required'),
  allowed_devices: Yup.array().of(Yup.string()),
  device_configuration: Yup.object()
});

// Utility function to get authenticated axios instance
const getAuthenticatedAxios = () => {
  const token = localStorage.getItem('superAdminToken');
  const instance = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
    timeout: 30000,
  });

  // Add authorization header if token exists
  if (token) {
    instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  return instance;
};

const SuperAdminBiometric: React.FC = () => {
  const [tenants, setTenants] = useState<TenantBiometricSettings[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<TenantBiometricSettings | null>(null);
  const [stats, setStats] = useState<BiometricStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTenants();
    loadStats();
  }, []);

  const loadTenants = async () => {
    try {
      const axiosInstance = getAuthenticatedAxios();
      const response = await axiosInstance.get('/api/super-admin/tenants/biometric');
      if (response.data.success) {
        setTenants(response.data.data);
      }
    } catch (error: any) {
      console.error('Error loading tenants:', error);
      if (error.response?.status === 401) {
        toast.error('Authentication expired. Please login again.');
        // Redirect to login
        localStorage.removeItem('superAdminToken');
        localStorage.removeItem('superAdminUser');
        window.location.href = '/super-admin/login';
      } else {
        toast.error('Failed to load tenants');
      }
    }
  };

  const loadStats = async () => {
    try {
      const axiosInstance = getAuthenticatedAxios();
      const response = await axiosInstance.get('/api/super-admin/biometric/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error: any) {
      console.error('Error loading stats:', error);
      if (error.response?.status === 401) {
        toast.error('Authentication expired. Please login again.');
        localStorage.removeItem('superAdminToken');
        localStorage.removeItem('superAdminUser');
        window.location.href = '/super-admin/login';
      }
    }
  };

  const handleTenantSelect = (tenant: TenantBiometricSettings) => {
    setSelectedTenant(tenant);
  };

  const handleEnableBiometric = async (tenantId: string) => {
    setLoading(true);
    try {
      const axiosInstance = getAuthenticatedAxios();
      const response = await axiosInstance.post(
        `/api/super-admin/tenants/${tenantId}/biometric/enable`,
        {
          device_configuration: {},
          allowed_devices: [],
          max_devices: 5
        }
      );

      if (response.data.success) {
        toast.success('Biometric attendance enabled successfully!');
        loadTenants();
        loadStats();
      } else {
        toast.error(response.data.message || 'Failed to enable biometric attendance');
      }
    } catch (error: any) {
      console.error('Error enabling biometric:', error);
      if (error.response?.status === 401) {
        toast.error('Authentication expired. Please login again.');
        localStorage.removeItem('superAdminToken');
        localStorage.removeItem('superAdminUser');
        window.location.href = '/super-admin/login';
      } else {
        toast.error('Failed to enable biometric attendance');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDisableBiometric = async (tenantId: string) => {
    setLoading(true);
    try {
      const axiosInstance = getAuthenticatedAxios();
      const response = await axiosInstance.post(
        `/api/super-admin/tenants/${tenantId}/biometric/disable`
      );

      if (response.data.success) {
        toast.success('Biometric attendance disabled successfully!');
        loadTenants();
        loadStats();
      } else {
        toast.error(response.data.message || 'Failed to disable biometric attendance');
      }
    } catch (error: any) {
      console.error('Error disabling biometric attendance:', error);
      if (error.response?.status === 401) {
        toast.error('Authentication expired. Please login again.');
        localStorage.removeItem('superAdminToken');
        localStorage.removeItem('superAdminUser');
        window.location.href = '/super-admin/login';
      } else {
        toast.error(error.response?.data?.message || 'Failed to disable biometric attendance');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (values: any) => {
    if (!selectedTenant) return;

    setLoading(true);
    try {
      const axiosInstance = getAuthenticatedAxios();
      const response = await axiosInstance.put(
        `/api/super-admin/tenants/${selectedTenant.tenant_id}/biometric`,
        values
      );

      if (response.data.success) {
        toast.success('Biometric settings updated successfully!');
        loadTenants();
        setSelectedTenant(response.data.data);
      } else {
        toast.error(response.data.message || 'Failed to update biometric settings');
      }
    } catch (error: any) {
      console.error('Error updating biometric settings:', error);
      if (error.response?.status === 401) {
        toast.error('Authentication expired. Please login again.');
        localStorage.removeItem('superAdminToken');
        localStorage.removeItem('superAdminUser');
        window.location.href = '/super-admin/login';
      } else {
        toast.error(error.response?.data?.message || 'Failed to update biometric settings');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      {stats && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Biometric Attendance Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-blue-900">Total Tenants</h3>
              <p className="text-3xl font-bold text-blue-600">{stats.overall.total_tenants}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-green-900">Biometric Enabled</h3>
              <p className="text-3xl font-bold text-green-600">{stats.overall.biometric_enabled_count}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-yellow-900">Biometric Disabled</h3>
              <p className="text-3xl font-bold text-yellow-600">{stats.overall.biometric_disabled_count}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tenants List */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Tenants Biometric Settings</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  School Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Domain
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Biometric Enabled
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tenants.map((tenant) => (
                <tr key={tenant.tenant_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{tenant.school_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{tenant.domain}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      tenant.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {tenant.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      tenant.biometric_enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {tenant.biometric_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleTenantSelect(tenant)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Configure
                      </button>
                      {tenant.biometric_enabled ? (
                        <button
                          onClick={() => handleDisableBiometric(tenant.tenant_id)}
                          disabled={loading}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        >
                          Disable
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEnableBiometric(tenant.tenant_id)}
                          disabled={loading}
                          className="text-green-600 hover:text-green-900 disabled:opacity-50"
                        >
                          Enable
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tenant Configuration */}
      {selectedTenant && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Configure Biometric Settings - {selectedTenant.school_name}
          </h2>
          <Formik
            initialValues={{
              biometric_enabled: selectedTenant.biometric_enabled,
              max_devices: selectedTenant.max_devices || 5,
              allowed_devices: selectedTenant.allowed_devices || [],
              device_configuration: selectedTenant.device_configuration || {}
            }}
            validationSchema={validationSchema}
            onSubmit={handleUpdateSettings}
            enableReinitialize
          >
            {({ isSubmitting, values }) => (
              <Form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Biometric Enabled */}
                  <div className="flex items-center">
                    <Field
                      type="checkbox"
                      id="biometric_enabled"
                      name="biometric_enabled"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="biometric_enabled" className="ml-2 block text-sm text-gray-900">
                      Enable Biometric Attendance
                    </label>
                  </div>

                  {/* Max Devices */}
                  <div>
                    <label htmlFor="max_devices" className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Devices
                    </label>
                    <Field
                      type="number"
                      id="max_devices"
                      name="max_devices"
                      min="1"
                      max="20"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <ErrorMessage name="max_devices" component="div" className="text-red-500 text-sm mt-1" />
                  </div>
                </div>

                {/* Allowed Devices */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Allowed Device IDs (comma-separated)
                  </label>
                  <Field
                    as="textarea"
                    name="allowed_devices"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="device1,device2,device3"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Leave empty to allow all devices
                  </p>
                </div>

                {/* Device Configuration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Device Configuration (JSON)
                  </label>
                  <Field
                    as="textarea"
                    name="device_configuration"
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    placeholder='{"timeout": 30, "retry_attempts": 3}'
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    JSON configuration for biometric devices
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || loading}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Updating Settings...' : 'Update Settings'}
                </button>
              </Form>
            )}
          </Formik>
        </div>
      )}

      {/* Recent Usage */}
      {stats && stats.recent_usage.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Biometric Usage</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    School Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Attendance Count (7 days)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.recent_usage.map((usage) => (
                  <tr key={usage.tenant_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{usage.school_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{usage.attendance_count}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminBiometric;
