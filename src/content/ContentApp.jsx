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

  // Position state for the icon (when minimized)
  const [iconPosition, setIconPosition] = useState({
    top: 20,
    left: window.innerWidth - 32 - 20 // Icon width + margin
  });

  const [dragging, setDragging] = useState(false);
  const [rel, setRel] = useState({ x: 0, y: 0 });

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
      const iconLeft = terminalPosition.left + 480 - 32; // Terminal width - icon width
      setIconPosition({ top: iconTop, left: iconLeft });
    }
    setIsMinimized(true);
  };

  const handleExpand = () => {
    if (isMinimized) {
      // Calculate terminal position based on icon position (icon should be at top-right)
      const terminalTop = iconPosition.top;
      const terminalLeft = iconPosition.left - 480 + 32; // Icon left - terminal width + icon width
      
      // Ensure terminal doesn't go off-screen
      const adjustedLeft = Math.max(0, Math.min(terminalLeft, window.innerWidth - 480));
      const adjustedTop = Math.max(0, Math.min(terminalTop, window.innerHeight - 320));
      
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

  // Draggable Logic for Icon
  const handleIconMouseDown = (e) => {
    if (!isMinimized) return;
    if (e.button !== 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    setDragging(true);
    setRel({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    e.preventDefault();
    e.stopPropagation(); // Prevent expand from triggering
  };

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e) => {
      let newLeft = e.clientX - rel.x;
      let newTop = e.clientY - rel.y;

      if (isMinimized) {
        // Dragging the icon
        newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - 32));
        newTop = Math.max(0, Math.min(newTop, window.innerHeight - 29));
        setIconPosition({ top: newTop, left: newLeft });
      } else {
        // Dragging the terminal
        newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - 480));
        newTop = Math.max(0, Math.min(newTop, window.innerHeight - 320));
        setTerminalPosition({ top: newTop, left: newLeft });
      }
    };

    const handleMouseUp = () => setDragging(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'none';

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, [dragging, rel, isMinimized]);

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
    </div>
  );
};

export default ContentApp;