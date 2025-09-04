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
import AcademicYearManagement from './components/AcademicYearManagement/AcademicYearManagement';
import FeeManagement from './components/FeeManagement/FeeManagement';

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
  tenantRefreshToken: string | null;
  setTenantRefreshToken: (token: string | null) => void;
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
  const { setTenantId, setIsAuthenticated, setTenantUser, setTenantInfo, setTenantToken, setTenantRefreshToken } = useTenant();
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
        setTenantRefreshToken(data.data.refresh_token);
        setIsAuthenticated(true);
        
        // Store in localStorage for persistence
        localStorage.setItem('tenantToken', data.data.token);
        localStorage.setItem('tenantRefreshToken', data.data.refresh_token);
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
        // Error fetching attendance settings
        setError('Failed to load attendance settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [tenantId, tenantToken]);

  // Fetch attendance settings from backend
  const fetchAttendanceSettings = async () => {
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
      } else {
        setError(data.message || 'Failed to fetch attendance settings');
      }
    } catch (error) {
      setError('Failed to fetch attendance settings');
    }
  };

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
        setError('');
        // Refresh settings to show updated data
        fetchAttendanceSettings();
      } else {
        setError(data.message || 'Failed to save attendance settings');
        setMessage('');
      }
    } catch (error) {
      setError('Error saving attendance settings');
      setMessage('');
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
                    checked={cls.selected || false}
                    onChange={(e) => {
                      // Update the class selection state
                      const updatedClasses = settings.class_selection.map((c: any) => 
                        c.id === cls.id ? { ...c, selected: e.target.checked } : c
                      );
                      updateSetting('class_selection', updatedClasses);
                    }}
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
  const { tenantInfo, tenantUser, setIsAuthenticated, setTenantId, setTenantUser, setTenantInfo, setTenantToken, setTenantRefreshToken, tenantId } = useTenant();
  const navigate = useNavigate();
  const [setupStatus, setSetupStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [unassignedStudentsCount, setUnassignedStudentsCount] = useState<number>(0);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  
  // Fetch tenant setup status and academic year prerequisites on component mount
  useEffect(() => {
    const fetchSetupStatus = async () => {
      if (!tenantId) return;
      
      try {
        // Fetch setup status
        const setupResponse = await fetch(`http://localhost:5000/api/tenants/${tenantId}/setup-status`);
        const setupData = await setupResponse.json();
        
        if (setupData.success) {
          setSetupStatus(setupData.data);
        }
        
        // Fetch academic year prerequisites
        const ayResponse = await fetch(`http://localhost:5000/api/academic-years/prerequisites/attendance`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('tenantToken')}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (ayResponse.ok) {
          const ayData = await ayResponse.json();
          if (ayData.success) {
            // Update setup status with academic year prerequisites
            setSetupStatus((prev: any) => ({
              ...prev,
              modules: {
                ...prev?.modules,
                attendance: {
                  ...prev?.modules?.attendance,
                  prerequisites: {
                    academic_year: ayData.data.hasActiveAY,
                    classes: ayData.data.hasClasses,
                    students: ayData.data.hasStudents
                  },
                  available: ayData.data.hasActiveAY && ayData.data.hasClasses && ayData.data.hasStudents
                }
              }
            }));
          }
        }
      } catch (error) {
        // Error fetching setup status
      } finally {
        setLoading(false);
      }
    };

    const fetchUnassignedStudentsCount = async () => {
      if (!tenantId) return;
      
      // Prevent multiple calls in quick succession
      if ((window as any).unassignedCountFetching) {
        return;
      }
      
      (window as any).unassignedCountFetching = true;
      
      try {
        const response = await fetch(`http://localhost:5000/api/students?status=all&class_id=unassigned&limit=1`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('tenantToken')}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            const count = data.data.pagination.total_students;
            setUnassignedStudentsCount(count);
          }
        }
      } catch (error) {
        // Error fetching unassigned students count
      } finally {
        // Clear the flag after a delay to prevent rapid successive calls
        setTimeout(() => {
          (window as any).unassignedCountFetching = false;
        }, 1000);
      }
    };

    fetchSetupStatus();
    fetchUnassignedStudentsCount();
  }, [tenantId]);

  const handleLogout = () => {
    setIsAuthenticated(false);
    setTenantId(null);
    setTenantUser(null);
    setTenantInfo(null);
    setTenantToken(null);
    setTenantRefreshToken(null);
    localStorage.removeItem('tenantToken');
    localStorage.removeItem('tenantRefreshToken');
    localStorage.removeItem('tenantId');
    localStorage.removeItem('tenantUser');
    localStorage.removeItem('tenantInfo');
    navigate('/tenant/login');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'configured':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            ✅ Configured
          </span>
        );
      case 'ready_to_setup':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            🚀 Ready to Setup
          </span>
        );
      case 'locked':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            🔒 Locked
          </span>
        );
      case 'setup_required':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            ⚠️ Setup Required
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            ❓ Unknown
          </span>
        );
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
      {/* Enhanced Top Navigation Bar */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">{tenantInfo.school_name}</h1>
                  <p className="text-sm text-gray-500">School Management Dashboard</p>
                </div>
              </div>
            </div>
            
            {/* Breadcrumb Navigation */}
            <div className="hidden md:flex items-center">
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="flex items-center space-x-2">
                  <li>
                    <div className="flex items-center">
                      <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                      </svg>
                      <span className="ml-2 text-sm text-gray-500">Dashboard</span>
                    </div>
                  </li>
                </ol>
              </nav>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">Welcome, {tenantUser.name}</span>
              
              {/* Enhanced Profile Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 flex items-center space-x-2 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Profile</span>
                  <svg className={`w-4 h-4 transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showProfileDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200">
                    <button
                      onClick={() => {
                        navigate('/change-password');
                        setShowProfileDropdown(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                        <span>Change Password</span>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        handleLogout();
                        setShowProfileDropdown(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Logout</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>
      
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Portal URL Display */}
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-blue-900">Your School Portal</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Access your school at: <span className="font-mono font-medium">{tenantInfo.domain}.{window.location.host}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => window.open(`${window.location.protocol}//${tenantInfo.domain}.${window.location.host}`, '_blank')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                <span>Open Portal</span>
              </button>
            </div>
          </div>



          {/* Enhanced Module Grid with Better Visual Hierarchy */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Domain & Branding Module */}
            <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Domain & Branding</h3>
                    <div className="mb-3">
                      {getStatusBadge(setupStatus?.modules?.domain_branding?.status || 'setup_required')}
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Configure your school's domain and customize branding to match your identity.
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <button
                      onClick={() => navigate('/domain-and-branding')}
                      className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      Configure
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance System Module */}
            <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Attendance System</h3>
                    <div className="mb-3">
                      {getStatusBadge(setupStatus?.modules?.attendance?.status || 'locked')}
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Manage student attendance with manual, QR code, or biometric options.
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    {setupStatus?.modules?.attendance?.available ? (
                      <button
                        onClick={() => navigate('/attendance')}
                        className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-md hover:shadow-lg"
                      >
                        Configure
                      </button>
                    ) : (
                      <div className="relative group">
                        <button
                          disabled
                          className="bg-gray-400 text-white px-4 py-2 rounded-lg cursor-not-allowed shadow-md"
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
            <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Student Management</h3>
                    <div className="mb-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        🚀 Ready to Setup
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Add, edit, and manage student profiles with bulk import capabilities.
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <button
                      onClick={() => navigate('/students')}
                      className="bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      Manage Students
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Class Management Module */}
            <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Class Management</h3>
                    <div className="mb-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        🚀 Ready to Setup
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Create and manage classes, sections, and grade levels for your school.
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <button
                      onClick={() => navigate('/classes')}
                      className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-4 py-2 rounded-lg hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      Manage Classes
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Academic Year Management Module */}
            <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Academic Year</h3>
                    <div className="mb-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        🚀 Ready to Setup
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Configure academic years to enable attendance system and organize school operations.
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <button
                      onClick={() => navigate('/academic-years')}
                      className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-4 py-2 rounded-lg hover:from-amber-700 hover:to-amber-800 transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      Manage AY
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Fee Management Module */}
            <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Fee Management</h3>
                    <div className="mb-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        🚀 Ready to Setup
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Manage fee structures, generate vouchers, process payments, and send reminders.
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <button
                      onClick={() => navigate('/fees')}
                      className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-4 py-2 rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      Manage Fees
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Prerequisites Status */}
          {setupStatus?.modules?.attendance?.status === 'locked' && (
            <div className="mt-8 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-yellow-800">Attendance System Prerequisites</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-yellow-200">
                  <div className={`w-4 h-4 rounded-full ${setupStatus?.modules?.attendance?.prerequisites?.academic_year ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm font-medium text-gray-700">Academic Year</span>
                  {setupStatus?.modules?.attendance?.prerequisites?.academic_year ? (
                    <span className="text-green-600">✅</span>
                  ) : (
                    <span className="text-red-600">❌</span>
                  )}
                </div>
                <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-yellow-200">
                  <div className={`w-4 h-4 rounded-full ${setupStatus?.modules?.attendance?.prerequisites?.classes ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm font-medium text-gray-700">Classes</span>
                  {setupStatus?.modules?.attendance?.prerequisites?.classes ? (
                    <span className="text-green-600">✅</span>
                  ) : (
                    <span className="text-red-600">❌</span>
                  )}
                </div>
                <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-yellow-200">
                  <div className={`w-4 h-4 rounded-full ${setupStatus?.modules?.attendance?.prerequisites?.students ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm font-medium text-gray-700">Students</span>
                  {setupStatus?.modules?.attendance?.prerequisites?.students ? (
                    <span className="text-green-600">✅</span>
                  ) : (
                    <span className="text-red-600">❌</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Click outside to close profile dropdown */}
      {showProfileDropdown && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setShowProfileDropdown(false)}
        />
      )}
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
  const [tenantRefreshToken, setTenantRefreshToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
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
    const storedTenantRefreshToken = localStorage.getItem('tenantRefreshToken');
    const storedTenantId = localStorage.getItem('tenantId');
    const storedTenantUser = localStorage.getItem('tenantUser');
    const storedTenantInfo = localStorage.getItem('tenantInfo');
    
    if (storedTenantToken && storedTenantRefreshToken && storedTenantId && storedTenantUser && storedTenantInfo) {
      setTenantToken(storedTenantToken);
      setTenantRefreshToken(storedTenantRefreshToken);
      setTenantId(storedTenantId);
      setTenantUser(JSON.parse(storedTenantUser));
      setTenantInfo(JSON.parse(storedTenantInfo));
      setTenantIsAuthenticated(true);
      
      // Try to refresh the token automatically on app load
      setTimeout(async () => {
        const refreshed = await refreshTenantToken();
        if (!refreshed) {
          // If refresh failed, the user will be logged out automatically
          console.log('Token refresh failed, user will be logged out');
        }
      }, 1000); // Wait 1 second after app load
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
      // Error loading tenant branding by domain
    } finally {
      setLoading(false);
    }
  };

  const loadTenantBrandingById = async (tenantId: string) => {
    try {
      // Get the tenant token from localStorage
      let token = localStorage.getItem('tenantToken');
      
      if (!token) {
        // No token available, skip branding load
        return;
      }
      
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/branding/${tenantId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.data.success) {
          const branding = response.data.data;
          const css = generateBrandingCSS(branding);
          applyBrandingCSS(css, `branding-${tenantId}`);
        }
      } catch (axiosError: any) {
        // Check if it's a 403 error (token expired)
        if (axiosError.response && axiosError.response.status === 403) {
          console.log('Token expired, attempting to refresh...');
          const refreshed = await refreshTenantToken();
          if (refreshed) {
            // Get the new token and retry
            token = localStorage.getItem('tenantToken');
            if (token) {
              try {
                const retryResponse = await axios.get(
                  `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/branding/${tenantId}`,
                  {
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json'
                    }
                  }
                );
                if (retryResponse.data.success) {
                  const branding = retryResponse.data.data;
                  const css = generateBrandingCSS(branding);
                  applyBrandingCSS(css, `branding-${tenantId}`);
                }
              } catch (retryError) {
                console.log('Retry failed after token refresh');
              }
            }
          }
        } else {
          console.log('Branding API error:', axiosError.message);
        }
      }
    } catch (error) {
      console.log('Error loading tenant branding by ID:', error);
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

  // Function to refresh JWT token
  const refreshTenantToken = async (): Promise<boolean> => {
    const refreshToken = localStorage.getItem('tenantRefreshToken');
    if (!refreshToken) {
      return false;
    }

    try {
      const response = await fetch('http://localhost:5000/api/tenant-auth/refresh-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      const data = await response.json();

      if (data.success && data.data.token) {
        // Update tokens
        setTenantToken(data.data.token);
        setTenantRefreshToken(data.data.refresh_token);
        
        // Update localStorage
        localStorage.setItem('tenantToken', data.data.token);
        localStorage.setItem('tenantRefreshToken', data.data.refresh_token);
        
        return true;
      } else {
        // Refresh failed, logout user
        setTenantId(null);
        setTenantUser(null);
        setTenantInfo(null);
        setTenantToken(null);
        setTenantRefreshToken(null);
        setTenantIsAuthenticated(false);
        
        // Clear localStorage
        localStorage.removeItem('tenantToken');
        localStorage.removeItem('tenantRefreshToken');
        localStorage.removeItem('tenantId');
        localStorage.removeItem('tenantUser');
        localStorage.removeItem('tenantInfo');
        
        return false;
      }
    } catch (error) {
      // Network error, logout user
      setTenantId(null);
      setTenantUser(null);
      setTenantInfo(null);
      setTenantToken(null);
      setTenantRefreshToken(null);
      setTenantIsAuthenticated(false);
      
      // Clear localStorage
      localStorage.removeItem('tenantToken');
      localStorage.removeItem('tenantRefreshToken');
      localStorage.removeItem('tenantId');
      localStorage.removeItem('tenantUser');
      localStorage.removeItem('tenantInfo');
      
      return false;
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
      tenantRefreshToken,
      setTenantRefreshToken,
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
              <Route path="/academic-years" element={<AcademicYearManagement />} />
              <Route path="/fees" element={<FeeManagement />} />
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
