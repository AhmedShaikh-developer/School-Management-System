import React, { useState, useRef } from 'react';
import { XMarkIcon, DocumentArrowUpIcon, ExclamationTriangleIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { useTenant } from '../../App';
import { toast } from 'react-toastify';
import { BulkImportModalProps, ImportError } from '../../types/student';

const BulkImportModal: React.FC<BulkImportModalProps> = ({ onClose, onSuccess }) => {
  const { tenantToken } = useTenant();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importResults, setImportResults] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
        toast.error('Please select a valid CSV file');
        return;
      }
      
      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('csv_file', file);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch('http://localhost:5000/api/students/bulk-import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tenantToken}`
        },
        body: formData
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.ok) {
        const result = await response.json();
        setImportResults(result.data);
        setShowResults(true);
        
        // Call onSuccess immediately to refresh the student list
        onSuccess(result.data);
        
        // Auto-close after 5 seconds if completely successful
        setTimeout(() => {
          if (result.data.failed_imports === 0) {
            setShowResults(false);
            setFile(null);
            setImportResults(null);
          }
        }, 5000);
        
        toast.success(`Bulk import completed! ${result.data.successful_imports} students imported successfully.`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to process bulk import');
      }
    } catch (error) {
      console.error('Error during bulk import:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleClose = () => {
    if (uploading) {
      if (window.confirm('Upload is in progress. Are you sure you want to cancel?')) {
        setUploading(false);
        setUploadProgress(0);
        onClose();
      }
    } else {
      onClose();
    }
  };

  const downloadTemplate = () => {
    const csvContent = `first_name,last_name,email,phone,date_of_birth,gender,address,class_id,enrollment_date,emergency_contact_name,emergency_contact_phone,emergency_contact_relationship,medical_conditions,allergies,blood_group,nationality,religion,mother_tongue,previous_school
John,Doe,john.doe@example.com,+1234567890,2005-01-15,male,123 Main St,,2024-09-01,Jane Doe,+1234567891,Mother,None,None,A+,American,Christian,English,Previous School Name
Jane,Smith,jane.smith@example.com,+1234567892,2005-03-20,female,456 Oak Ave,,2024-09-01,John Smith,+1234567893,Father,None,None,B+,American,Christian,English,
Mike,Johnson,mike.johnson@example.com,+1234567894,2005-06-10,male,789 Pine Rd,,2024-09-01,Mary Johnson,+1234567895,Mother,None,None,O+,American,Christian,English,`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  if (showResults) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">Import Results</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-gray-900">{importResults.total_rows}</div>
                <div className="text-sm text-gray-600">Total Rows</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{importResults.successful_imports}</div>
                <div className="text-sm text-gray-600">Successful</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{importResults.failed_imports}</div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round((importResults.successful_imports / importResults.total_rows) * 100)}%
                </div>
                <div className="text-sm text-gray-600">Success Rate</div>
              </div>
            </div>
          </div>

          {/* Errors */}
          {importResults.errors && importResults.errors.length > 0 && (
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-900 mb-3">Import Errors</h4>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                {importResults.errors.map((error: ImportError, index: number) => (
                  <div key={index} className="flex items-start space-x-2 mb-2">
                    <ExclamationTriangleIcon className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-red-800">Row {error.row}:</span>
                      <span className="text-red-700 ml-1">{error.error}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowResults(false);
                setFile(null);
                setImportResults(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Import Another File
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900">Bulk Import Students</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Instructions</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Upload a CSV file with student information</li>
              <li>• First row should contain column headers</li>
              <li>• Required fields: first_name, last_name, email</li>
              <li>• Class assignment is optional - leave class_id empty to assign later</li>
              <li>• Maximum file size: 10MB</li>
              <li>• Supported formats: CSV only</li>
            </ul>
          </div>

          {/* Template Download */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Download Template</h4>
                <p className="text-sm text-gray-600">Get a sample CSV file with the correct format</p>
              </div>
              <button
                onClick={downloadTemplate}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Download Template
              </button>
            </div>
          </div>

          {/* File Upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <div className="text-center">
              <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="mt-2 block text-sm font-medium text-gray-900">
                    {file ? file.name : 'Choose a CSV file'}
                  </span>
                  <span className="mt-1 block text-sm text-gray-500">
                    or drag and drop
                  </span>
                </label>
                <input
                  id="file-upload"
                  ref={fileInputRef}
                  name="file-upload"
                  type="file"
                  accept=".csv"
                  className="sr-only"
                  onChange={handleFileSelect}
                />
              </div>
              {file && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600">
                    Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Uploading...</span>
                <span className="text-sm text-gray-500">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Start Import'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkImportModal;
