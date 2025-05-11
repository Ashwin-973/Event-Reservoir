import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import offlineService from '../services/offlineService';

const QRScanner = ({ onScanSuccess, onScanError, resetSignal, offlineMode = false }) => {
  const qrInstanceRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(null);
  const [internalError, setInternalError] = useState(null);
  const [isOfflineMode, setIsOfflineMode] = useState(offlineMode);
  const processingScanRef = useRef(false);
  const readerElementId = useRef(`qr-reader-${Math.random().toString(36).substring(7)}`).current;

  // Check if online
  useEffect(() => {
    const checkOnlineStatus = async () => {
      if (offlineMode) {
        setIsOfflineMode(true);
        return;
      }
      
      const isOnline = await offlineService.isOnline();
      setIsOfflineMode(!isOnline);
    };
    
    checkOnlineStatus();
    
    // Check online status periodically
    const intervalId = setInterval(checkOnlineStatus, 30000);
    
    return () => clearInterval(intervalId);
  }, [offlineMode]);

  useEffect(() => {
    const qrInstance = new Html5Qrcode(readerElementId, { verbose: false });
    qrInstanceRef.current = qrInstance;

    Html5Qrcode.getCameras()
      .then(cameraDevices => {
        if (cameraDevices && cameraDevices.length > 0) {
          setCameras(cameraDevices);
          setSelectedCameraId(cameraDevices[0].id);
        } else {
          setInternalError('No cameras found.');
        }
      })
      .catch(err => {
        console.error('Error fetching cameras:', err);
        setInternalError('Could not access cameras.');
        if (onScanError) onScanError(err);
      });

    return () => {
      if (qrInstanceRef.current) {
        const currentInstance = qrInstanceRef.current;
        qrInstanceRef.current = null; // Prevent further use
        if (currentInstance.isScanning) {
          currentInstance.stop()
            .then(() => currentInstance.clear())
            .catch(_err => console.warn('Scanner was stopped/cleared during unmount, minor error ignored.'));
        } else {
          try {
            currentInstance.clear();
          } catch (_e) {
            console.warn("Minor error clearing scanner on unmount.");
          }
        }
      }
    };
  }, [readerElementId]);

  useEffect(() => {
    if (resetSignal !== undefined && processingScanRef.current) {
      processingScanRef.current = false;
      setIsScanning(false); 
      setInternalError(null);
    }
  }, [resetSignal]);

  const handleStartScan = async () => {
    if (!qrInstanceRef.current || !selectedCameraId || isScanning || processingScanRef.current) {
      if (processingScanRef.current) {
        setInternalError("Scan already processed. Reset to scan again.");
      }
      return;
    }
    setInternalError(null);
    setIsScanning(true);
    try {
      await qrInstanceRef.current.start(
        selectedCameraId,
        { fps: 10, qrbox: 250, aspectRatio: 1.0 },
        async (decodedText, _decodedResult) => {
          if (processingScanRef.current) return;
          processingScanRef.current = true;

          // Stop scanning first
          if (qrInstanceRef.current && qrInstanceRef.current.isScanning) {
            try {
              await qrInstanceRef.current.stop();
            } catch (stopErr) {
              console.error('Error stopping scanner after successful scan:', stopErr);
              // Proceed to call onScanSuccess anyway, but log the issue
            }
          }
          setIsScanning(false);
          if (onScanSuccess) onScanSuccess(decodedText, isOfflineMode);
        },
        (_errorMessage) => { /* This is for frame-by-frame scan errors, usually ignored */ }
      );
    } catch (startErr) {
      console.error('Failed to start scanner:', startErr);
      setInternalError(`Failed to start: ${startErr.message}. Check permissions or try another camera.`);
      setIsScanning(false);
      processingScanRef.current = false;
      if (onScanError) onScanError(startErr);
    }
  };

  const handleStopScan = async () => {
    if (qrInstanceRef.current && qrInstanceRef.current.isScanning) {
      try {
        await qrInstanceRef.current.stop();
      } catch (err) {
        console.error('Failed to stop scanner manually:', err);
        setInternalError('Error stopping scanner.');
      }
    }
    setIsScanning(false);
    processingScanRef.current = false; // Allow restarting
  };

  const handleCameraChange = async (e) => {
    const newCameraId = e.target.value;
    if (qrInstanceRef.current && qrInstanceRef.current.isScanning) {
      await handleStopScan();
    }
    setSelectedCameraId(newCameraId);
    processingScanRef.current = false;
    setInternalError(null);
    // Optionally auto-start with new camera after a brief delay
    // setTimeout(() => handleStartScan(), 50);
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 bg-white shadow-lg rounded-lg">
      {isOfflineMode && (
        <div className="mb-3 p-2 text-sm text-amber-700 bg-amber-100 rounded">
          <span className="font-semibold">Offline Mode Active:</span> Data will be synced when online.
        </div>
      )}
      
      <div id={readerElementId} style={{ width: '100%', minHeight: '200px' }} className="border rounded-md overflow-hidden bg-gray-100 mb-3"></div>
      
      {internalError && (
        <div className="my-2 p-2 text-sm text-red-700 bg-red-100 rounded">
          Error: {internalError}
        </div>
      )}

      {cameras.length > 0 && (
        <div className="my-3">
          <label htmlFor={`${readerElementId}-camera-select`} className="block text-sm font-medium text-gray-700 mb-1">
            Select Camera:
          </label>
          <select
            id={`${readerElementId}-camera-select`}
            value={selectedCameraId || ''}
            onChange={handleCameraChange}
            className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            disabled={isScanning && !processingScanRef.current} // Disable if actively scanning, but enable if scan processed & waiting for reset
          >
            {cameras.map(camera => (
              <option key={camera.id} value={camera.id}>
                {camera.label || `Camera ${camera.id}`}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-4 flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-2">
        {!isScanning && !processingScanRef.current && (
          <button
            onClick={handleStartScan}
            disabled={!selectedCameraId} // Only disable if no camera selected
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50"
          >
            Start Scanning
          </button>
        )}
        {(isScanning || processingScanRef.current) && (
           // Show Stop button if scanning OR if a scan just completed and waiting for reset
          <button
            onClick={handleStopScan}
            className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
          >
            Stop Scanning / Reset
          </button>
        )}
      </div>
      {processingScanRef.current && !isScanning && (
         <p className="mt-2 text-sm text-green-600 text-center">Scan successful! Parent should provide a 'Scan Again' or reset option.</p>
      )}
    </div>
  );
};

export default QRScanner; 