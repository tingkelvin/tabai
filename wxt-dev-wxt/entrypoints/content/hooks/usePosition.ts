// hooks/usePosition.ts
import { useState, useCallback } from 'react';

interface Position {
    left: number;
    top: number;
}

interface Constraints {
    maxWidth?: number;
    maxHeight?: number;
    elementWidth?: number;
    elementHeight?: number;
}

export const usePosition = (initialPosition: Position) => {
    const [position, setPosition] = useState<Position>(initialPosition);

    const updatePosition = useCallback((newPosition: Partial<Position>) => {
        setPosition(prev => ({ ...prev, ...newPosition }));
    }, []);

    const constrainPosition = useCallback((pos: Position, constraints: Constraints) => {
        const {
            maxWidth = window.innerWidth,
            maxHeight = window.innerHeight,
            elementWidth = 0,
            elementHeight = 0
        } = constraints;

        return {
            left: Math.max(0, Math.min(pos.left, maxWidth - elementWidth)),
            top: Math.max(0, Math.min(pos.top, maxHeight - elementHeight))
        };
    }, []);

    return [position, updatePosition, constrainPosition] as const;
};