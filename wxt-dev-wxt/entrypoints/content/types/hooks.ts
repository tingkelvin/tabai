// Hook return types

import type { Position, PositionConstraints } from './dom';

export type UsePositionReturn = readonly [
    Position,
    (newPosition: Partial<Position>) => void,
    (pos: Position, constraints: PositionConstraints) => Position
]; 