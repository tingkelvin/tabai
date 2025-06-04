import React, { useState, useEffect, useRef, useCallback } from 'react';
// Import CSS: import './terminal-widget.css';

const TerminalIcon = ({ onClick }) => (
  <div className="terminal-icon" onClick={onClick}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2">
      <polyline points="4,17 10,11 4,5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  </div>
);

const ContentApp = () => {
  const [count, setCount] = useState(0);
  const [isMinimized, setIsMinimized] = useState(true);
  const [currentUrl, setCurrentUrl] = useState('');

  // Position state for the terminal (when expanded)
  const [terminalPosition, setTerminalPosition] = useState({
    top: 20,
    left: window.innerWidth - 480 - 20
  });

  // Size state for the terminal
  const [terminalSize, setTerminalSize] = useState({
    width: 480,
    height: 320
  });

  // Position state for the icon (when minimized)
  const [iconPosition, setIconPosition] = useState({
    top: 20,
    left: window.innerWidth - 32 - 20 // Icon width + margin
  });

  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [resizeType, setResizeType] = useState(''); // 'nw', 'ne', 'sw', 'se'
  const [rel, setRel] = useState({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false); // Track if actual dragging occurred

  const widgetRef = useRef(null);
  const iconRef = useRef(null);

  // URL State Management
  const updateUrlState = useCallback(() => {
    const hostname = window.location.hostname;
    setCurrentUrl(hostname);
  }, []);

  useEffect(() => {
    updateUrlState();

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      setTimeout(updateUrlState, 50);
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      setTimeout(updateUrlState, 50);
    };

    window.addEventListener('popstate', updateUrlState);
    window.addEventListener('hashchange', updateUrlState);

    let lastCheckedUrl = window.location.href;
    const urlCheckInterval = setInterval(() => {
      const currentHref = window.location.href;
      if (currentHref !== lastCheckedUrl) {
        lastCheckedUrl = currentHref;
        updateUrlState();
      }
    }, 1000);

    return () => {
      window.removeEventListener('popstate', updateUrlState);
      window.removeEventListener('hashchange', updateUrlState);
      clearInterval(urlCheckInterval);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, [updateUrlState]);

  // Counter and Widget Control
  const handleIncrement = () => setCount(prev => prev + 1);
  const handleReset = () => setCount(0);

  const handleClose = () => {
    const container = document.getElementById('react-extension-root');
    if (container) container.remove();
  };

  const handleMinimize = () => {
    if (!isMinimized) {
      // Calculate icon position based on terminal's top-right corner
      const iconTop = terminalPosition.top;
      const iconLeft = terminalPosition.left + terminalSize.width - 32; // Terminal width - icon width
      setIconPosition({ top: iconTop, left: iconLeft });
    }
    setIsMinimized(true);
  };

  const handleExpand = () => {
    // Only expand if we haven't been dragging
    if (hasDragged) return;
    
    if (isMinimized) {
      // Calculate terminal position based on icon position (icon should be at top-right)
      const terminalTop = iconPosition.top;
      const terminalLeft = iconPosition.left - terminalSize.width + 32; // Icon left - terminal width + icon width
      
      // Ensure terminal doesn't go off-screen
      const adjustedLeft = Math.max(0, Math.min(terminalLeft, window.innerWidth - terminalSize.width));
      const adjustedTop = Math.max(0, Math.min(terminalTop, window.innerHeight - terminalSize.height));
      
      setTerminalPosition({ top: adjustedTop, left: adjustedLeft });
    }
    setIsMinimized(false);
  };

  // Draggable Logic for Terminal Header
  const handleHeaderMouseDown = (e) => {
    if (isMinimized) return;
    if (e.button !== 0) return;

    const widget = e.currentTarget.closest('.extension-widget');
    if (!widget) return;

    const rect = widget.getBoundingClientRect();
    setDragging(true);
    setRel({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    e.preventDefault();
  };

  // Resize Logic
  const handleResizeMouseDown = (e, type) => {
    if (isMinimized) return;
    if (e.button !== 0) return;

    setResizing(true);
    setResizeType(type);
    setRel({ x: e.clientX, y: e.clientY });
    e.preventDefault();
    e.stopPropagation();
  };
  // Draggable Logic for Icon
  const handleIconMouseDown = (e) => {
    if (!isMinimized) return;
    if (e.button !== 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    setDragging(true);
    setHasDragged(false); // Reset drag flag
    setRel({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    e.preventDefault();
    e.stopPropagation(); // Prevent expand from triggering
  };

  useEffect(() => {
    if (!dragging && !resizing) return;

    const handleMouseMove = (e) => {
      if (resizing) {
        // Handle resizing
        const deltaX = e.clientX - rel.x;
        const deltaY = e.clientY - rel.y;

        setTerminalSize(prevSize => {
          let newWidth = prevSize.width;
          let newHeight = prevSize.height;

          // Handle different corner resize types
          switch (resizeType) {
            case 'se': // Southeast - increase both
              newWidth = Math.max(300, prevSize.width + deltaX);
              newHeight = Math.max(200, prevSize.height + deltaY);
              break;
            case 'sw': // Southwest - decrease width, increase height
              newWidth = Math.max(300, prevSize.width - deltaX);
              newHeight = Math.max(200, prevSize.height + deltaY);
              break;
            case 'ne': // Northeast - increase width, decrease height
              newWidth = Math.max(300, prevSize.width + deltaX);
              newHeight = Math.max(200, prevSize.height - deltaY);
              break;
            case 'nw': // Northwest - decrease both
              newWidth = Math.max(300, prevSize.width - deltaX);
              newHeight = Math.max(200, prevSize.height - deltaY);
              break;
          }

          // Ensure terminal doesn't exceed viewport
          newWidth = Math.min(newWidth, window.innerWidth - terminalPosition.left);
          newHeight = Math.min(newHeight, window.innerHeight - terminalPosition.top);

          return { width: newWidth, height: newHeight };
        });

        // For NW and SW, we also need to adjust position when resizing
        if (resizeType === 'nw' || resizeType === 'sw') {
          setTerminalPosition(prevPos => ({
            ...prevPos,
            left: Math.max(0, prevPos.left + deltaX)
          }));
        }
        if (resizeType === 'nw' || resizeType === 'ne') {
          setTerminalPosition(prevPos => ({
            ...prevPos,
            top: Math.max(0, prevPos.top + deltaY)
          }));
        }

        setRel({ x: e.clientX, y: e.clientY });
      } else if (dragging) {
        // Handle dragging
        let newLeft = e.clientX - rel.x;
        let newTop = e.clientY - rel.y;

        // Mark that we've actually dragged (moved the mouse while dragging)
        setHasDragged(true);

        if (isMinimized) {
          // Dragging the icon
          newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - 32));
          newTop = Math.max(0, Math.min(newTop, window.innerHeight - 32));
          setIconPosition({ top: newTop, left: newLeft });
        } else {
          // Dragging the terminal
          newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - terminalSize.width));
          newTop = Math.max(0, Math.min(newTop, window.innerHeight - terminalSize.height));
          setTerminalPosition({ top: newTop, left: newLeft });
        }
      }
    };

    const handleMouseUp = () => {
      setDragging(false);
      setResizing(false);
      setResizeType('');
      // Reset the drag flag after a short delay to allow click events to process
      setTimeout(() => setHasDragged(false), 100);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'none';

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, [dragging, resizing, resizeType, rel, isMinimized, terminalPosition, terminalSize]);

  if (isMinimized) {
    return (
      <div
        ref={iconRef}
        className={`extension-widget minimized ${dragging ? 'dragging' : ''}`}
        style={{
          top: iconPosition.top,
          left: iconPosition.left,
        }}
        onMouseDown={handleIconMouseDown}
      >
        <TerminalIcon onClick={handleExpand} />
      </div>
    );
  }

  return (
    <div
      ref={widgetRef}
      className={`extension-widget expanded`}
      style={{
        top: terminalPosition.top,
        left: terminalPosition.left,
        width: terminalSize.width,
        height: terminalSize.height,
      }}
    >
      <div
        className={`extension-header ${dragging ? 'dragging' : ''}`}
        onMouseDown={handleHeaderMouseDown}
      >
        <div className="extension-controls">
          <button
            className="minimize-btn"
            onClick={handleMinimize}
            title="Minimize"
          />
          <button
            className="close-btn"
            onClick={handleClose}
            title="Close"
          />
        </div>
        <h3>Terminal — {currentUrl}</h3>
      </div>

      <div className="extension-content">
        <div className="counter-section">
          <div className="counter-display">count: {count}</div>
          <div className="button-group">
            <button className="action-btn primary" onClick={handleIncrement}>
              increment
            </button>
            <button className="action-btn secondary" onClick={handleReset}>
              reset
            </button>
          </div>
        </div>

        <div className="info-section">
          <div className="url-info">
            <strong>pwd</strong>
            <span className="url-text">{currentUrl || 'localhost'}</span>
          </div>
        </div>
      </div>

      {/* Resize Handles - 4 Corners */}
      <div 
        className="resize-handle nw" 
        onMouseDown={(e) => handleResizeMouseDown(e, 'nw')}
        title="Resize"
      />
      <div 
        className="resize-handle ne" 
        onMouseDown={(e) => handleResizeMouseDown(e, 'ne')}
        title="Resize"
      />
      <div 
        className="resize-handle sw" 
        onMouseDown={(e) => handleResizeMouseDown(e, 'sw')}
        title="Resize"
      />
      <div 
        className="resize-handle se" 
        onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
        title="Resize"
      />
    </div>
  );
};

export default ContentApp;