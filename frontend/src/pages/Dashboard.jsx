import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  MagnifyingGlassIcon, 
  UsersIcon, 
  CheckIcon, 
  CakeIcon,
  GiftIcon,
  WifiIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CloudArrowUpIcon,
  CloudArrowDownIcon
} from '@heroicons/react/24/outline';
import AttendeeCard from '../components/AttendeeCard';
import Alert from '../components/Alert';
import offlineService from '../services/offlineService';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [offlineStats, setOfflineStats] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncInProgress, setSyncInProgress] = useState(false);

  // Check online status and fetch dashboard data
  useEffect(() => {
    const checkOnlineAndFetchData = async () => {
      try {
        // Check online status
        const online = await offlineService.isOnline();
        setIsOffline(!online);
        
        if (online) {
          await fetchOnlineData();
        }
        
        // Get offline stats from IndexedDB
        const offlineStatsData = await offlineService.getOfflineStats();
        if (!offlineStatsData.error) {
          setOfflineStats(offlineStatsData);
        }
      } catch (err) {
        console.error('Error initializing dashboard:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    checkOnlineAndFetchData();
    
    // Set up periodic online check
    const intervalId = setInterval(async () => {
      const online = await offlineService.isOnline();
      setIsOffline(!online);
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Fetch dashboard data from server
  const fetchOnlineData = async () => {
    try {
      setLoading(true);
      
      // Fetch stats
      const statsResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/dashboard/stats`);
      if (!statsResponse.ok) throw new Error('Failed to fetch stats');
      const statsData = await statsResponse.json();
      
      // Fetch attendees
      const attendeesResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/dashboard/attendees`);
      if (!attendeesResponse.ok) throw new Error('Failed to fetch attendees');
      const attendeesData = await attendeesResponse.json();
      
      setStats(statsData);
      setAttendees(attendeesData);
      return { statsData, attendeesData };
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Handle sync with server
  const handleSync = async () => {
    if (syncInProgress) return;
    
    try {
      setSyncInProgress(true);
      setSyncStatus({ loading: true, message: 'Syncing with server...' });
      
      // First sync offline changes to server
      const syncResult = await offlineService.syncOfflineActions();
      
      if (syncResult.error) {
        setSyncStatus({ error: true, message: syncResult.message });
        return;
      }
      
      // Then download latest attendee data
      const dataResult = await offlineService.syncAttendeesFromServer();
      
      if (dataResult.error) {
        setSyncStatus({ 
          success: true, 
          warning: true,
          message: `Synced ${syncResult.count} actions, but failed to update attendee data` 
        });
        return;
      }
      
      // Update offline stats
      const offlineStatsData = await offlineService.getOfflineStats();
      if (!offlineStatsData.error) {
        setOfflineStats(offlineStatsData);
      }
      
      // Also refresh online data if possible
      try {
        await fetchOnlineData();
      } catch (err) {
        console.log('Could not fetch fresh online data');
      }
      
      setSyncStatus({ 
        success: true, 
        message: `Synced ${syncResult.count} actions and updated ${dataResult.count} attendees` 
      });
      
      // Auto-clear success message after 3 seconds
      setTimeout(() => {
        setSyncStatus(prev => prev?.success ? null : prev);
      }, 3000);
    } catch (err) {
      console.error('Sync error:', err);
      setSyncStatus({ error: true, message: `Sync failed: ${err.message}` });
    } finally {
      setSyncInProgress(false);
    }
  };

  // Handle backup creation
  const handleBackup = async () => {
    try {
      setSyncStatus({ loading: true, message: 'Creating backup...' });
      
      const result = await offlineService.createBackup();
      
      if (result.error) {
        setSyncStatus({ error: true, message: result.message });
        return;
      }
      
      setSyncStatus({ success: true, message: `Backup created at ${result.path}` });
      
      // Auto-clear success message after 3 seconds
      setTimeout(() => {
        setSyncStatus(prev => prev?.success ? null : prev);
      }, 3000);
    } catch (err) {
      console.error('Backup error:', err);
      setSyncStatus({ error: true, message: `Backup failed: ${err.message}` });
    }
  };

  // Handle search
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      // If search is empty, fetch all attendees
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/dashboard/attendees`);
        if (!response.ok) throw new Error('Failed to fetch attendees');
        const data = await response.json();
        setAttendees(data);
      } catch (err) {
        console.error('Error fetching attendees:', err);
        setError(err.message);
      }
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/dashboard/search?q=${encodeURIComponent(searchTerm)}`);
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      setAttendees(data);
    } catch (err) {
      console.error('Search error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter attendees on the client side as well
  const filteredAttendees = useMemo(() => {
    if (!searchTerm.trim()) return attendees;
    
    return attendees.filter(attendee => 
      attendee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      attendee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (attendee.phone && attendee.phone.includes(searchTerm))
    );
  }, [attendees, searchTerm]);

  // Stats cards data
  const statsCards = [
    { 
      title: 'Total Attendees', 
      value: stats?.total || 0, 
      offlineValue: offlineStats?.total || 0,
      icon: UsersIcon, 
      color: 'bg-blue-500' 
    },
    { 
      title: 'Checked In', 
      value: stats?.checked_in_count || 0, 
      offlineValue: offlineStats?.checked_in || 0,
      icon: CheckIcon, 
      color: 'bg-green-500' 
    },
    { 
      title: 'Lunch Distributed', 
      value: stats?.lunch_distributed_count || 0, 
      offlineValue: offlineStats?.lunch_distributed || 0,
      icon: CakeIcon, 
      color: 'bg-amber-500' 
    },
    { 
      title: 'Kits Distributed', 
      value: stats?.kit_distributed_count || 0, 
      offlineValue: offlineStats?.kit_distributed || 0,
      icon: GiftIcon, 
      color: 'bg-purple-500' 
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Event Dashboard</h1>
        <p className="text-gray-600">Overview of event attendance and distributions</p>
      </div>

      {/* Online/Offline Status */}
      <div className="mb-6 flex justify-between items-center">
        <div className={`flex items-center px-4 py-2 rounded-md ${isOffline ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
          {isOffline ? (
            <>
              <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
              <span>Offline Mode</span>
            </>
          ) : (
            <>
              <WifiIcon className="h-5 w-5 mr-2" />
              <span>Online Mode</span>
            </>
          )}
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={handleSync}
            disabled={syncInProgress}
            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            <ArrowPathIcon className="h-4 w-4 mr-1" />
            <span>Sync Data</span>
          </button>
          
          <button
            onClick={handleBackup}
            disabled={syncInProgress}
            className="flex items-center px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            <CloudArrowDownIcon className="h-4 w-4 mr-1" />
            <span>Create Backup</span>
          </button>
        </div>
      </div>
      
      {/* Sync Status Messages */}
      {syncStatus && (
        <div className={`mb-6 p-3 rounded-md ${
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
              <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
            ) : (
              <CheckIcon className="h-5 w-5 mr-2" />
            )}
            <span>{syncStatus.message}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6">
          <Alert 
            message={`Error: ${error}`} 
            variant="error" 
            onDismiss={() => setError(null)}
          />
        </div>
      )}

      {/* Pending Sync Notification */}
      {offlineStats && offlineStats.pending_sync > 0 && (
        <div className="mb-6 p-3 bg-amber-100 text-amber-800 rounded-md">
          <div className="flex items-center">
            <CloudArrowUpIcon className="h-5 w-5 mr-2" />
            <span>
              <strong>{offlineStats.pending_sync}</strong> offline {offlineStats.pending_sync === 1 ? 'action' : 'actions'} pending synchronization
            </span>
          </div>
          <div className="mt-2">
            <button
              onClick={handleSync}
              disabled={syncInProgress}
              className="px-3 py-1 text-sm bg-amber-200 hover:bg-amber-300 text-amber-800 rounded"
            >
              Sync Now
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statsCards.map((card, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className={`p-3 rounded-full ${card.color} text-white mr-4`}>
                <card.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{card.title}</p>
                {isOffline ? (
                  <div>
                    <p className="text-2xl font-semibold">{card.offlineValue}</p>
                    <p className="text-xs text-gray-500">Offline data</p>
                  </div>
                ) : (
                  <p className="text-2xl font-semibold">{card.value}</p>
                )}
              </div>
            </div>
            {(!isOffline && offlineStats && card.value !== card.offlineValue) && (
              <div className="mt-2 text-xs text-amber-600">
                <span>Offline: {card.offlineValue}</span>
                {card.offlineValue > card.value && (
                  <span className="ml-1">(+{card.offlineValue - card.value} pending sync)</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="flex">
          <div className="relative flex-grow">
            <input
              type="text"
              placeholder="Search attendees by name, email, or phone"
              className="w-full px-4 py-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              disabled={isOffline}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
          </div>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            onClick={handleSearch}
            disabled={isOffline}
          >
            Search
          </button>
        </div>
        {isOffline && (
          <p className="mt-1 text-sm text-amber-600">Search is disabled in offline mode</p>
        )}
      </div>

      {/* Attendee List */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Attendees</h2>
          <Link 
            to="/upload"
            className={`px-4 py-2 ${isOffline ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500`}
            onClick={e => isOffline && e.preventDefault()}
          >
            Import Attendees
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <svg className="animate-spin h-8 w-8 mx-auto text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        ) : isOffline ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <ExclamationTriangleIcon className="h-10 w-10 mx-auto text-amber-500 mb-2" />
            <p className="text-gray-700 font-medium">Attendee list not available offline</p>
            <p className="text-gray-500 mt-1">Connect to the internet to view attendees</p>
          </div>
        ) : filteredAttendees.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No attendees found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAttendees.map((attendee) => (
              <AttendeeCard key={attendee.id} attendee={attendee} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard; 