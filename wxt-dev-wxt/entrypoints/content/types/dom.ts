// DOM and positioning types

export interface Position {
    x: number;
    y: number;
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

export interface Size {
    width: number;
    height: number;
}

export interface RelativePosition {
    x: number;
    y: number;
} 