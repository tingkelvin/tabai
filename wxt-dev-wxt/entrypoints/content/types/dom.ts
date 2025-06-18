// DOM and positioning types

export interface Position {
    top: number;
    left: number;
}

export interface WindowDimensions {
    width: number;
    height: number;
}

export interface PositionConstraints {
    maxWidth?: number;
    maxHeight?: number;
    elementWidth?: number;
    elementHeight?: number;
} 