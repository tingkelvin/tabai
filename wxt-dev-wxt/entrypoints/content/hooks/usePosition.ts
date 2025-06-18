// hooks/usePosition.ts
import { useState, useCallback } from 'react';
import type { Position, PositionConstraints, UsePositionReturn } from '../types';

export const usePosition = (initialPosition: Position): UsePositionReturn => {
    const [position, setPosition] = useState<Position>(initialPosition);

    const updatePosition = useCallback((newPosition: Partial<Position>): void => {
        setPosition(prev => ({ ...prev, ...newPosition }));
    }, []);

    const constrainPosition = useCallback((pos: Position, constraints: PositionConstraints): Position => {
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