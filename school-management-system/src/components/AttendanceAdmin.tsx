import React, { useState, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import { toast } from 'react-toastify';

interface AttendanceConfig {
  attendance_mode: 'manual' | 'qr' | 'biometric';
  grace_time_minutes: number;
  cut_off_time_minutes: number;
  sms_alerts_enabled: boolean;
  offline_mode_enabled: boolean;
  conflict_resolution: 'latest' | 'earliest' | 'manual';
}

interface ClassInfo {
  id: number;
  class_name: string;
  grade_level: string;
  teacher_id: number;
}

interface BiometricDevice {
  id: number;
  device_id: string;
  device_name: string;
  device_type: string;
  location: string;
  status: string;
}

interface SMSAlert {
  id: number;
  student_id: number;
  alert_type: string;
  message: string;
  phone_number: string;
  status: string;
  created_at: string;
}

const validationSchema = Yup.object({
  attendance_mode: Yup.string()
    .oneOf(['manual', 'qr', 'biometric'], 'Please select a valid attendance mode')
    .required('Attendance mode is required'),
  grace_time_minutes: Yup.number()
    .min(0, 'Grace time must be at least 0 minutes')
    .max(60, 'Grace time cannot exceed 60 minutes')
    .required('Grace time is required'),
  cut_off_time_minutes: Yup.number()
    .min(0, 'Cut-off time must be at least 0 minutes')
    .max(120, 'Cut-off time cannot exceed 120 minutes')
    .required('Cut-off time is required'),
  sms_alerts_enabled: Yup.boolean(),
  offline_mode_enabled: Yup.boolean(),
  conflict_resolution: Yup.string()
    .oneOf(['latest', 'earliest', 'manual'], 'Please select a valid conflict resolution method')
    .required('Conflict resolution method is required')
});

const AttendanceAdmin: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [attendanceConfig, setAttendanceConfig] = useState<AttendanceConfig | null>(null);
  const [biometricDevices, setBiometricDevices] = useState<BiometricDevice[]>([]);
  const [smsAlerts, setSmsAlerts] = useState<SMSAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  useEffect(() => {
    loadClasses();
    loadBiometricDevices();
    loadSMSAlerts();
    checkBiometricEnabled();
  }, [tenantId]);

  const loadClasses = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/classes/${tenantId}`
      );
      if (response.data.success) {
        setClasses(response.data.data);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const loadBiometricDevices = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/attendance/devices/${tenantId}`
      );
      if (response.data.success) {
        setBiometricDevices(response.data.data);
      }
    } catch (error) {
      console.error('Error loading biometric devices:', error);
    }
  };

  const loadSMSAlerts = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/attendance/sms/${tenantId}`
      );
      if (response.data.success) {
        setSmsAlerts(response.data.data);
      }
    } catch (error) {
      console.error('Error loading SMS alerts:', error);
    }
  };

  const checkBiometricEnabled = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/super-admin/tenants/${tenantId}/biometric`
      );
      if (response.data.success) {
        setBiometricEnabled(response.data.data.biometric_enabled || false);
      }
    } catch (error) {
      console.error('Error checking biometric enabled:', error);
      setBiometricEnabled(false);
    }
  };

  const loadAttendanceConfig = async (classId: number) => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/attendance/config/${tenantId}/${classId}`
      );
      if (response.data.success) {
        setAttendanceConfig(response.data.data);
      } else {
        // Set default config if none exists
        setAttendanceConfig({
          attendance_mode: 'manual',
          grace_time_minutes: 15,
          cut_off_time_minutes: 30,
          sms_alerts_enabled: true,
          offline_mode_enabled: false,
          conflict_resolution: 'latest'
        });
      }
    } catch (error) {
      console.error('Error loading attendance config:', error);
    }
  };

  const handleClassChange = (classId: number) => {
    setSelectedClass(classId);
    loadAttendanceConfig(classId);
  };

  const handleSubmit = async (values: AttendanceConfig, { setSubmitting }: any) => {
    if (!selectedClass) {
      toast.error('Please select a class first');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.put(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/attendance/config/${tenantId}/${selectedClass}`,
        values
      );

      if (response.data.success) {
        toast.success('Attendance configuration updated successfully!');
        setAttendanceConfig(response.data.data);
      } else {
        toast.error(response.data.message || 'Failed to update attendance configuration');
      }
    } catch (error: any) {
      console.error('Error updating attendance config:', error);
      toast.error(error.response?.data?.message || 'Failed to update attendance configuration');
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  const generateQRCode = async () => {
    if (!selectedClass) {
      toast.error('Please select a class first');
      return;
    }

    try {
      const validFrom = new Date();
      const validUntil = new Date(validFrom.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/attendance/qr/generate/${tenantId}/${selectedClass}`,
        {
          validFrom: validFrom.toISOString(),
          validUntil: validUntil.toISOString()
        }
      );

      if (response.data.success) {
        toast.success('QR code generated successfully!');
        // You can display the QR code here
        console.log('QR Code:', response.data.data);
      } else {
        toast.error(response.data.message || 'Failed to generate QR code');
      }
    } catch (error: any) {
      console.error('Error generating QR code:', error);
      toast.error(error.response?.data?.message || 'Failed to generate QR code');
    }
  };

  const syncOfflineAttendance = async () => {
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/attendance/sync/offline/${tenantId}`
      );

      if (response.data.success) {
        toast.success('Offline attendance synced successfully!');
      } else {
        toast.error(response.data.message || 'Failed to sync offline attendance');
      }
    } catch (error: any) {
      console.error('Error syncing offline attendance:', error);
      toast.error(error.response?.data?.message || 'Failed to sync offline attendance');
    }
  };

  const resendFailedSMSAlerts = async () => {
    const failedAlerts = smsAlerts.filter(alert => alert.status === 'failed');
    if (failedAlerts.length === 0) {
      toast.info('No failed SMS alerts to resend');
      return;
    }

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/attendance/sms/resend/${tenantId}`,
        {
          alertIds: failedAlerts.map(alert => alert.id)
        }
      );

      if (response.data.success) {
        toast.success(`Resent ${failedAlerts.length} failed SMS alerts`);
        loadSMSAlerts();
      } else {
        toast.error(response.data.message || 'Failed to resend SMS alerts');
      }
    } catch (error: any) {
      console.error('Error resending SMS alerts:', error);
      toast.error(error.response?.data?.message || 'Failed to resend SMS alerts');
    }
  };

  return (
    <div className="space-y-6">
      {/* Class Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Class Selection</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {classes.map((classInfo) => (
            <button
              key={classInfo.id}
              onClick={() => handleClassChange(classInfo.id)}
              className={`p-4 border rounded-lg text-left transition-colors ${
                selectedClass === classInfo.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <h3 className="font-medium text-gray-900">{classInfo.class_name}</h3>
              <p className="text-sm text-gray-500">Grade: {classInfo.grade_level}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Attendance Configuration */}
      {selectedClass && attendanceConfig && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Attendance Configuration</h2>
          <Formik
            initialValues={attendanceConfig}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
            enableReinitialize
          >
            {({ isSubmitting, values }) => (
              <Form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Attendance Mode */}
                  <div>
                    <label htmlFor="attendance_mode" className="block text-sm font-medium text-gray-700 mb-2">
                      Attendance Mode
                    </label>
                    <Field
                      as="select"
                      id="attendance_mode"
                      name="attendance_mode"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="manual">Manual</option>
                      <option value="qr">QR Code</option>
                      <option value="biometric" disabled={!biometricEnabled}>
                        Biometric {!biometricEnabled && '(Not Enabled)'}
                      </option>
                    </Field>
                    <ErrorMessage name="attendance_mode" component="div" className="text-red-500 text-sm mt-1" />
                    {values.attendance_mode === 'biometric' && !biometricEnabled && (
                      <p className="text-yellow-600 text-sm mt-1">
                        Biometric attendance must be enabled by super admin first
                      </p>
                    )}
                  </div>

                  {/* Grace Time */}
                  <div>
                    <label htmlFor="grace_time_minutes" className="block text-sm font-medium text-gray-700 mb-2">
                      Grace Time (minutes)
                    </label>
                    <Field
                      type="number"
                      id="grace_time_minutes"
                      name="grace_time_minutes"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <ErrorMessage name="grace_time_minutes" component="div" className="text-red-500 text-sm mt-1" />
                  </div>

                  {/* Cut-off Time */}
                  <div>
                    <label htmlFor="cut_off_time_minutes" className="block text-sm font-medium text-gray-700 mb-2">
                      Cut-off Time (minutes)
                    </label>
                    <Field
                      type="number"
                      id="cut_off_time_minutes"
                      name="cut_off_time_minutes"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <ErrorMessage name="cut_off_time_minutes" component="div" className="text-red-500 text-sm mt-1" />
                  </div>

                  {/* Conflict Resolution */}
                  <div>
                    <label htmlFor="conflict_resolution" className="block text-sm font-medium text-gray-700 mb-2">
                      Conflict Resolution
                    </label>
                    <Field
                      as="select"
                      id="conflict_resolution"
                      name="conflict_resolution"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="latest">Latest Entry</option>
                      <option value="earliest">Earliest Entry</option>
                      <option value="manual">Manual Resolution</option>
                    </Field>
                    <ErrorMessage name="conflict_resolution" component="div" className="text-red-500 text-sm mt-1" />
                  </div>
                </div>

                {/* Toggle Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center">
                    <Field
                      type="checkbox"
                      id="sms_alerts_enabled"
                      name="sms_alerts_enabled"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="sms_alerts_enabled" className="ml-2 block text-sm text-gray-900">
                      Enable SMS Alerts
                    </label>
                  </div>

                  <div className="flex items-center">
                    <Field
                      type="checkbox"
                      id="offline_mode_enabled"
                      name="offline_mode_enabled"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="offline_mode_enabled" className="ml-2 block text-sm text-gray-900">
                      Enable Offline Mode
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || loading}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Updating Configuration...' : 'Update Configuration'}
                </button>
              </Form>
            )}
          </Formik>
        </div>
      )}

      {/* Quick Actions */}
      {selectedClass && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={generateQRCode}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Generate QR Code
            </button>
            <button
              onClick={syncOfflineAttendance}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
            >
              Sync Offline Attendance
            </button>
            <button
              onClick={resendFailedSMSAlerts}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Resend Failed SMS
            </button>
          </div>
        </div>
      )}

      {/* Biometric Devices */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Biometric Devices</h2>
        {biometricDevices.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {biometricDevices.map((device) => (
              <div key={device.id} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900">{device.device_name}</h3>
                <p className="text-sm text-gray-500">Type: {device.device_type}</p>
                <p className="text-sm text-gray-500">Location: {device.location}</p>
                <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                  device.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {device.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No biometric devices configured</p>
        )}
      </div>

      {/* SMS Alerts */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">SMS Alerts</h2>
        {smsAlerts.length > 0 ? (
          <div className="space-y-4">
            {smsAlerts.slice(0, 10).map((alert) => (
              <div key={alert.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">{alert.alert_type}</p>
                    <p className="text-sm text-gray-500">{alert.message}</p>
                    <p className="text-sm text-gray-500">{alert.phone_number}</p>
                  </div>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                    alert.status === 'sent' ? 'bg-green-100 text-green-800' : 
                    alert.status === 'failed' ? 'bg-red-100 text-red-800' : 
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {alert.status}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {new Date(alert.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No SMS alerts found</p>
        )}
      </div>
    </div>
  );
};

export default AttendanceAdmin;
