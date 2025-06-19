// utils/dragUtils.ts
import type { Position } from '../types';

export interface DragState {
    startX: number;
    startY: number;
    elementX: number;
    elementY: number;
}

export interface DragHandlers {
    handleMouseDown: (e: React.MouseEvent) => void;
    cleanup: () => void;
}

export const createDragHandlers = (
    elementRef: React.RefObject<HTMLDivElement | null>,
    currentPosition: React.RefObject<Position>,
    isDragging: React.RefObject<boolean>,
    dragState: React.RefObject<DragState>,
    constraintSize: { width: number; height: number },
    hasDragged: React.RefObject<boolean>,
    updatePosition?: (newPos: Partial<Position>) => void
): DragHandlers => {

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0 || !elementRef.current) return;

        isDragging.current = true;
        hasDragged.current = false; // Reset flag on mouse down
        dragState.current = {
            startX: e.clientX,
            startY: e.clientY,
            elementX: currentPosition.current.left,
            elementY: currentPosition.current.top
        };

        e.preventDefault();
        e.stopPropagation();
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging.current || !elementRef.current) return;

        const deltaX = e.clientX - dragState.current.startX;
        const deltaY = e.clientY - dragState.current.startY;

        // Mark as dragged if movement exceeds threshold
        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
            hasDragged.current = true;
        }

        const newX = dragState.current.elementX + deltaX;
        const newY = dragState.current.elementY + deltaY;

        const maxX = window.innerWidth - constraintSize.width;
        const maxY = window.innerHeight - constraintSize.height;

        const constrainedX = Math.max(0, Math.min(newX, maxX));
        const constrainedY = Math.max(0, Math.min(newY, maxY));

        currentPosition.current = { left: constrainedX, top: constrainedY };
        elementRef.current.style.transform = `translate(${constrainedX}px, ${constrainedY}px)`;
    };

    const handleMouseUp = () => {
        isDragging.current = false;
        document.body.style.userSelect = '';

        // Update the position state when drag ends
        if (updatePosition && hasDragged.current) {
            updatePosition({
                left: currentPosition.current.left,
                top: currentPosition.current.top
            });
        }
    };

    const addListeners = () => {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = 'none';
    };

    const removeListeners = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = '';
    };

    // Auto-manage listeners
    const originalMouseDown = handleMouseDown;
    const enhancedMouseDown = (e: React.MouseEvent) => {
        originalMouseDown(e);
        addListeners();
    };

    const cleanup = () => {
        removeListeners();
    };

    return {
        handleMouseDown: enhancedMouseDown,
        cleanup
    };
};