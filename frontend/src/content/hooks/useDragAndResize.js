// hooks/useDragAndResize.js
import { useState, useEffect, useCallback } from 'react';
import { WIDGET_CONFIG, RESIZE_TYPES } from '../utils/constants';

export const useDragAndResize = (widgetSize, widgetPosition, iconPosition, isMinimized, setWidgetSize, updateWidgetPosition, updateIconPosition) => {
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [resizeType, setResizeType] = useState('');
  const [rel, setRel] = useState({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false);

  const startDrag = useCallback((e, isDragIcon = false) => {
    if (e.button !== 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    setDragging(true);
    setHasDragged(false);
    setRel({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    e.preventDefault();
    if (isDragIcon) e.stopPropagation();
  }, []);

  const startResize = useCallback((e, type) => {
    if (isMinimized || e.button !== 0) return;

    setResizing(true);
    setResizeType(type);
    setRel({ x: e.clientX, y: e.clientY });
    e.preventDefault();
    e.stopPropagation();
  }, [isMinimized]);

  const handleResize = useCallback((deltaX, deltaY) => {
    setWidgetSize(prevSize => {
      let newWidth = prevSize.width;
      let newHeight = prevSize.height;

      switch (resizeType) {
        case RESIZE_TYPES.SOUTHEAST:
          newWidth = Math.max(WIDGET_CONFIG.MIN_WIDTH, prevSize.width + deltaX);
          newHeight = Math.max(WIDGET_CONFIG.MIN_HEIGHT, prevSize.height + deltaY);
          break;
        case RESIZE_TYPES.SOUTHWEST:
          newWidth = Math.max(WIDGET_CONFIG.MIN_WIDTH, prevSize.width - deltaX);
          newHeight = Math.max(WIDGET_CONFIG.MIN_HEIGHT, prevSize.height + deltaY);
          break;
        case RESIZE_TYPES.NORTHEAST:
          newWidth = Math.max(WIDGET_CONFIG.MIN_WIDTH, prevSize.width + deltaX);
          newHeight = Math.max(WIDGET_CONFIG.MIN_HEIGHT, prevSize.height - deltaY);
          break;
        case RESIZE_TYPES.NORTHWEST:
          newWidth = Math.max(WIDGET_CONFIG.MIN_WIDTH, prevSize.width - deltaX);
          newHeight = Math.max(WIDGET_CONFIG.MIN_HEIGHT, prevSize.height - deltaY);
          break;
      }

      // Ensure widget doesn't exceed viewport
      newWidth = Math.min(newWidth, window.innerWidth - widgetPosition.left);
      newHeight = Math.min(newHeight, window.innerHeight - widgetPosition.top);

      return { width: newWidth, height: newHeight };
    });

    // Adjust position for northwest/southwest resizing
    if ([RESIZE_TYPES.NORTHWEST, RESIZE_TYPES.SOUTHWEST].includes(resizeType)) {
      updateWidgetPosition({ 
        left: Math.max(0, widgetPosition.left + deltaX) 
      });
    }
    if ([RESIZE_TYPES.NORTHWEST, RESIZE_TYPES.NORTHEAST].includes(resizeType)) {
      updateWidgetPosition({ 
        top: Math.max(0, widgetPosition.top + deltaY) 
      });
    }
  }, [resizeType, widgetPosition, setWidgetSize, updateWidgetPosition]);

  const handleDrag = useCallback((clientX, clientY) => {
    const newLeft = clientX - rel.x;
    const newTop = clientY - rel.y;
    setHasDragged(true);

    if (isMinimized) {
      const constrainedPosition = {
        left: Math.max(0, Math.min(newLeft, window.innerWidth - WIDGET_CONFIG.ICON_SIZE)),
        top: Math.max(0, Math.min(newTop, window.innerHeight - WIDGET_CONFIG.ICON_SIZE))
      };
      updateIconPosition(constrainedPosition);
    } else {
      const constrainedPosition = {
        left: Math.max(0, Math.min(newLeft, window.innerWidth - widgetSize.width)),
        top: Math.max(0, Math.min(newTop, window.innerHeight - widgetSize.height))
      };
      updateWidgetPosition(constrainedPosition);
    }
  }, [rel, isMinimized, widgetSize, updateIconPosition, updateWidgetPosition]);

  useEffect(() => {
    if (!dragging && !resizing) return;

    const handleMouseMove = (e) => {
      if (resizing) {
        const deltaX = e.clientX - rel.x;
        const deltaY = e.clientY - rel.y;
        handleResize(deltaX, deltaY);
        setRel({ x: e.clientX, y: e.clientY });
      } else if (dragging) {
        handleDrag(e.clientX, e.clientY);
      }
    };

    const handleMouseUp = () => {
      setDragging(false);
      setResizing(false);
      setResizeType('');
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
  }, [dragging, resizing, handleResize, handleDrag]);

  return {
    dragging,
    resizing,
    hasDragged,
    startDrag,
    startResize
  };
};