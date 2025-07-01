import React from 'react'
import { RESIZE_TYPES } from '../utils/constant'

type ResizeType = typeof RESIZE_TYPES[keyof typeof RESIZE_TYPES]

interface ResizeHandleProps {
    type: ResizeType
    onMouseDown: (e: React.MouseEvent, type: ResizeType) => void
    className?: string
}

const ResizeHandle: React.FC<ResizeHandleProps> = ({
    type,
    onMouseDown,
    className = ''
}) => {
    const handleMouseDown = (e: React.MouseEvent) => {
        onMouseDown(e, type)
    }

    const getCursor = (type: ResizeType): string => {
        switch (type) {
            case RESIZE_TYPES.SOUTHEAST:
                return 'nw-resize'
            case RESIZE_TYPES.SOUTHWEST:
                return 'ne-resize'
            case RESIZE_TYPES.NORTHEAST:
                return 'sw-resize'
            case RESIZE_TYPES.NORTHWEST:
                return 'se-resize'
            default:
                return 'default'
        }
    }

    return (
        <div
            className={`${className}`
            }
            onMouseDown={handleMouseDown}
            style={{
                position: 'absolute',
                width: '10px',
                height: '10px',
                cursor: getCursor(type),
                zIndex: 10,
                ...getPositionStyles(type)
            }}
        />
    )
}

const getPositionStyles = (type: ResizeType): React.CSSProperties => {
    switch (type) {
        case RESIZE_TYPES.SOUTHEAST:
            return { bottom: '0', right: '0' }
        case RESIZE_TYPES.SOUTHWEST:
            return { bottom: '0', left: '0' }
        case RESIZE_TYPES.NORTHEAST:
            return { top: '0', right: '0' }
        case RESIZE_TYPES.NORTHWEST:
            return { top: '0', left: '0' }
        default:
            return {}
    }
}

export default ResizeHandle