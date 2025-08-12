import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, useSearchParams, NavLink } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import TenantOnboardingForm from './components/TenantOnboardingForm';
import CustomDomainSetup from './components/CustomDomainSetup';
import BrandingCustomization from './components/BrandingCustomization';
import AttendanceAdmin from './components/AttendanceAdmin';
import SuperAdminBiometric from './components/SuperAdminBiometric';
import SuperAdminLogin from './components/SuperAdminLogin';
import ChangePassword from './components/ChangePassword';
import OnboardingSuccess from './components/OnboardingSuccess';
import StudentManagement from './components/StudentManagement/StudentManagement';
import ClassManagement from './components/ClassManagement/ClassManagement';

import axios from 'axios';
import './App.css';

// Context for tenant information
interface TenantContextType {
  tenantId: string | null;
  setTenantId: (id: string | null) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (auth: boolean) => void;
  tenantUser: any | null;
  setTenantUser: (user: any | null) => void;
  tenantInfo: any | null;
  setTenantInfo: (info: any | null) => void;
  tenantToken: string | null;
  setTenantToken: (token: string | null) => void;
  refreshBranding: () => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

// Context for managing super admin authentication
interface SuperAdminContextType {
  isAuthenticated: boolean;
  user: any | null;
  token: string | null;
  login: (userData: any, token: string) => void;
  logout: () => void;
}

const SuperAdminContext = createContext<SuperAdminContextType>({
  isAuthenticated: false,
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
});

// Home/Landing Page Component
const HomePage: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center max-w-2xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">
          School Management System
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          A comprehensive multi-tenant school management platform
        </p>
        <div className="space-y-4">
          <button
            onClick={() => navigate('/onboarding')}
            className="w-full md:w-auto px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mr-4"
          >
            Start School Onboarding
          </button>
          <button
            onClick={() => navigate('/super-admin/login')}
            className="w-full md:w-auto px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors mr-4"
          >
            Super Admin Portal
          </button>
          <button
            onClick={() => navigate('/tenant/login')}
            className="w-full md:w-auto px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            School Login
          </button>
        </div>
      </div>
    </div>
  );
};

// Navigation Component for tenant-specific pages
const TenantNavigation: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  const isActive = (path: string) => {
    const currentPath = location.pathname;
    const currentTenantId = searchParams.get('tenantId');
    return currentPath === path && currentTenantId === tenantId;
  };
  
  return (
    <div className="flex justify-center space-x-4 mb-8">
      <button
        onClick={() => navigate(`/domain-and-branding?tenantId=${tenantId}`)}
        className={`px-4 py-2 rounded-md transition-colors ${
          isActive('/domain-and-branding')
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        Domain & Branding
      </button>
    </div>
  );
};

// Tenant Layout Component
const TenantLayout: React.FC<{ children: React.ReactNode; title: string; description: string; tenantId: string }> = ({ 
  children, 
  title, 
  description, 
  tenantId 
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
            <p className="text-gray-600">{description}</p>
          </div>
          
          <TenantNavigation tenantId={tenantId} />
          
          {children}
        </div>
      </div>
    </div>
  );
};

// Attendance Navigation Component (No Domain & Branding button)
const AttendanceNavigation: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  const isActive = (path: string) => {
    const currentPath = location.pathname;
    const currentTenantId = searchParams.get('tenantId');
    return currentPath === path && currentTenantId === tenantId;
  };
  
  return (
    <div className="flex justify-center space-x-4 mb-8">
      <button
        onClick={() => navigate('/dashboard')}
        className={`px-4 py-2 rounded-md transition-colors ${
          isActive('/dashboard')
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        Back to Dashboard
      </button>
    </div>
  );
};

// Attendance Layout Component (Without Domain & Branding navigation)
const AttendanceLayout: React.FC<{ children: React.ReactNode; title: string; description: string; tenantId: string }> = ({ 
  children, 
  title, 
  description, 
  tenantId 
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
            <p className="text-gray-600">{description}</p>
          </div>
          
          <AttendanceNavigation tenantId={tenantId} />
          
          {children}
        </div>
      </div>
    </div>
  );
};

// Onboarding Page Component
const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { setTenantId } = useTenant();
  const [onboardingData, setOnboardingData] = useState<any>(null);
  
  const handleOnboardingSuccess = (
    newTenantId: string, 
    domain: string, 
    schoolName: string, 
    adminEmail: string, 
    tempPassword: string
  ) => {
    setTenantId(newTenantId);
    setOnboardingData({
      tenantId: newTenantId,
      domain,
      schoolName,
      adminEmail,
      tempPassword
    });
  };
  
  // If onboarding is complete, show success page
  if (onboardingData) {
    return (
      <OnboardingSuccess
        tenantId={onboardingData.tenantId}
        domain={onboardingData.domain}
        schoolName={onboardingData.schoolName}
        adminEmail={onboardingData.adminEmail}
        tempPassword={onboardingData.tempPassword}
      />
    );
  }
  
  return <TenantOnboardingForm onSuccess={handleOnboardingSuccess} />;
};

