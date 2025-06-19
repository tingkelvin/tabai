import { WIDGET_CONFIG } from './constant';
import type { Position, WindowDimensions, InitialPositions } from '../types';

export const calculateInitialPositions = (): InitialPositions => {
  const widgetPosition: Position = {
    x: window.innerWidth - WIDGET_CONFIG.DEFAULT_WIDTH - WIDGET_CONFIG.MARGINS.DEFAULT,
    y: WIDGET_CONFIG.MARGINS.DEFAULT
  };

  const iconPosition: Position = {
    x: window.innerWidth - WIDGET_CONFIG.ICON_SIZE - WIDGET_CONFIG.MARGINS.DEFAULT,
    y: WIDGET_CONFIG.MARGINS.DEFAULT
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
  return typeof position.x === 'number' &&
    typeof position.y === 'number' &&
    position.x >= 0 &&
    position.y >= 0;
};