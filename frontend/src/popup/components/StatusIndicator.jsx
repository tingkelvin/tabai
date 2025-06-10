import React from 'react';
import { CustomIcon } from '../CustomIcon';

const statusConfig = {
  running: {
    color: 'emerald',
    icon: 'bg-emerald-500',
    text: 'Running',
    gradient: 'from-emerald-500 to-teal-600'
  },
  stopped: {
    color: 'slate',
    icon: 'bg-slate-400',
    text: 'Stopped',
    gradient: 'from-slate-400 to-slate-500'
  },
  unauthenticated: {
    color: 'amber',
    icon: 'bg-amber-500',
    text: 'Sign in required',
    gradient: 'from-amber-500 to-orange-500'
  }
};

const StatusIndicator = ({ isAuthenticated, isActive }) => {
  const getCurrentStatus = () => {
    if (!isAuthenticated) return statusConfig.unauthenticated;
    return isActive ? statusConfig.running : statusConfig.stopped;
  };

  const currentStatus = getCurrentStatus();

  return (
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 bg-gradient-to-br ${currentStatus.gradient} rounded-2xl flex items-center justify-center shadow-lg`}>
        <CustomIcon className="w-6 h-6" color="white" />
      </div>
      
      <div className="flex-1">
        <h1 className="font-bold text-xl text-slate-900 mb-1">Tab</h1>
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${currentStatus.icon} shadow-sm`}></div>
          <span className="text-sm font-medium text-slate-600">{currentStatus.text}</span>
        </div>
      </div>
    </div>
  );
};

export default StatusIndicator; 