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
  const { tenantId, isAuthenticated, tenantUser } = useTenant();
  
  if (!isAuthenticated || !tenantUser || !tenantId) {
    return <Navigate to="/tenant/login" replace />;
  }
  
  return (
    <AttendanceLayout title="Attendance System" description="Manage student attendance and biometric settings" tenantId={tenantId}>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Attendance System</h2>
        <p className="text-gray-600">Attendance system configuration will be available here.</p>
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
  const { tenantInfo, tenantUser, setIsAuthenticated, setTenantId, setTenantUser, setTenantInfo, setTenantToken } = useTenant();
  const navigate = useNavigate();
  
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
  
  if (!tenantInfo || !tenantUser) {
    return <Navigate to="/tenant/login" replace />;
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
              <button
                onClick={() => navigate('/change-password')}
                className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700"
              >
                Change Password
              </button>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                      <dd className="text-lg font-medium text-gray-900">Setup Required</dd>
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
            
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white font-bold">B</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Branding</dt>
                      <dd className="text-lg font-medium text-gray-900">Configured</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

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
                      <dd className="text-lg font-medium text-gray-900">Ready to Setup</dd>
                    </dl>
                  </div>
                  <div className="ml-5 flex-shrink-0">
                    <button
                      onClick={() => navigate('/attendance')}
                      className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700"
                    >
                      Configure
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
