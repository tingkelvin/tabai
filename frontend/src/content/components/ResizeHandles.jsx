import React from 'react';
import { RESIZE_TYPES } from '../utils/constants';

const ResizeHandles = ({ startResize }) => {
  return (
    <>
      {Object.values(RESIZE_TYPES).map(type => (
        <div 
          key={type}
          className={`resize-handle ${type}`} 
          onMouseDown={(e) => startResize(e, type)}
          title="Resize"
        />
      ))}
    </>
  );
};

export default ResizeHandles; 