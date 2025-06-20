// hooks/usePosition.ts
import { useState, useCallback } from 'react';

interface Position {
    left: number;
    top: number;
}

interface ConstrainOptions {
    elementWidth: number;
    elementHeight: number;
}

export const usePosition = (initialPosition: Position) => {
    const [position, setPosition] = useState<Position>(initialPosition);

    const updatePosition = useCallback((newPosition: Partial<Position>) => {
        console.log('Updating position:', { current: position, new: newPosition });

        setPosition(prevPosition => {
            const updatedPosition = {
                ...prevPosition,
                ...newPosition
            };

            console.log('Position updated:', { from: prevPosition, to: updatedPosition });
            return updatedPosition;
        });
    }, [position]);

    const constrainPosition = useCallback((
        targetPosition: Position,
        options: ConstrainOptions
    ): Position => {
        const { elementWidth, elementHeight } = options;

        const maxLeft = Math.max(0, window.innerWidth - elementWidth);
        const maxTop = Math.max(0, window.innerHeight - elementHeight);

        const constrainedPosition = {
            left: Math.max(0, Math.min(targetPosition.left, maxLeft)),
            top: Math.max(0, Math.min(targetPosition.top, maxTop))
        };

        console.log('Constraining position:', {
            target: targetPosition,
            options,
            viewport: { width: window.innerWidth, height: window.innerHeight },
            maxBounds: { maxLeft, maxTop },
            result: constrainedPosition
        });

        return constrainedPosition;
    }, []);

    return [position, updatePosition, constrainPosition] as const;
};