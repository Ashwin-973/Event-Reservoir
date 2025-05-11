import { Outlet, NavLink } from 'react-router-dom';
import { 
  HomeIcon, 
  QrCodeIcon, 
  GiftIcon, 
  DocumentArrowUpIcon 
} from '@heroicons/react/24/outline';

const Layout = () => {
  const navLinks = [
    { to: '/', label: 'Dashboard', icon: HomeIcon },
    { to: '/check-in', label: 'Check In', icon: QrCodeIcon },
    { to: '/distribution', label: 'Distribution', icon: GiftIcon },
    { to: '/upload', label: 'Upload CSV', icon: DocumentArrowUpIcon },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-800">Event Manager</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => 
                `flex items-center px-4 py-2 rounded-lg ${
                  isActive 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <link.icon className="w-5 h-5 mr-2" />
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Mobile Menu Button */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
        <div className="grid grid-cols-4">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => 
                `flex flex-col items-center justify-center py-2 ${
                  isActive ? 'text-blue-700' : 'text-gray-600'
                }`
              }
            >
              <link.icon className="w-6 h-6" />
              <span className="text-xs mt-1">{link.label}</span>
            </NavLink>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout; 