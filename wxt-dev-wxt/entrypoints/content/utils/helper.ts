import { WIDGET_CONFIG } from './constant';
import type { Position, WindowDimensions, InitialPositions } from '../types';

export const calculateInitialPositions = (): InitialPositions => {
  const widgetPosition: Position = {
    top: WIDGET_CONFIG.MARGINS.DEFAULT,
    left: window.innerWidth - WIDGET_CONFIG.DEFAULT_WIDTH - WIDGET_CONFIG.MARGINS.DEFAULT
  };

  const iconPosition: Position = {
    top: WIDGET_CONFIG.MARGINS.DEFAULT,
    left: window.innerWidth - WIDGET_CONFIG.ICON_SIZE - WIDGET_CONFIG.MARGINS.DEFAULT
  };

  return { widgetPosition, iconPosition };
};

// Add a type-safe function to get window dimensions
export const getWindowDimensions = (): WindowDimensions => ({
  width: window.innerWidth,
  height: window.innerHeight,
});

// Add a type-safe function to validate positions
export const isValidPosition = (position: Position): boolean => {
  return typeof position.top === 'number' &&
    typeof position.left === 'number' &&
    position.top >= 0 &&
    position.left >= 0;
};