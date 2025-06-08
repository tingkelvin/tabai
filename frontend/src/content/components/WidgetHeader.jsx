import React from 'react';

const WidgetHeader = ({ 
  dragging, 
  startDrag, 
  handleMinimize, 
  handleClose, 
  title, 
  currentUrl 
}) => {
  return (
    <div
      className={`extension-header ${dragging ? 'dragging' : ''}`}
      onMouseDown={startDrag}
    >
      <div className="extension-controls">
        <button
          className="minimize-btn"
          onClick={handleMinimize}
          title="Minimize"
        />
      </div>
      <h3>{title || new URL(currentUrl).hostname}</h3>
    </div>
  );
};

export default WidgetHeader; 