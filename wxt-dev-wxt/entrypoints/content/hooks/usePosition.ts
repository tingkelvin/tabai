// hooks/usePosition.ts
import { useState, useCallback } from 'react';

// Types
interface Position {
    left: number;
    top: number;
}

interface PositionConstraints {
    maxWidth?: number;
    maxHeight?: number;
    elementWidth?: number;
    elementHeight?: number;
}

type UpdatePositionFunction = (newPosition: Partial<Position>) => void;
type ConstrainPositionFunction = (pos: Position, constraints: PositionConstraints) => Position;

type UsePositionReturn = [Position, UpdatePositionFunction, ConstrainPositionFunction];

export const usePosition = (initialPosition: Position): UsePositionReturn => {
    const [position, setPosition] = useState<Position>(initialPosition);

    const updatePosition = useCallback<UpdatePositionFunction>((newPosition: Partial<Position>): void => {
        setPosition(prev => ({ ...prev, ...newPosition }));
    }, []);

    const constrainPosition = useCallback<ConstrainPositionFunction>((
        pos: Position,
        constraints: PositionConstraints
    ): Position => {
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

    return [position, updatePosition, constrainPosition];
};