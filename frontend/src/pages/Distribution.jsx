import { useState } from 'react';
import QRScanner from '../components/QRScanner';
import Alert from '../components/Alert';
import AttendeeCard from '../components/AttendeeCard';

const Distribution = () => {
  const [attendee, setAttendee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [distributionType, setDistributionType] = useState('lunch'); // 'lunch' or 'kit'

  const handleScanSuccess = async (qrCode) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Perform distribution
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/distribute/${distributionType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ qrCode })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (data.status === 'already_distributed') {
          setError(`Attendee already collected ${distributionType}`);
        } else {
          throw new Error(data.error || `Failed to distribute ${distributionType}`);
        }
        
        // Still try to fetch attendee details
        const detailsResponse = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/checkin/${qrCode}`);
        if (detailsResponse.ok) {
          const detailsData = await detailsResponse.json();
          setAttendee(detailsData.attendee);
        }
        
        return;
      }
      
      setSuccess(`${data.attendee.name} received ${distributionType} successfully`);
      
      // Fetch updated attendee details
      const detailsResponse = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/checkin/${qrCode}`);
      if (detailsResponse.ok) {
        const detailsData = await detailsResponse.json();
        setAttendee(detailsData.attendee);
      }
    } catch (err) {
      console.error('Distribution error:', err);
      setError(err.message);
      setAttendee(null);
    } finally {
      setLoading(false);
    }
  };
  
  const handleScanError = (err) => {
    console.error('QR scan error:', err);
    setError('Failed to scan QR code. Please try again.');
    setLoading(false);
  };
  
  const resetState = () => {
    setAttendee(null);
    setError(null);
    setSuccess(null);
  };

  const handleTypeChange = (type) => {
    setDistributionType(type);
    resetState();
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Resource Distribution</h1>
        <p className="text-gray-600">Scan QR code to record lunch or kit distribution</p>
      </div>
      
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
          onScanSuccess={handleScanSuccess}
          onScanError={handleScanError}
        />
      )}
    </div>
  );
};

export default Distribution; 