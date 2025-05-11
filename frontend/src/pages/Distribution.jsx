import { useState, useRef, useEffect } from 'react';
import QRScanner from '../components/QRScanner';
import Alert from '../components/Alert';
import AttendeeCard from '../components/AttendeeCard';
import offlineService from '../services/offlineService';

const Distribution = () => {
  const [attendee, setAttendee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [distributionType, setDistributionType] = useState('lunch'); // 'lunch' or 'kit'
  const [scannerKey, setScannerKey] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const processingQrCode = useRef(false);

  // Check online status on component mount
  useEffect(() => {
    const checkOnlineStatus = async () => {
      const online = await offlineService.isOnline();
      setIsOffline(!online);
    };
    
    checkOnlineStatus();
    
    // Check periodically
    const intervalId = setInterval(checkOnlineStatus, 30000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Function to sync data when online
  const syncData = async () => {
    try {
      setSyncStatus({ loading: true, message: 'Syncing data...' });
      
      // Try to sync offline actions first
      const syncResult = await offlineService.syncOfflineActions();
      
      if (syncResult.error) {
        setSyncStatus({ error: true, message: syncResult.message });
        return;
      }
      
      // Then try to sync attendees data
      const attendeeResult = await offlineService.syncAttendeesFromServer();
      
      if (attendeeResult.error) {
        setSyncStatus({ 
          success: true, 
          warning: true,
          message: `Synced ${syncResult.count} actions, but failed to update attendee data: ${attendeeResult.message}` 
        });
        return;
      }
      
      setSyncStatus({ 
        success: true, 
        message: `Synced ${syncResult.count} actions and updated ${attendeeResult.count} attendees` 
      });
      
      // Auto-clear success message after 3 seconds
      setTimeout(() => {
        setSyncStatus(prev => prev?.success ? null : prev);
      }, 3000);
    } catch (err) {
      console.error('Sync error:', err);
      setSyncStatus({ error: true, message: `Sync failed: ${err.message}` });
    }
  };

  const handleScanSuccess = async (qrCode, offline) => {
    // Prevent duplicate API calls for the same scan
    if (processingQrCode.current) return;
    
    try {
      processingQrCode.current = true;
      setLoading(true);
      setError(null);
      setSuccess(null);
      setIsOffline(offline);
      
      // Validate QR code format - assuming it's a UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(qrCode)) {
        setError('Invalid QR code format');
        setLoading(false);
        processingQrCode.current = false;
        return;
      }
      
      let response, attendeeData;
      
      // Use the appropriate service based on distribution type
      if (distributionType === 'lunch') {
        response = await offlineService.distributeLunch(qrCode);
      } else {
        response = await offlineService.distributeKit(qrCode);
      }
      
      // Handle error cases
      if (response.status === 'error' || response.error) {
        setError(response.error || `Failed to distribute ${distributionType}`);
        
        // Try to get attendee details anyway for context
        attendeeData = await offlineService.getAttendeeByQrCode(qrCode);
        if (!attendeeData.error) {
          setAttendee(attendeeData);
        }
        
        setLoading(false);
        processingQrCode.current = false;
        return;
      }
      
      // Handle already distributed case
      if (response.status === 'already_distributed') {
        setError(`Attendee already collected ${distributionType}${response.offline ? ' (offline record)' : ''}`);
        
        // Try to get attendee details
        attendeeData = await offlineService.getAttendeeByQrCode(qrCode);
        if (!attendeeData.error) {
          setAttendee(attendeeData);
        }
        
        setLoading(false);
        processingQrCode.current = false;
        return;
      }
      
      // Success case
      const successMessage = response.offline 
        ? `${distributionType.charAt(0).toUpperCase() + distributionType.slice(1)} distributed successfully (offline mode)` 
        : `${response.attendee?.name || 'Attendee'} received ${distributionType} successfully`;
        
      setSuccess(successMessage);
      
      // Get attendee details
      attendeeData = await offlineService.getAttendeeByQrCode(qrCode);
      if (!attendeeData.error) {
        setAttendee(attendeeData);
      }
    } catch (err) {
      console.error('Distribution error:', err);
      setError(err.message);
      setAttendee(null);
    } finally {
      setLoading(false);
      processingQrCode.current = false;
    }
  };
  
  const handleScanError = (err) => {
    // Only show real errors, not the constant parse errors
    if (!err.message.includes('No MultiFormat Readers')) {
      console.error('QR scan error:', err);
      setError('Failed to scan QR code. Please try again.');
    }
    setLoading(false);
  };
  
  const resetState = () => {
    setAttendee(null);
    setError(null);
    setSuccess(null);
    processingQrCode.current = false;
    // Force scanner re-initialization
    setScannerKey(prevKey => prevKey + 1);
  };

  const handleTypeChange = (type) => {
    setDistributionType(type);
    resetState();
  };

  const createBackup = async () => {
    try {
      setSyncStatus({ loading: true, message: 'Creating backup...' });
      const result = await offlineService.createBackup();
      
      if (result.error) {
        setSyncStatus({ error: true, message: result.message });
        return;
      }
      
      setSyncStatus({ success: true, message: 'Backup file downloaded successfully' });
      
      // Auto-clear message after 3 seconds
      setTimeout(() => {
        setSyncStatus(prev => prev?.success ? null : prev);
      }, 3000);
    } catch (err) {
      console.error('Backup error:', err);
      setSyncStatus({ error: true, message: `Backup failed: ${err.message}` });
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Resource Distribution</h1>
        <p className="text-gray-600">Scan QR code to record lunch or kit distribution</p>
      </div>
      
      {isOffline && (
        <div className="mb-4 p-3 bg-amber-100 text-amber-800 rounded-md">
          <div className="flex items-center">
            <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-semibold">Offline Mode Active</span>
          </div>
          <p className="mt-1 text-sm">
            Data will be stored locally and synced when internet is available.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button 
              onClick={syncData}
              disabled={!isOffline}
              className="px-3 py-1 text-xs bg-amber-200 hover:bg-amber-300 text-amber-800 rounded"
            >
              Sync Data
            </button>
            <button 
              onClick={createBackup}
              className="px-3 py-1 text-xs bg-amber-200 hover:bg-amber-300 text-amber-800 rounded"
            >
              Backup Data
            </button>
          </div>
        </div>
      )}
      
      {syncStatus && (
        <div className={`mb-4 p-3 rounded-md ${
          syncStatus.loading ? 'bg-blue-100 text-blue-800' :
          syncStatus.error ? 'bg-red-100 text-red-800' :
          syncStatus.warning ? 'bg-amber-100 text-amber-800' : 
          'bg-green-100 text-green-800'
        }`}>
          <div className="flex items-center">
            {syncStatus.loading ? (
              <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : syncStatus.error ? (
              <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
            <span>{syncStatus.message}</span>
          </div>
        </div>
      )}
      
      {/* Distribution Type Selector */}
      <div className="mb-6">
        <div className="inline-flex rounded-md shadow-sm" role="group">
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium rounded-l-lg border border-gray-200 
              ${distributionType === 'lunch' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'}`}
            onClick={() => handleTypeChange('lunch')}
          >
            Lunch
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium rounded-r-lg border border-gray-200 
              ${distributionType === 'kit' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'}`}
            onClick={() => handleTypeChange('kit')}
          >
            Event Kit
          </button>
        </div>
      </div>
      
      {error && (
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
            autoDismiss={true}
            onDismiss={() => setSuccess(null)}
          />
        </div>
      )}
      
      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Processing...</p>
        </div>
      ) : attendee ? (
        <div className="mb-6">
          <AttendeeCard attendee={attendee} />
          
          <div className="mt-4 text-center">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={resetState}
            >
              Scan Another
            </button>
          </div>
        </div>
      ) : (
        <QRScanner
          key={scannerKey}
          onScanSuccess={handleScanSuccess}
          onScanError={handleScanError}
          offlineMode={isOffline}
        />
      )}
    </div>
  );
};

export default Distribution; 