// Tenant Login Page Component
const TenantLoginPage: React.FC = () => {
  const [domain, setDomain] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { setTenantId, setIsAuthenticated, setTenantUser, setTenantInfo, setTenantToken } = useTenant();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/tenant-auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domain, email, password }),
      });

      const data = await response.json();

      if (data.success) {
        // Store authentication data
        setTenantId(data.data.tenant.tenant_id);
        setTenantUser(data.data.user);
        setTenantInfo(data.data.tenant);
        setTenantToken(data.data.token);
        setIsAuthenticated(true);
        
        // Store in localStorage for persistence
        localStorage.setItem('tenantToken', data.data.token);
        localStorage.setItem('tenantId', data.data.tenant.tenant_id);
        localStorage.setItem('tenantUser', JSON.stringify(data.data.user));
        localStorage.setItem('tenantInfo', JSON.stringify(data.data.tenant));
        
        // Navigate to dashboard
        navigate('/dashboard');
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to your school
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter your school domain and credentials
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="domain" className="block text-sm font-medium text-gray-700">
                School Domain
              </label>
              <div className="mt-1">
                <input
                  id="domain"
                  name="domain"
                  type="text"
                  required
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="your-school"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Enter your school's domain (e.g., your-school)
              </p>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="admin@school.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  New to the platform?
                </span>
              </div>
            </div>

            <div className="mt-6">
              <a
                href="/onboard"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Onboard your school
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Protected Tenant Page Component
const ProtectedTenantPage: React.FC<{ 
  children: React.ReactNode; 
  title: string; 
  description: string; 
  tenantId: string;
}> = ({ children, title, description, tenantId }) => {
  const { isAuthenticated, tenantUser } = useTenant();
  const navigate = useNavigate();
  
  if (!isAuthenticated || !tenantUser) {
    return <Navigate to="/tenant/login" replace />;
  }
  
  return (
    <TenantLayout title={title} description={description} tenantId={tenantId}>
      {children}
    </TenantLayout>
  );
};

// Attendance Page Component
const AttendancePage: React.FC = () => {
  const { tenantId, isAuthenticated, tenantUser, tenantToken } = useTenant();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  // Fetch attendance settings on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      if (!tenantId) return;
      
      try {
        const response = await fetch(`http://localhost:5000/api/attendance/settings/${tenantId}`, {
          headers: {
            'Authorization': `Bearer ${tenantToken}`
          }
        });
        const data = await response.json();
        
        if (data.success) {
          setSettings(data.data);
        }
      } catch (error) {
        console.error('Error fetching attendance settings:', error);
        setError('Failed to load attendance settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [tenantId, tenantToken]);

  const handleSave = async () => {
    if (!tenantId || !settings) return;
    
    setSaving(true);
    setMessage('');
    setError('');
    
    try {
      const response = await fetch(`http://localhost:5000/api/attendance/settings/${tenantId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tenantToken}`
        },
        body: JSON.stringify(settings)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage('Attendance settings saved successfully!');
      } else {
        setError(data.message || 'Failed to save settings');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (path: string, value: any) => {
    setSettings((prev: any) => {
      const newSettings = { ...prev };
      const keys = path.split('.');
      let current = newSettings;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newSettings;
    });
  };
  
  if (!isAuthenticated || !tenantUser || !tenantId) {
    return <Navigate to="/tenant/login" replace />;
  }

  if (loading) {
    return (
      <AttendanceLayout title="Attendance System" description="Manage student attendance and biometric settings" tenantId={tenantId}>
        <div className="flex items-center justify-center p-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading attendance settings...</p>
          </div>
        </div>
      </AttendanceLayout>
    );
  }
  
  return (
    <AttendanceLayout title="Attendance System" description="Manage student attendance and biometric settings" tenantId={tenantId}>
      <div className="space-y-6">
        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {message}
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Attendance Policies */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Policies</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grace Time (minutes)
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={settings?.attendance_policies?.grace_time_minutes || 15}
                onChange={(e) => updateSetting('attendance_policies.grace_time_minutes', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cut-off Time (minutes)
              </label>
              <input
                type="number"
                min="0"
                max="120"
                value={settings?.attendance_policies?.cut_off_time_minutes || 30}
                onChange={(e) => updateSetting('attendance_policies.cut_off_time_minutes', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Late Rules
              </label>
              <select
                value={settings?.attendance_policies?.late_rules || 'standard'}
                onChange={(e) => updateSetting('attendance_policies.late_rules', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="standard">Standard</option>
                <option value="strict">Strict</option>
                <option value="flexible">Flexible</option>
              </select>
            </div>
          </div>
        </div>

        {/* Mode Selection */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Mode Selection</h3>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="manual-mode"
                checked={settings?.mode_selection?.manual || false}
                onChange={(e) => updateSetting('mode_selection.manual', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="manual-mode" className="ml-2 text-sm font-medium text-gray-700">
                Manual Attendance
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="qr-mode"
                checked={settings?.mode_selection?.qr || false}
                onChange={(e) => updateSetting('mode_selection.qr', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="qr-mode" className="ml-2 text-sm font-medium text-gray-700">
                QR Code Attendance
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="biometric-mode"
                checked={settings?.mode_selection?.biometric || false}
                onChange={(e) => updateSetting('mode_selection.biometric', e.target.checked)}
                disabled={!settings?.device_config?.enabled}
                className={`h-4 w-4 focus:ring-blue-500 border-gray-300 rounded ${
                  settings?.device_config?.enabled ? 'text-blue-600' : 'text-gray-400'
                }`}
              />
              <label htmlFor="biometric-mode" className={`ml-2 text-sm font-medium ${
                settings?.device_config?.enabled ? 'text-gray-700' : 'text-gray-400'
              }`}>
                Biometric Attendance
              </label>
              {!settings?.device_config?.enabled && (
                <div className="ml-2 relative group">
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    Biometric attendance is not available for your school. Contact your platform admin to enable it.
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Class Selection */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Class Selection</h3>
          {settings?.class_selection && settings.class_selection.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {settings.class_selection.map((cls: any) => (
                <div key={cls.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`class-${cls.id}`}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor={`class-${cls.id}`} className="ml-2 text-sm font-medium text-gray-700">
                    {cls.name} ({cls.grade})
                  </label>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-sm">
              No classes available. Please create classes first.
            </div>
          )}
        </div>

        {/* SMS Alert Configuration */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">SMS Alert Configuration</h3>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="sms-enabled"
                checked={settings?.sms_alerts?.enabled || false}
                onChange={(e) => updateSetting('sms_alerts.enabled', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="sms-enabled" className="ml-2 text-sm font-medium text-gray-700">
                Enable SMS Alerts
              </label>
            </div>
            {settings?.sms_alerts?.enabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alert Types
                  </label>
                  <div className="space-y-2">
                    {['late', 'absent', 'early_departure'].map((type) => (
                      <div key={type} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`alert-${type}`}
                          checked={settings?.sms_alerts?.alert_types?.includes(type) || false}
                          onChange={(e) => {
                            const currentTypes = settings?.sms_alerts?.alert_types || [];
                            if (e.target.checked) {
                              updateSetting('sms_alerts.alert_types', [...currentTypes, type]);
                            } else {
                              updateSetting('sms_alerts.alert_types', currentTypes.filter((t: string) => t !== type));
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`alert-${type}`} className="ml-2 text-sm font-medium text-gray-700 capitalize">
                          {type.replace('_', ' ')}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alert Time
                  </label>
                  <input
                    type="time"
                    value={settings?.sms_alerts?.time || '09:00'}
                    onChange={(e) => updateSetting('sms_alerts.time', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Device Configuration */}
        {settings?.device_config?.enabled && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Biometric Device Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Devices
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={settings?.device_config?.max_devices || 5}
                  onChange={(e) => updateSetting('device_config.max_devices', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Allowed Devices
                </label>
                <input
                  type="text"
                  placeholder="Device IDs separated by commas"
                  value={settings?.device_config?.allowed_devices?.join(', ') || ''}
                  onChange={(e) => updateSetting('device_config.allowed_devices', e.target.value.split(',').map(d => d.trim()))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </AttendanceLayout>
  );
};

// Domain and Branding Combined Page Component
const DomainAndBrandingPage: React.FC = () => {
  const { tenantId, tenantInfo } = useTenant();
  
  if (!tenantId) {
    return <Navigate to="/tenant/login" replace />;
  }

  return (
    <ProtectedTenantPage 
      title="Domain & Branding Setup" 
      description="Configure your school's domain and customize branding"
      tenantId={tenantId}
    >
      <div className="space-y-8">
        {/* Domain Setup Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Domain Configuration</h2>
          <CustomDomainSetup tenantId={tenantId} />
        </div>

        {/* Branding Customization Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Branding Customization</h2>
          <BrandingCustomization tenantId={tenantId} />
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-sm font-medium text-blue-900 mb-2">What's Next?</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Complete domain verification</strong> to make your portal accessible</li>
            <li>• <strong>Customize your branding</strong> to match your school's identity</li>
            <li>• <strong>Access your dashboard</strong> to set up other modules</li>
            <li>• <strong>Add teachers and students</strong> to get started with operations</li>
          </ul>
        </div>
      </div>
    </ProtectedTenantPage>
  );
};

// Super Admin Login Page Component
const SuperAdminLoginPage: React.FC = () => {
  const { login } = React.useContext(SuperAdminContext);
  const navigate = useNavigate();
  
  const handleLoginSuccess = (userData: any, token: string) => {
    login(userData, token);
    navigate('/super-admin/dashboard');
  };
  
  return <SuperAdminLogin onLoginSuccess={handleLoginSuccess} />;
};

// Tenant Dashboard Component
const TenantDashboard: React.FC = () => {
  const { tenantInfo, tenantUser, setIsAuthenticated, setTenantId, setTenantUser, setTenantInfo, setTenantToken, tenantId } = useTenant();
  const navigate = useNavigate();
  const [setupStatus, setSetupStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Fetch tenant setup status on component mount
  useEffect(() => {
    const fetchSetupStatus = async () => {
      if (!tenantId) return;
      
      try {
        const response = await fetch(`http://localhost:5000/api/tenants/${tenantId}/setup-status`);
        const data = await response.json();
        
        if (data.success) {
          setSetupStatus(data.data);
        }
      } catch (error) {
        console.error('Error fetching setup status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSetupStatus();
  }, [tenantId]);

  const handleLogout = () => {
    setIsAuthenticated(false);
    setTenantId(null);
    setTenantUser(null);
    setTenantInfo(null);
    setTenantToken(null);
    localStorage.removeItem('tenantToken');
    localStorage.removeItem('tenantId');
    localStorage.removeItem('tenantUser');
    localStorage.removeItem('tenantInfo');
    navigate('/tenant/login');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'configured': return 'text-green-600';
      case 'ready_to_setup': return 'text-blue-600';
      case 'locked': return 'text-gray-500';
      case 'setup_required': return 'text-yellow-600';
      default: return 'text-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'configured': return 'Configured';
      case 'ready_to_setup': return 'Ready to Setup';
      case 'locked': return 'Locked';
      case 'setup_required': return 'Setup Required';
      default: return 'Unknown';
    }
  };

  const getTooltipText = (module: string, prerequisites: any) => {
    if (module === 'attendance' && !prerequisites?.academic_year) {
      return 'Academic Year not configured';
    }
    if (module === 'attendance' && !prerequisites?.classes) {
      return 'No classes exist';
    }
    if (module === 'attendance' && !prerequisites?.students) {
      return 'No students exist';
    }
    return '';
  };
  
  if (!tenantInfo || !tenantUser) {
    return <Navigate to="/tenant/login" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">{tenantInfo.school_name} Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {tenantUser.name}</span>
              
              {/* Profile Dropdown */}
              <div className="relative">
                <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 flex items-center space-x-2">
                  <span>Profile</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                  <button
                    onClick={() => navigate('/change-password')}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Change Password
                  </button>
                </div>
              </div>
              
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Portal URL Display */}
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-blue-900">Your School Portal</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Access your school at: <span className="font-mono font-medium">{tenantInfo.domain}.{window.location.host}</span>
                </p>
              </div>
              <button
                onClick={() => window.open(`${window.location.protocol}//${tenantInfo.domain}.${window.location.host}`, '_blank')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
              >
                Open Portal
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Domain & Branding Module */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <span className="text-white font-bold">D</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Domain & Branding</dt>
                      <dd className={`text-lg font-medium ${getStatusColor(setupStatus?.modules?.domain_branding?.status || 'setup_required')}`}>
                        {getStatusText(setupStatus?.modules?.domain_branding?.status || 'setup_required')}
                      </dd>
                    </dl>
                  </div>
                  <div className="ml-5 flex-shrink-0">
                    <button
                      onClick={() => navigate('/domain-and-branding')}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      Configure
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance System Module */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                      <span className="text-white font-bold">A</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Attendance System</dt>
                      <dd className={`text-lg font-medium ${getStatusColor(setupStatus?.modules?.attendance?.status || 'locked')}`}>
                        {getStatusText(setupStatus?.modules?.attendance?.status || 'locked')}
                      </dd>
                      {setupStatus?.modules?.attendance?.status === 'locked' && (
                        <dd className="text-xs text-gray-500 mt-1">
                          Prerequisites not met
                        </dd>
                      )}
                    </dl>
                  </div>
                  <div className="ml-5 flex-shrink-0">
                    {setupStatus?.modules?.attendance?.available ? (
                      <button
                        onClick={() => navigate('/attendance')}
                        className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700"
                      >
                        Configure
                      </button>
                    ) : (
                      <div className="relative group">
                        <button
                          disabled
                          className="bg-gray-400 text-white px-3 py-1 rounded text-sm cursor-not-allowed"
                          title={getTooltipText('attendance', setupStatus?.modules?.attendance?.prerequisites)}
                        >
                          Configure
                        </button>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          {getTooltipText('attendance', setupStatus?.modules?.attendance?.prerequisites)}
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Student Management Module */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white font-bold">S</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Student Management</dt>
                      <dd className="text-lg font-medium text-green-600">Ready to Setup</dd>
                    </dl>
                  </div>
                  <div className="ml-5 flex-shrink-0">
                    <button
                      onClick={() => navigate('/students')}
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                    >
                      Manage Students
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Class Management Module */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
                      <span className="text-white font-bold">C</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Class Management</dt>
                      <dd className="text-lg font-medium text-indigo-600">Ready to Setup</dd>
                    </dl>
                  </div>
                  <div className="ml-5 flex-shrink-0">
                    <button
                      onClick={() => navigate('/classes')}
                      className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700"
                    >
                      Manage Classes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Prerequisites Status */}
          {setupStatus?.modules?.attendance?.status === 'locked' && (
            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-yellow-800 mb-2">Attendance System Prerequisites</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${setupStatus?.modules?.attendance?.prerequisites?.academic_year ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm text-yellow-700">Academic Year</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${setupStatus?.modules?.attendance?.prerequisites?.classes ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm text-yellow-700">Classes</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${setupStatus?.modules?.attendance?.prerequisites?.students ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm text-yellow-700">Students</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Protected Super Admin Dashboard Component
const SuperAdminDashboard: React.FC = () => {
  const { isAuthenticated, user, logout } = React.useContext(SuperAdminContext);
  const navigate = useNavigate();
  
  if (!isAuthenticated) {
    return <Navigate to="/super-admin/login" replace />;
  }
  
  const handleLogout = () => {
    logout();
    navigate('/');
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Super Admin Dashboard
              </h1>
              <p className="text-gray-600">
                Welcome back, {user?.full_name || user?.username}!
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
          
          <SuperAdminBiometric />
        </div>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantIsAuthenticated, setTenantIsAuthenticated] = useState(false);
  const [tenantUser, setTenantUser] = useState<any>(null);
  const [tenantInfo, setTenantInfo] = useState<any>(null);
  const [tenantToken, setTenantToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);

  // Check for existing authentication on app load
  useEffect(() => {
    const storedToken = localStorage.getItem('superAdminToken');
    const storedUser = localStorage.getItem('superAdminUser');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }

    // Check for existing tenant authentication
    const storedTenantToken = localStorage.getItem('tenantToken');
    const storedTenantId = localStorage.getItem('tenantId');
    const storedTenantUser = localStorage.getItem('tenantUser');
    const storedTenantInfo = localStorage.getItem('tenantInfo');
    
    if (storedTenantToken && storedTenantId && storedTenantUser && storedTenantInfo) {
      setTenantToken(storedTenantToken);
      setTenantId(storedTenantId);
      setTenantUser(JSON.parse(storedTenantUser));
      setTenantInfo(JSON.parse(storedTenantInfo));
      setTenantIsAuthenticated(true);
    }
  }, []);

  // On custom domains, pull in their CSS
  useEffect(() => {
    const host = window.location.hostname;
    if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      loadTenantBranding(host);
    }
  }, []);

  // Load branding for authenticated tenants (including localhost)
  useEffect(() => {
    if (tenantId && tenantIsAuthenticated) {
      loadTenantBrandingById(tenantId);
    }
  }, [tenantId, tenantIsAuthenticated]);

  const loadTenantBranding = async (domain: string) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/branding/css/${domain}`
      );
      applyBrandingCSS(response.data, `branding-${domain}`);
    } catch (error) {
      console.error('Error loading tenant branding by domain:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTenantBrandingById = async (tenantId: string) => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/branding/${tenantId}`
      );
      if (response.data.success) {
        const branding = response.data.data;
        const css = generateBrandingCSS(branding);
        applyBrandingCSS(css, `branding-${tenantId}`);
      }
    } catch (error) {
      console.error('Error loading tenant branding by ID:', error);
    }
  };

  const generateBrandingCSS = (branding: any) => {
    return `
      :root {
        --primary-color: ${branding.primary_color || '#2563eb'};
        --secondary-color: ${branding.secondary_color || '#1d4ed8'};
        --accent-color: ${branding.accent_color || '#16a34a'};
        --font-family: ${branding.font_family || 'Inter'};
      }
      
      body {
        font-family: var(--font-family), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      
      .bg-primary { background-color: var(--primary-color) !important; }
      .bg-secondary { background-color: var(--secondary-color) !important; }
      .bg-accent { background-color: var(--accent-color) !important; }
      
      .text-primary { color: var(--primary-color) !important; }
      .text-secondary { color: var(--secondary-color) !important; }
      .text-accent { color: var(--accent-color) !important; }
      
      .border-primary { border-color: var(--primary-color) !important; }
      .border-secondary { border-color: var(--secondary-color) !important; }
      .border-accent { border-color: var(--accent-color) !important; }
      
      .focus\\:ring-primary:focus { box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.5) !important; }
      .focus\\:ring-secondary:focus { box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.5) !important; }
      .focus\\:ring-accent:focus { box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.5) !important; }
      
      .hover\\:bg-primary:hover { background-color: var(--secondary-color) !important; }
      .hover\\:bg-secondary:hover { background-color: var(--primary-color) !important; }
      .hover\\:bg-accent:hover { background-color: var(--accent-color) !important; }
      
      ${branding.custom_css || ''}
    `;
  };

  const applyBrandingCSS = (css: string, id: string) => {
    // Remove existing branding stylesheet
    const existingStyle = document.getElementById(id);
    if (existingStyle) {
      existingStyle.remove();
    }
    
    // Create new stylesheet
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  };

  // Function to refresh branding (can be called from other components)
  const refreshBranding = () => {
    if (tenantId && tenantIsAuthenticated) {
      loadTenantBrandingById(tenantId);
    }
  };

  const handleSuperAdminLogin = (userData: any, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    setIsAuthenticated(true);
  };

  const handleSuperAdminLogout = () => {
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    localStorage.removeItem('superAdminToken');
    localStorage.removeItem('superAdminUser');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <TenantContext.Provider value={{ 
      tenantId, 
      setTenantId, 
      isAuthenticated: tenantIsAuthenticated, 
      setIsAuthenticated: setTenantIsAuthenticated,
      tenantUser,
      setTenantUser,
      tenantInfo,
      setTenantInfo,
      tenantToken,
      setTenantToken,
      refreshBranding
    }}>
      <SuperAdminContext.Provider value={{
        isAuthenticated,
        user,
        token,
        login: handleSuperAdminLogin,
        logout: handleSuperAdminLogout
      }}>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/tenant/login" element={<TenantLoginPage />} />
              <Route path="/dashboard" element={<TenantDashboard />} />
              <Route path="/change-password" element={<ChangePassword />} />
              <Route path="/domain-and-branding" element={<DomainAndBrandingPage />} />
              <Route path="/attendance" element={<AttendancePage />} />
              <Route path="/students" element={<StudentManagement />} />
        <Route path="/classes" element={<ClassManagement />} />
              <Route path="/super-admin/login" element={<SuperAdminLoginPage />} />
              <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />
              <Route path="/super-admin" element={<Navigate to="/super-admin/login" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            
            <ToastContainer position="top-right" autoClose={5000} />
          </div>
        </Router>
      </SuperAdminContext.Provider>
    </TenantContext.Provider>
  );
}

export default App;
