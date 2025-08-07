import React, { useState, useEffect } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import TenantOnboardingForm from './components/TenantOnboardingForm';
import CustomDomainSetup from './components/CustomDomainSetup';
import BrandingCustomization from './components/BrandingCustomization';
import axios from 'axios';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState<'onboarding' | 'domain' | 'branding'>('onboarding');
  const [tenantId, setTenantId] = useState<string>('');
  const [loading, setLoading] = useState(false);

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

  const handleOnboardingSuccess = (newTenantId: string) => {
    setTenantId(newTenantId);
    setCurrentView('domain');
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
    <div className="App">
      {/* Step 1: Onboarding */}
      {currentView === 'onboarding' && (
        <TenantOnboardingForm onSuccess={handleOnboardingSuccess} />
      )}

      {/* Steps 2+3: Domain & Branding share the same layout once we have a tenantId */}
      {tenantId && currentView !== 'onboarding' && (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
          <div className="max-w-4xl mx-auto px-4">
            <div className="bg-white rounded-lg shadow-xl p-8">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {currentView === 'domain' ? 'Custom Domain Setup' : 'Branding Customization'}
                </h1>
                <p className="text-gray-600">
                  {currentView === 'domain'
                    ? 'Configure your custom domain'
                    : 'Customize your tenant branding'}
                </p>
              </div>

              <div className="flex justify-center space-x-4 mb-8">
                <button
                  onClick={() => setCurrentView('domain')}
                  className={`px-4 py-2 rounded-md ${
                    currentView === 'domain'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Domain Setup
                </button>
                <button
                  onClick={() => setCurrentView('branding')}
                  className={`px-4 py-2 rounded-md ${
                    currentView === 'branding'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Branding
                </button>
              </div>

              {/* Render the right panel */}
              {currentView === 'domain' && <CustomDomainSetup tenantId={tenantId} />}
              {currentView === 'branding' && <BrandingCustomization tenantId={tenantId} />}
            </div>
          </div>
        </div>
      )}

      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
}

export default App;
