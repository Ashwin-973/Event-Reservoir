import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';

const AttendeeCard = ({ attendee }) => {
  if (!attendee) return null;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-semibold">{attendee.name}</h3>
          <p className="text-gray-500">{attendee.email}</p>
          {attendee.phone && <p className="text-gray-500">{attendee.phone}</p>}
        </div>
        
        {attendee.qrCodeUrl && (
          <div className="shrink-0">
            <img 
              src={`${import.meta.env.VITE_API_URL || ''}${attendee.qrCodeUrl}`} 
              alt={`QR code for ${attendee.name}`} 
              className="w-20 h-20"
            />
          </div>
        )}
      </div>
      
      <div className="mt-4 grid grid-cols-3 gap-2">
        <StatusItem 
          label="Check-in" 
          status={attendee.checked_in} 
        />
        <StatusItem 
          label="Lunch" 
          status={attendee.lunch_distributed} 
        />
        <StatusItem 
          label="Kit" 
          status={attendee.kit_distributed} 
        />
      </div>
    </div>
  );
};

const StatusItem = ({ label, status }) => {
  return (
    <div className="flex flex-col items-center">
      <span className="text-sm text-gray-500">{label}</span>
      <div className="mt-1">
        {status ? (
          <CheckCircleIcon className="w-6 h-6 text-green-500" />
        ) : (
          <XCircleIcon className="w-6 h-6 text-gray-300" />
        )}
      </div>
    </div>
  );
};

export default AttendeeCard; 