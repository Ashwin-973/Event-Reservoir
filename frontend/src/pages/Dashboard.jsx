import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  MagnifyingGlassIcon, 
  UsersIcon, 
  CheckIcon, 
  CakeIcon,
  GiftIcon
} from '@heroicons/react/24/outline';
import AttendeeCard from '../components/AttendeeCard';
import Alert from '../components/Alert';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch dashboard stats
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch stats
        const statsResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/dashboard/stats`);
        if (!statsResponse.ok) throw new Error('Failed to fetch stats');
        const statsData = await statsResponse.json();
        console.log(statsData)
        
        // Fetch attendees
        const attendeesResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/dashboard/attendees`);
        if (!attendeesResponse.ok) throw new Error('Failed to fetch attendees');
        const attendeesData = await attendeesResponse.json();
        console.log(attendeesData)
        setStats(statsData);
        setAttendees(attendeesData);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

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
    { title: 'Total Attendees', value: stats?.total || 0, icon: UsersIcon, color: 'bg-blue-500' },
    { title: 'Checked In', value: stats?.checked_in_count || 0, icon: CheckIcon, color: 'bg-green-500' },
    { title: 'Lunch Distributed', value: stats?.lunch_distributed_count || 0, icon: CakeIcon, color: 'bg-amber-500' },
    { title: 'Kits Distributed', value: stats?.kit_distributed_count || 0, icon: GiftIcon, color: 'bg-purple-500' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Event Dashboard</h1>
        <p className="text-gray-600">Overview of event attendance and distributions</p>
      </div>

      {error && (
        <div className="mb-6">
          <Alert 
            message={`Error: ${error}`} 
            variant="error" 
            onDismiss={() => setError(null)}
          />
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
                <p className="text-2xl font-semibold">{card.value}</p>
              </div>
            </div>
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
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
          </div>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={handleSearch}
          >
            Search
          </button>
        </div>
      </div>

      {/* Attendee List */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Attendees</h2>
          <Link 
            to="/upload"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Import Attendees
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
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