// Constants used across the content script

export const RESIZE_TYPES = {
    NORTHWEST: 'nw',
    NORTHEAST: 'ne',
    SOUTHWEST: 'sw',
    SOUTHEAST: 'se'
} as const;

export type ResizeType = typeof RESIZE_TYPES[keyof typeof RESIZE_TYPES]; 