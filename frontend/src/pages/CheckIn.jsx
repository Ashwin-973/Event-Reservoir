import { useState, useRef } from 'react';
import QRScanner from '../components/QRScanner';
import Alert from '../components/Alert';
import AttendeeCard from '../components/AttendeeCard';

const CheckIn = () => {
  const [attendee, setAttendee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [scannerKey, setScannerKey] = useState(0);
  const processingQrCode = useRef(false);  //where does this ref come from??

  const handleScanSuccess = async (qrCode) => {
    // Prevent duplicate API calls for the same scan
    if (processingQrCode.current) return;
    
    try {
      processingQrCode.current = true;
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Validate QR code format - assuming it's a UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(qrCode)) {
        setError('Invalid QR code format');
        setLoading(false);
        processingQrCode.current = false;
        return;
      }
      
      // Check in the attendee
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ qrCode })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Check for already checked in case
        if (data.status === 'already_checked_in') {
          // Fetch attendee details
          const detailsResponse = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/checkin/${qrCode}`);
          if (detailsResponse.ok) {
            const detailsData = await detailsResponse.json();
            setAttendee(detailsData.attendee);
          }
          
          setError('Attendee already checked in');
        } else {
          throw new Error(data.error || 'Failed to check in');
        }
        return;
      }
      
      setSuccess(`${data.attendee.name} checked in successfully`);
      
      // Fetch attendee details
      const detailsResponse = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/checkin/${qrCode}`);
      if (detailsResponse.ok) {
        const detailsData = await detailsResponse.json();
        setAttendee(detailsData.attendee);
      }
    } catch (err) {
      console.error('Check-in error:', err);
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
    // Force scanner re-initialization by changing the key
    setScannerKey(prevKey => prevKey + 1);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Attendee Check-In</h1>
        <p className="text-gray-600">Scan the QR code to check in an attendee</p>
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
          key={scannerKey} // Use key to force complete re-render
          onScanSuccess={handleScanSuccess}
          onScanError={handleScanError}
        />
      )}
    </div>
  );
};

export default CheckIn; 