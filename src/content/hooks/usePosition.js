// hooks/usePosition.js
import { useState, useCallback } from 'react';

export const usePosition = (initialPosition) => {
  const [position, setPosition] = useState(initialPosition);

  const updatePosition = useCallback((newPosition) => {
    setPosition(prev => ({ ...prev, ...newPosition }));
  }, []);

  const constrainPosition = useCallback((pos, constraints) => {
    const { 
      maxWidth = window.innerWidth, 
      maxHeight = window.innerHeight, 
      elementWidth = 0, 
      elementHeight = 0 
    } = constraints;
    
    return {
      left: Math.max(0, Math.min(pos.left, maxWidth - elementWidth)),
      top: Math.max(0, Math.min(pos.top, maxHeight - elementHeight))
    };
  }, []);

  return [position, updatePosition, constrainPosition];
};