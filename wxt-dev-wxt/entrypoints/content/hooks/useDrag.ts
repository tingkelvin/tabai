import { useRef, useCallback } from 'react';
import type { Position } from '../types';

interface DragState {
  startX: number;
  startY: number;
  elementX: number;
  elementY: number;
}

interface UseDragOptions {
  elementSize: { width: number; height: number };
  onPositionUpdate: (position: Position) => void;
  constrainPosition?: (position: Position, elementSize: { elementWidth: number; elementHeight: number }) => Position;
}

interface UseDragReturn {
  isDragging: boolean;
  hasDragged: boolean;
  handleMouseDown: (e: React.MouseEvent) => void;
}

export const useDrag = (
  elementRef: React.RefObject<HTMLElement>,
  currentPosition: React.MutableRefObject<Position>,
  options: UseDragOptions
): UseDragReturn => {
  const isDragging = useRef(false);
  const hasDragged = useRef(false);
  const dragState = useRef<DragState>({ startX: 0, startY: 0, elementX: 0, elementY: 0 });

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;

    const deltaX = e.clientX - dragState.current.startX;
    const deltaY = e.clientY - dragState.current.startY;

    let newPosition: Position = {
      left: dragState.current.elementX + deltaX,
      top: dragState.current.elementY + deltaY
    };

    // Apply constraints if provided
    if (options.constrainPosition) {
      newPosition = options.constrainPosition(newPosition, {
        elementWidth: options.elementSize.width,
        elementHeight: options.elementSize.height
      });
    }

    // Update current position reference
    currentPosition.current = newPosition;

    // Apply transform directly for smooth dragging
    if (elementRef.current) {
      elementRef.current.style.transform = `translate(${newPosition.left}px, ${newPosition.top}px)`;
    }

    hasDragged.current = true;
  }, [options, currentPosition, elementRef]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging.current) return;

    isDragging.current = false;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';

    // Update position through callback
    options.onPositionUpdate(currentPosition.current);

    // Clean up event listeners
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove, options, currentPosition]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    isDragging.current = true;
    hasDragged.current = false;

    // Store initial drag state
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      elementX: currentPosition.current.left,
      elementY: currentPosition.current.top
    };

    // Prevent text selection and set cursor
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';

    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove, handleMouseUp, currentPosition]);

  return {
    isDragging: isDragging.current,
    hasDragged: hasDragged.current,
    handleMouseDown
  };
};