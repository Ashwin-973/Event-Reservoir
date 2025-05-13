import { useState, useRef,useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpTrayIcon, DocumentTextIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Alert from '../components/Alert';
import fileDownload from 'js-file-download';
import toast from 'react-hot-toast';

const CSVUpload = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processedAttendees, setProcessedAttendees] = useState([]);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();


  useEffect(()=>
    {
      if(success)
      {
        toast.success(success)
      }
      if(error)
      {
        toast.error(error)
      }
    },[success,error])

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    
    if (selectedFile) {
      // Validate file type
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setError('Please upload a CSV file');
        return;
      }
      
      // Validate file size (max 2MB)
      if (selectedFile.size > 2 * 1024 * 1024) {
        setError('File size should be less than 2MB');
        return;
      }
      
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setUploadProgress(0);
      
      const formData = new FormData();
      formData.append('file', file);
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          const newProgress = prev + 5;
          return newProgress > 90 ? 90 : newProgress;
        });
      }, 200);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/onboard/upload`, {
        method: 'POST',
        body: formData
      });
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload file');
      }
      
      setProcessedAttendees(data.attendees || []);
      setSuccess(`Successfully processed ${data.processed} attendees`);
      setFile(null);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const downloadQRCodes = () => {
    if (processedAttendees.length === 0) {
      setError('No processed attendees to download QR codes for');
      return;
    }
    
    // In a real app, you might generate a ZIP file on the server
    // For this MVP, we'll just download a CSV with URLs
    const csvContent = [
      'Name,Email,QR Code URL',
      ...processedAttendees.map(attendee => 
        `${attendee.name},${attendee.email},${import.meta.env.VITE_API_URL}${attendee.qrCodeUrl}`
      )
    ].join('\n');
    
    fileDownload(csvContent, 'attendee-qrcodes.csv');
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      
      if (droppedFile.type !== 'text/csv' && !droppedFile.name.endsWith('.csv')) {
        setError('Please upload a CSV file');
        return;
      }
      
      setFile(droppedFile);
      setError(null);
    }
  };

  const cancelUpload = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const template = 'Name,Email,Phone\nJohn Doe,john@example.com,1234567890\nJane Smith,jane@example.com,0987654321';
    fileDownload(template, 'attendee-template.csv');
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Import Attendees</h1>
        <p className="text-gray-600">Upload a CSV file with attendee details</p>
      </div>
      
      {/*error && (
        <div className="mb-6">
          <Alert 
            message={error}
            variant="error"
            onDismiss={() => setError(null)}
          />
        </div>
      )}
      
      {success && (
        <div className="mb-6">
          <Alert 
            message={success}
            variant="success"
            onDismiss={() => setSuccess(null)}
          />
        </div>
      )*/}
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div 
          className="border-2 border-dashed border-gray-300 p-6 rounded-lg text-center"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {file ? (
            <div>
              <div className="flex items-center justify-center mb-4">
                <DocumentTextIcon className="h-12 w-12 text-blue-500" />
              </div>
              <p className="mb-2 text-lg font-semibold">{file.name}</p>
              <p className="mb-4 text-sm text-gray-500">
                {(file.size / 1024).toFixed(2)} KB
              </p>
              {loading ? (
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              ) :  (
                <div className="flex justify-center space-x-3">
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={handleUpload}
                    disabled={loading}
                  >
                    Upload CSV
                  </button>
                  <button
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    onClick={cancelUpload}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-center mb-4">
                <ArrowUpTrayIcon className="h-12 w-12 text-gray-400" />
              </div>
              <p className="mb-2 text-lg font-semibold">
                Drag and drop your CSV file here
              </p>
              <p className="mb-4 text-sm text-gray-500">
                Or click to browse files
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                ref={fileInputRef}
                disabled={loading}
              />
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={() => fileInputRef.current.click()}
                disabled={loading}
              >
                Browse Files
              </button>
            </div>
          )}
        </div>

        {/* Template download */}
        <div className="mt-4 text-center">
          <button
            className="text-blue-600 hover:text-blue-800 underline text-sm"
            onClick={downloadTemplate}
          >
            Download CSV template
          </button>
        </div>
      </div>
      
      {processedAttendees.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">
            {processedAttendees.length} Attendees Processed
          </h2>
          
          <div className="flex justify-between mb-4">
            <button
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              onClick={downloadQRCodes}
            >
              Download QR Codes
            </button>
            
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={() => navigate('/')}
            >
              Go to Dashboard
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    QR Code
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {processedAttendees.slice(0, 5).map((attendee, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {attendee.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {attendee.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <img 
                        src={`${import.meta.env.VITE_API_URL || ''}${attendee.qrCodeUrl}`} 
                        alt={`QR code for ${attendee.name}`} 
                        className="w-10 h-10"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {processedAttendees.length > 5 && (
            <div className="text-center mt-4 text-sm text-gray-500">
              Showing 5 of {processedAttendees.length} attendees
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CSVUpload; 