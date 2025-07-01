import { useRef, useCallback } from 'react'

interface UseResizeOptions {
    widgetSize: { width: number; height: number }
    setWidgetSize: (size: { width: number; height: number }) => void
    minWidth?: number
    minHeight?: number
    maxWidth?: number
    maxHeight?: number
}

export const useResize = (
    elementRef: React.RefObject<HTMLElement | null>,
    options: UseResizeOptions
) => {
    const {
        widgetSize,
        setWidgetSize,
        minWidth = 200,
        minHeight = 150,
        maxWidth = window.innerWidth * 0.9,
        maxHeight = window.innerHeight * 0.9,
    } = options

    const isResizing = useRef(false)
    const resizeState = useRef({
        startX: 0,
        startY: 0,
        startWidth: 0,
        startHeight: 0,
        direction: '',
    })

    const constrainSize = useCallback(
        (width: number, height: number) => {
            const constrainedWidth = Math.max(
                minWidth,
                Math.min(maxWidth, width)
            )
            const constrainedHeight = Math.max(
                minHeight,
                Math.min(maxHeight, height)
            )
            return { width: constrainedWidth, height: constrainedHeight }
        },
        [minWidth, minHeight, maxWidth, maxHeight]
    )

    const handleMouseMove = useCallback(
        (e: MouseEvent) => {
            if (!isResizing.current || !elementRef.current) return

            const { startX, startY, startWidth, startHeight, direction } =
                resizeState.current
            const deltaX = e.clientX - startX
            const deltaY = e.clientY - startY

            let newWidth = startWidth
            let newHeight = startHeight

            // Handle different resize directions
            switch (direction) {
                case 'n':
                    newHeight = startHeight - deltaY
                    break
                case 's':
                    newHeight = startHeight + deltaY
                    break
                case 'e':
                    newWidth = startWidth + deltaX
                    break
                case 'w':
                    newWidth = startWidth - deltaX
                    break
                case 'ne':
                    newWidth = startWidth + deltaX
                    newHeight = startHeight - deltaY
                    break
                case 'nw':
                    newWidth = startWidth - deltaX
                    newHeight = startHeight - deltaY
                    break
                case 'se':
                    newWidth = startWidth + deltaX
                    newHeight = startHeight + deltaY
                    break
                case 'sw':
                    newWidth = startWidth - deltaX
                    newHeight = startHeight + deltaY
                    break
            }

            const constrainedSize = constrainSize(newWidth, newHeight)

            // Update the widget size immediately for smooth resizing
            setWidgetSize(constrainedSize)

            // Handle position adjustment for north and west resizes
            if (direction.includes('n') || direction.includes('w')) {
                const transform = getComputedStyle(elementRef.current).transform
                let currentX = 0,
                    currentY = 0

                if (transform && transform !== 'none') {
                    const matrix = new DOMMatrix(transform)
                    currentX = matrix.m41
                    currentY = matrix.m42
                }

                let newX = currentX
                let newY = currentY

                if (direction.includes('w')) {
                    newX = currentX - (constrainedSize.width - startWidth)
                }
                if (direction.includes('n')) {
                    newY = currentY - (constrainedSize.height - startHeight)
                }

                elementRef.current.style.transform = `translate(${newX}px, ${newY}px)`
            }
        },
        [elementRef, constrainSize, setWidgetSize]
    )

    const handleMouseUp = useCallback(() => {
        if (!isResizing.current) return

        isResizing.current = false
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)

        // Remove resizing cursor from body
        document.body.style.cursor = ''
        document.body.classList.remove('resizing')
    }, [handleMouseMove])

    const createResizeHandler = useCallback(
        (direction: string) => (e: React.MouseEvent) => {
            if (!elementRef.current) return

            e.preventDefault()
            e.stopPropagation()

            isResizing.current = true

            resizeState.current = {
                startX: e.clientX,
                startY: e.clientY,
                startWidth: widgetSize.width,
                startHeight: widgetSize.height,
                direction,
            }

            // Set appropriate cursor
            const cursors: { [key: string]: string } = {
                n: 'n-resize',
                s: 's-resize',
                e: 'e-resize',
                w: 'w-resize',
                ne: 'ne-resize',
                nw: 'nw-resize',
                se: 'se-resize',
                sw: 'sw-resize',
            }

            document.body.style.cursor = cursors[direction]
            document.body.classList.add('resizing')

            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
        },
        [elementRef, widgetSize, handleMouseMove, handleMouseUp]
    )

    const resizeHandlers = {
        north: createResizeHandler('n'),
        south: createResizeHandler('s'),
        east: createResizeHandler('e'),
        west: createResizeHandler('w'),
        northeast: createResizeHandler('ne'),
        northwest: createResizeHandler('nw'),
        southeast: createResizeHandler('se'),
        southwest: createResizeHandler('sw'),
    }

    return {
        resizeHandlers,
        isResizing: isResizing.current,
    }
}
