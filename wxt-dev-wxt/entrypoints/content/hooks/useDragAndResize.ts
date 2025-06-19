// hooks/useDragAndResize.ts
import { useState, useEffect, useCallback } from 'react';
import { WIDGET_CONFIG, RESIZE_TYPES } from '../utils/constant';

// Types
interface Position {
    top: number;
    left: number;
}

interface Size {
    width: number;
    height: number;
}

interface RelativePosition {
    x: number;
    y: number;
}

type ResizeType = typeof RESIZE_TYPES[keyof typeof RESIZE_TYPES];

interface UseDragAndResizeProps {
    widgetSize: Size;
    widgetPosition: Position;
    iconPosition: Position;
    isMinimized: boolean;
    setWidgetSize: React.Dispatch<React.SetStateAction<Size>>;
    updateWidgetPosition: (position: Partial<Position>) => void;
    updateIconPosition: (position: Partial<Position>) => void;
}

interface UseDragAndResizeReturn {
    dragging: boolean;
    resizing: boolean;
    hasDragged: boolean;
    startDrag: (e: React.MouseEvent, isDragIcon?: boolean) => void;
    startResize: (e: React.MouseEvent, type: ResizeType) => void;
}

export const useDragAndResize = ({
    widgetSize,
    widgetPosition,
    iconPosition,
    isMinimized,
    setWidgetSize,
    updateWidgetPosition,
    updateIconPosition
}: UseDragAndResizeProps): UseDragAndResizeReturn => {
    const [dragging, setDragging] = useState<boolean>(false);
    const [resizing, setResizing] = useState<boolean>(false);
    const [resizeType, setResizeType] = useState<ResizeType>('');
    const [rel, setRel] = useState<RelativePosition>({ x: 0, y: 0 });
    const [hasDragged, setHasDragged] = useState<boolean>(false);

    const startDrag = useCallback((e: React.MouseEvent, isDragIcon: boolean = false): void => {
        if (e.button !== 0) return;

        const rect = e.currentTarget.getBoundingClientRect();
        setDragging(true);
        setHasDragged(false);
        setRel({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        e.preventDefault();
        if (isDragIcon) e.stopPropagation();
    }, []);

    const startResize = useCallback((e: React.MouseEvent, type: ResizeType): void => {
        if (isMinimized || e.button !== 0) return;

        setResizing(true);
        setResizeType(type);
        setRel({ x: e.clientX, y: e.clientY });
        e.preventDefault();
        e.stopPropagation();
    }, [isMinimized]);

    const handleResize = useCallback((deltaX: number, deltaY: number): void => {
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

    const handleDrag = useCallback((clientX: number, clientY: number): void => {
        const newLeft = clientX - rel.x;
        const newTop = clientY - rel.y;
        setHasDragged(true);

        if (isMinimized) {
            const constrainedPosition: Position = {
                left: Math.max(0, Math.min(newLeft, window.innerWidth - WIDGET_CONFIG.ICON_SIZE)),
                top: Math.max(0, Math.min(newTop, window.innerHeight - WIDGET_CONFIG.ICON_SIZE))
            };
            updateIconPosition(constrainedPosition);
        } else {
            const constrainedPosition: Position = {
                left: Math.max(0, Math.min(newLeft, window.innerWidth - widgetSize.width)),
                top: Math.max(0, Math.min(newTop, window.innerHeight - widgetSize.height))
            };
            updateWidgetPosition(constrainedPosition);
        }
    }, [rel, isMinimized, widgetSize, updateIconPosition, updateWidgetPosition]);

    useEffect(() => {
        console.log('🚀 Dragging:', dragging);
        if (!dragging && !resizing) return;

        const handleMouseMove = (e: MouseEvent): void => {
            if (resizing) {
                const deltaX = e.clientX - rel.x;
                const deltaY = e.clientY - rel.y;
                handleResize(deltaX, deltaY);
                setRel({ x: e.clientX, y: e.clientY });
            } else if (dragging) {
                handleDrag(e.clientX, e.clientY);
            }
        };

        const handleMouseUp = (): void => {
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