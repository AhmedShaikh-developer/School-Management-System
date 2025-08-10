import React from 'react';
import { useNavigate } from 'react-router-dom';

interface OnboardingSuccessProps {
  tenantId: string;
  domain: string;
  schoolName: string;
  adminEmail: string;
  tempPassword: string;
}

const OnboardingSuccess: React.FC<OnboardingSuccessProps> = ({
  tenantId,
  domain,
  schoolName,
  adminEmail,
  tempPassword
}) => {
  const navigate = useNavigate();

  const portalUrl = `${window.location.protocol}//${domain}.${window.location.host}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center">
          <h1 className="mt-6 text-3xl font-extrabold text-gray-900">
            🎉 Onboarding Complete!
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Your school <strong>{schoolName}</strong> has been successfully set up
          </p>
        </div>

        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          {/* Portal URL Section */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-8 text-white">
            <div className="text-center">
              <h2 className="text-xl font-semibold">Your Portal URL</h2>
              <p className="text-blue-100 text-sm">Bookmark this for future access</p>
            </div>
            <div className="mt-4 text-center">
              <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
                <p className="text-sm text-blue-100 mb-2">Portal URL:</p>
                <p className="text-2xl font-mono font-bold break-all">
                  {portalUrl}
                </p>
              </div>
            </div>
          </div>

          {/* Login Credentials */}
          <div className="px-6 py-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Login Credentials
            </h3>
            
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <p className="text-lg font-mono text-gray-900">{adminEmail}</p>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-yellow-800 mb-1">
                  Temporary Password
                </label>
                <p className="text-lg font-mono text-yellow-900">{tempPassword}</p>
                <p className="text-sm text-yellow-700 mt-1">
                  ⚠️ You'll be prompted to change this password on first login
                </p>
              </div>
            </div>

            {/* Next Steps */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">What's Next?</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Login to your portal</strong> using the credentials above</li>
                <li>• <strong>Change your password</strong> for security</li>
                <li>• <strong>Customize your domain</strong> and branding</li>
                <li>• <strong>Set up attendance system</strong> from your dashboard</li>
                <li>• <strong>Add teachers and students</strong> to get started</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate('/tenant/login')}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Go to Login
              </button>
              <button
                onClick={() => window.open(portalUrl, '_blank')}
                className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Open Portal
              </button>
            </div>

            <div className="mt-4 text-center">
              <button
                onClick={() => navigate('/')}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                ← Back to Home
              </button>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div>
            <h3 className="text-sm font-medium text-yellow-800">Security Notice</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                Your temporary password has been sent to your email. Please change it immediately after your first login for security.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingSuccess;
