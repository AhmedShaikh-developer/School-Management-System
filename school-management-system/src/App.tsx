import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import TenantOnboardingForm from './components/TenantOnboardingForm';
import CustomDomainSetup from './components/CustomDomainSetup';
import BrandingCustomization from './components/BrandingCustomization';
import AttendanceAdmin from './components/AttendanceAdmin';
import SuperAdminBiometric from './components/SuperAdminBiometric';
import SuperAdminLogin from './components/SuperAdminLogin';
import axios from 'axios';
import './App.css';

// Context for managing tenant state across routes
interface TenantContextType {
  tenantId: string | null;
  setTenantId: (id: string | null) => void;
}

// Context for managing super admin authentication
interface SuperAdminContextType {
  isAuthenticated: boolean;
  user: any | null;
  token: string | null;
  login: (userData: any, token: string) => void;
  logout: () => void;
}

const TenantContext = React.createContext<TenantContextType>({
  tenantId: null,
  setTenantId: () => {},
});

const SuperAdminContext = React.createContext<SuperAdminContextType>({
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
            className="w-full md:w-auto px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Super Admin Portal
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
        onClick={() => navigate(`/domain?tenantId=${tenantId}`)}
        className={`px-4 py-2 rounded-md transition-colors ${
          isActive('/domain')
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        Domain Setup
      </button>
      <button
        onClick={() => navigate(`/branding?tenantId=${tenantId}`)}
        className={`px-4 py-2 rounded-md transition-colors ${
          isActive('/branding')
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        Branding
      </button>
      <button
        onClick={() => navigate(`/attendance?tenantId=${tenantId}`)}
        className={`px-4 py-2 rounded-md transition-colors ${
          isActive('/attendance')
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        Attendance
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

// Onboarding Page Component
const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { setTenantId } = React.useContext(TenantContext);
  
  const handleOnboardingSuccess = (newTenantId: string) => {
    setTenantId(newTenantId);
    navigate(`/domain?tenantId=${newTenantId}`);
  };
  
  return <TenantOnboardingForm onSuccess={handleOnboardingSuccess} />;
};

// Domain Setup Page Component
const DomainPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tenantId = searchParams.get('tenantId');
  
  if (!tenantId) {
    return <Navigate to="/onboarding" replace />;
  }
  
  return (
    <TenantLayout 
      title="Custom Domain Setup" 
      description="Configure your custom domain"
      tenantId={tenantId}
    >
      <CustomDomainSetup tenantId={tenantId} />
    </TenantLayout>
  );
};

// Branding Page Component
const BrandingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tenantId = searchParams.get('tenantId');
  
  if (!tenantId) {
    return <Navigate to="/onboarding" replace />;
  }
  
  return (
    <TenantLayout 
      title="Branding Customization" 
      description="Customize your tenant branding"
      tenantId={tenantId}
    >
      <BrandingCustomization tenantId={tenantId} />
    </TenantLayout>
  );
};

// Attendance Page Component
const AttendancePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tenantId = searchParams.get('tenantId');
  
  if (!tenantId) {
    return <Navigate to="/onboarding" replace />;
  }
  
  return (
    <TenantLayout 
      title="Attendance Management" 
      description="Manage attendance settings and configurations"
      tenantId={tenantId}
    >
      <AttendanceAdmin tenantId={tenantId} />
    </TenantLayout>
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
  }, []);

  // On custom domains, pull in their CSS
  useEffect(() => {
    const host = window.location.hostname;
    if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      loadTenantBranding(host);
    }
  }, []);

  const loadTenantBranding = async (domain: string) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/branding/css/${domain}`
      );
      const style = document.createElement('style');
      style.textContent = response.data;
      document.head.appendChild(style);
    } catch (error) {
      console.error('Error loading tenant branding:', error);
    } finally {
      setLoading(false);
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
    <TenantContext.Provider value={{ tenantId, setTenantId }}>
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
              <Route path="/domain" element={<DomainPage />} />
              <Route path="/branding" element={<BrandingPage />} />
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
