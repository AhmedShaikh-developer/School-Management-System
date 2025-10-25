import React, { useState } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import { toast } from 'react-toastify';

interface LoginFormData {
  username: string;
  password: string;
  rememberMe?: boolean;
}

interface SuperAdminLoginProps {
  onLoginSuccess: (userData: any, token: string) => void;
}

const validationSchema = Yup.object({
  username: Yup.string()
    .required('Username or email is required'),
  password: Yup.string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters')
});

const SuperAdminLogin: React.FC<SuperAdminLoginProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (values: LoginFormData, { setSubmitting, resetForm, setFieldError }: any) => {
    setIsLoading(true);
    
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/auth/login`,
        {
          username: values.username,
          password: values.password
        },
        {
          timeout: 30000, // 30 seconds timeout
        }
      );

      if (response.data.success) {
        const { user, token } = response.data.data;
        
        // Store token in localStorage
        localStorage.setItem('superAdminToken', token);
        localStorage.setItem('superAdminUser', JSON.stringify(user));
        
        // Handle remember me
        if (values.rememberMe) {
          localStorage.setItem('superAdminRememberMe', 'true');
        } else {
          localStorage.removeItem('superAdminRememberMe');
        }
        
        toast.success('Login successful! Welcome back.');
        
        // Call the success callback
        onLoginSuccess(user, token);
        
        // Reset form
        resetForm();
      } else {
        // Set specific field error
        setFieldError('password', response.data.message || 'Invalid credentials');
        toast.error(response.data.message || 'Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.response?.status === 401) {
        setFieldError('password', 'Invalid username or password');
        toast.error('Invalid username or password');
      } else if (error.response?.data?.message) {
        setFieldError('password', error.response.data.message);
        toast.error(error.response.data.message);
      } else if (error.code === 'ECONNABORTED') {
        toast.error('Request timed out. Please try again.');
      } else {
        setFieldError('password', 'An error occurred. Please try again.');
        toast.error('An error occurred during login. Please try again.');
      }
    } finally {
      setIsLoading(false);
      setSubmitting(false);
    }
  };

  return (
    <div className="super-admin-login-container">
      <div className="super-admin-login-card">
        <div className="super-admin-login-header">
          <div className="super-admin-login-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="super-admin-login-title">
            Super Admin Login
          </h1>
          <p className="super-admin-login-subtitle">
            Access the platform administration panel
          </p>
        </div>
        
        <Formik
          initialValues={{
            username: '',
            password: '',
            rememberMe: false
          }}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting, isValid, dirty }) => (
            <Form className="super-admin-login-form">
              <div className="floating-label-group">
                <Field
                  type="text"
                  id="username"
                  name="username"
                  className="floating-input"
                  placeholder=" "
                />
                <label htmlFor="username" className="floating-label">
                  Username or Email <span>*</span>
                </label>
                <ErrorMessage name="username" component="div" className="error-message" />
              </div>

              <div className="floating-label-group">
                <Field
                  type="password"
                  id="password"
                  name="password"
                  className="floating-input"
                  placeholder=" "
                />
                <label htmlFor="password" className="floating-label">
                  Password <span>*</span>
                </label>
                <ErrorMessage name="password" component="div" className="error-message" />
              </div>

              <div className="super-admin-login-options">
                <label className="super-admin-login-checkbox">
                  <Field
                    type="checkbox"
                    name="rememberMe"
                    className="super-admin-checkbox-input"
                  />
                  <span className="super-admin-checkbox-label">Remember me</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !isValid || !dirty || isLoading}
                className="super-admin-login-button"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Signing in...</span>
                  </div>
                                 ) : (
                   <>
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                     </svg>
                     Sign In
                   </>
                 )}
              </button>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default SuperAdminLogin;
