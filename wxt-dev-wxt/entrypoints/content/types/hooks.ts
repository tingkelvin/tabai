// Hook return types

import type { Position, PositionConstraints, Size, RelativePosition } from './dom';
import type { ResizeType } from './constants';

export type UsePositionReturn = readonly [
    Position,
    (newPosition: Partial<Position>) => void,
    (pos: Position, constraints: PositionConstraints) => Position
];

// Drag hook types
export interface UseDragParams {
    isMinimized: boolean;
    widgetSize: Size;
    updateWidgetPosition: (position: Partial<Position>) => void;
    updateIconPosition: (position: Partial<Position>) => void;
}

export interface UseDragReturn {
    dragging: boolean;
    hasDragged: boolean;
    startDrag: (e: React.MouseEvent, isDragIcon?: boolean) => void;
}

// Resize hook types
export interface UseResizeParams {
    isMinimized: boolean;
    widgetPosition: Position;
    setWidgetSize: React.Dispatch<React.SetStateAction<Size>>;
    updateWidgetPosition: (position: Partial<Position>) => void;
}

export interface UseResizeReturn {
    resizing: boolean;
    resizeType: ResizeType;
    startResize: (e: React.MouseEvent, type: ResizeType) => void;
}

export interface DragState {
    startX: number;
    startY: number;
    elementX: number;
    elementY: number;
}