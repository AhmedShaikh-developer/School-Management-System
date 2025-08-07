import React, { useState, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import { toast } from 'react-toastify';

interface BrandingFormData {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_family: string;
  custom_css: string;
}

interface BrandingData {
  tenantId: string;
  logo_filename: string | null;
  logo_mimetype: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_family: string;
  custom_css: string;
}

interface ColorPreset {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
}

interface FontOption {
  name: string;
  value: string;
}

const validationSchema = Yup.object({
  primary_color: Yup.string()
    .matches(/^#[0-9A-F]{6}$/i, 'Please enter a valid hex color')
    .required('Primary color is required'),
  secondary_color: Yup.string()
    .matches(/^#[0-9A-F]{6}$/i, 'Please enter a valid hex color')
    .required('Secondary color is required'),
  accent_color: Yup.string()
    .matches(/^#[0-9A-F]{6}$/i, 'Please enter a valid hex color')
    .required('Accent color is required'),
  font_family: Yup.string().required('Font family is required'),
  custom_css: Yup.string()
});

const BrandingCustomization: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const [branding, setBranding] = useState<BrandingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [colorPresets, setColorPresets] = useState<ColorPreset[]>([]);
  const [fonts, setFonts] = useState<FontOption[]>([]);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const initialValues: BrandingFormData = {
    primary_color: '#2563eb',
    secondary_color: '#1d4ed8',
    accent_color: '#16a34a',
    font_family: 'Inter',
    custom_css: ''
  };

  // Load branding data
  useEffect(() => {
    loadBranding();
    loadColorPresets();
    loadFonts();
  }, [tenantId]);

  const loadBranding = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/branding/${tenantId}`
      );
      if (response.data.success) {
        setBranding(response.data.data);
      }
    } catch (error) {
      console.error('Error loading branding:', error);
    }
  };

  const loadColorPresets = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/branding/colors/presets`
      );
      if (response.data.success) {
        setColorPresets(response.data.data);
      }
    } catch (error) {
      console.error('Error loading color presets:', error);
    }
  };

  const loadFonts = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/branding/fonts/available`
      );
      if (response.data.success) {
        setFonts(response.data.data);
      }
    } catch (error) {
      console.error('Error loading fonts:', error);
    }
  };

  const handleSubmit = async (values: BrandingFormData, { setSubmitting }: any) => {
    setLoading(true);
    try {
      const response = await axios.put(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/branding/${tenantId}`,
        values
      );

      if (response.data.success) {
        toast.success('Branding updated successfully!');
        loadBranding();
      } else {
        toast.error(response.data.message || 'Failed to update branding');
      }
    } catch (error: any) {
      console.error('Error updating branding:', error);
      toast.error(error.response?.data?.message || 'Failed to update branding');
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    const formData = new FormData();
    formData.append('logo', file);

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/branding/${tenantId}/logo`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        toast.success('Logo uploaded successfully!');
        loadBranding();
      } else {
        toast.error(response.data.message || 'Failed to upload logo');
      }
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast.error(error.response?.data?.message || 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleDeleteLogo = async () => {
    if (!window.confirm('Are you sure you want to delete the logo?')) {
      return;
    }

    try {
      const response = await axios.delete(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/branding/${tenantId}/logo`
      );

      if (response.data.success) {
        toast.success('Logo deleted successfully!');
        loadBranding();
      } else {
        toast.error(response.data.message || 'Failed to delete logo');
      }
    } catch (error: any) {
      console.error('Error deleting logo:', error);
      toast.error(error.response?.data?.message || 'Failed to delete logo');
    }
  };

  const applyColorPreset = (preset: ColorPreset) => {
    const form = document.querySelector('form');
    if (form) {
      const primaryInput = form.querySelector('[name="primary_color"]') as HTMLInputElement;
      const secondaryInput = form.querySelector('[name="secondary_color"]') as HTMLInputElement;
      const accentInput = form.querySelector('[name="accent_color"]') as HTMLInputElement;

      if (primaryInput) primaryInput.value = preset.primary;
      if (secondaryInput) secondaryInput.value = preset.secondary;
      if (accentInput) accentInput.value = preset.accent;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Logo</h2>
        
        <div className="space-y-4">
          {branding?.logo_filename && (
            <div className="flex items-center space-x-4">
              <img 
                src={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/branding/${tenantId}/logo`}
                alt="School Logo"
                className="w-20 h-20 object-contain border border-gray-200 rounded"
              />
              <button
                onClick={handleDeleteLogo}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Delete Logo
              </button>
            </div>
          )}
          
          <div>
            <label htmlFor="logo" className="block text-sm font-medium text-gray-700 mb-2">
              Upload Logo
            </label>
            <input
              type="file"
              id="logo"
              accept="image/*"
              onChange={handleLogoUpload}
              disabled={uploadingLogo}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {uploadingLogo && <p className="text-sm text-blue-600 mt-1">Uploading...</p>}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Color Scheme</h2>
        
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Color Presets</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {colorPresets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyColorPreset(preset)}
                className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
              >
                <div className="flex space-x-2 mb-2">
                  <div 
                    className="w-6 h-6 rounded border border-gray-300"
                    style={{ backgroundColor: preset.primary }}
                  ></div>
                  <div 
                    className="w-6 h-6 rounded border border-gray-300"
                    style={{ backgroundColor: preset.secondary }}
                  ></div>
                  <div 
                    className="w-6 h-6 rounded border border-gray-300"
                    style={{ backgroundColor: preset.accent }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        <Formik
          initialValues={branding ? {
            primary_color: branding.primary_color || initialValues.primary_color,
            secondary_color: branding.secondary_color || initialValues.secondary_color,
            accent_color: branding.accent_color || initialValues.accent_color,
            font_family: branding.font_family || initialValues.font_family,
            custom_css: branding.custom_css || initialValues.custom_css
          } : initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ isSubmitting }) => (
            <Form className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="primary_color" className="block text-sm font-medium text-gray-700 mb-2">
                    Primary Color
                  </label>
                  <Field
                    type="text"
                    id="primary_color"
                    name="primary_color"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="#2563eb"
                  />
                  <ErrorMessage name="primary_color" component="div" className="text-red-500 text-sm mt-1" />
                </div>

                <div>
                  <label htmlFor="secondary_color" className="block text-sm font-medium text-gray-700 mb-2">
                    Secondary Color
                  </label>
                  <Field
                    type="text"
                    id="secondary_color"
                    name="secondary_color"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="#1d4ed8"
                  />
                  <ErrorMessage name="secondary_color" component="div" className="text-red-500 text-sm mt-1" />
                </div>

                <div>
                  <label htmlFor="accent_color" className="block text-sm font-medium text-gray-700 mb-2">
                    Accent Color
                  </label>
                  <Field
                    type="text"
                    id="accent_color"
                    name="accent_color"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="#16a34a"
                  />
                  <ErrorMessage name="accent_color" component="div" className="text-red-500 text-sm mt-1" />
                </div>
              </div>

              <div>
                <label htmlFor="font_family" className="block text-sm font-medium text-gray-700 mb-2">
                  Font Family
                </label>
                <Field
                  as="select"
                  id="font_family"
                  name="font_family"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {fonts.map((font) => (
                    <option key={font.value} value={font.value}>
                      {font.name}
                    </option>
                  ))}
                </Field>
                <ErrorMessage name="font_family" component="div" className="text-red-500 text-sm mt-1" />
              </div>

              <div>
                <label htmlFor="custom_css" className="block text-sm font-medium text-gray-700 mb-2">
                  Custom CSS (Optional)
                </label>
                <Field
                  as="textarea"
                  id="custom_css"
                  name="custom_css"
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="/* Add your custom CSS here */"
                />
                <ErrorMessage name="custom_css" component="div" className="text-red-500 text-sm mt-1" />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Updating Branding...' : 'Update Branding'}
              </button>
            </Form>
          )}
        </Formik>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Branding Features:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Upload your school logo</li>
          <li>• Customize colors to match your brand</li>
          <li>• Choose from various font families</li>
          <li>• Add custom CSS for advanced styling</li>
          <li>• Changes apply immediately to your school interface</li>
        </ul>
      </div>
    </div>
  );
};

export default BrandingCustomization; 