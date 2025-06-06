import { WIDGET_CONFIG } from './constants';

export const calculateInitialPositions = () => {
  const widgetPosition = {
    top: WIDGET_CONFIG.MARGINS.DEFAULT,
    left: window.innerWidth - WIDGET_CONFIG.DEFAULT_WIDTH - WIDGET_CONFIG.MARGINS.DEFAULT
  };

  const iconPosition = {
    top: WIDGET_CONFIG.MARGINS.DEFAULT,
    left: window.innerWidth - WIDGET_CONFIG.ICON_SIZE - WIDGET_CONFIG.MARGINS.DEFAULT
  };

  return { widgetPosition, iconPosition };
};

// Helper function to convert time string (e.g., "1:23") to seconds
export const parseTimeToSeconds = (timeString) => {
  if (!timeString) return 0;
  
  const parts = timeString.split(':').map(part => parseInt(part, 10));
  
  if (parts.length === 2) {
    // MM:SS format
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    // HH:MM:SS format
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  
  return 0;
};