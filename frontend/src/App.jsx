import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CheckIn from './pages/CheckIn';
import Distribution from './pages/Distribution';
import CSVUpload from './pages/CSVUpload';
import offlineService from './services/offlineService';
import {Toaster} from 'react-hot-toast';

function App() {
  useEffect(() => {
    const initOfflineMode = async () => {
      // Add a small delay to ensure DOM is loaded
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('Initializing offline functionality...');
      
      // Initialize automatic sync and event listeners
      offlineService.setupAutomaticSync();
      
      // Initial fetch of attendees if online
      const online = await offlineService.isOnline();
      console.log('Online status at init:', online);
      
      if (online) {
        try {
          console.log('Syncing attendees from server at startup...');
          const result = await offlineService.syncAttendeesFromServer();
          console.log('Initial sync result:', result);
        } catch (error) {
          console.error('Error during initial sync:', error);
        }
      } else {
        console.log('App starting in offline mode, will sync when online');
      }
    };
    
    initOfflineMode();
  }, []);
  
  return (
    <div>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="check-in" element={<CheckIn />} />
            <Route path="distribution" element={<Distribution />} />
            <Route path="upload" element={<CSVUpload />} />
          </Route>
        </Routes>
      </Router>
      <Toaster position="top-right" gutter={8} toastOptions={{
        duration:5000,
        removeDelay:1000,
      }}/>
    </div>
  );
}

export default App;
