import { 
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/solid';
import { useState, useEffect } from 'react';

const VARIANTS = {
  success: {
    icon: CheckCircleIcon,
    classes: 'bg-green-50 text-green-800 border-green-200'
  },
  error: {
    icon: ExclamationCircleIcon,
    classes: 'bg-red-50 text-red-800 border-red-200'
  },
  info: {
    icon: InformationCircleIcon,
    classes: 'bg-blue-50 text-blue-800 border-blue-200'
  }
};

const Alert = ({ 
  message, 
  variant = 'info', 
  dismissible = true, 
  autoDismiss = false,
  autoDismissTime = 5000,
  onDismiss
}) => {
  const [visible, setVisible] = useState(true);
  const { icon: IconComponent, classes } = VARIANTS[variant] || VARIANTS.info;

  useEffect(() => {
    if (autoDismiss && visible) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, autoDismissTime);

      return () => clearTimeout(timer);
    }
  }, [autoDismiss, visible, autoDismissTime]);

  const handleDismiss = () => {
    setVisible(false);
    if (onDismiss) onDismiss();
  };

  if (!visible) return null;

  return (
    <div className={`border px-4 py-3 rounded relative ${classes}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <IconComponent className="h-5 w-5" />
        </div>
        <div className="ml-3">
          <p className="text-sm">{message}</p>
        </div>
        {dismissible && (
          <div className="ml-auto pl-3">
            <button
              className="inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2"
              onClick={handleDismiss}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Alert; 