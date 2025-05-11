import { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const QRScanner = ({ onScanSuccess, onScanError }) => {
  const [scannerInitialized, setScannerInitialized] = useState(false);

  useEffect(() => {
    if (scannerInitialized) return;

    const config = {
      fps: 10,
      qrbox: { width: 400, height: 400 },
      rememberLastUsedCamera: true,
    };

    const html5QrcodeScanner = new Html5QrcodeScanner(
      "qr-reader",
      config,
      false
    );

    const onScan = (decodedText) => {
      html5QrcodeScanner.clear();
      onScanSuccess(decodedText);
    };

    html5QrcodeScanner.render(onScan, onScanError);
    setScannerInitialized(true);

    return () => {
      if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().catch(error => {
          console.error("Failed to clear scanner", error);
        });
      }
    };
  }, []);  //removing dependencies made loaded QR scanner

  return (
    <div className="w-full">
      <div className="mx-auto max-w-md">
        <div id="qr-reader" className="rounded-lg overflow-hidden shadow-md"></div>
        <p className="text-sm text-gray-500 mt-3 text-center">
          Center the QR code in the camera view to scan
        </p>
      </div>
    </div>
  );
};

export default QRScanner; 