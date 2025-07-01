import { useRef, useCallback, useState, useEffect } from 'react'
import type { Position } from '../types'
import { calculateInitialPositions } from '../utils/helper'
import { WIDGET_CONFIG } from '../utils/constant'

interface UseDragResizeOptions {
    onDragEnd?: (position: Position) => void
    widgetSize: { width: number; height: number }
    setWidgetSize: (size: { width: number; height: number }) => void
    minWidth?: number
    minHeight?: number
    maxWidth?: number
    maxHeight?: number
}

export const useDragResize = (
    elementRef: React.RefObject<HTMLElement | null>,
    options: UseDragResizeOptions
) => {
    const {
        onDragEnd,
        widgetSize,
        setWidgetSize,
        minWidth = 200,
        minHeight = 150,
        maxWidth = window.innerWidth * 0.9,
        maxHeight = window.innerHeight * 0.9,
    } = options

    // Interaction lock to prevent conflicts
    const interactionLock = useRef<'drag' | 'resize' | null>(null)

    // Drag state
    const isDragging = useRef(false)
    const hasDragged = useRef(false)
    const dragState = useRef({ startX: 0, startY: 0, elementX: 0, elementY: 0 })

    // Resize state
    const isResizing = useRef(false)
    const resizeState = useRef({
        startX: 0,
        startY: 0,
        startWidth: 0,
        startHeight: 0,
        direction: '',
    })

    const animationFrameId = useRef<number | null>(null)

    // Position state
    const [isMinimized, setIsMinimized] = useState<boolean>(true)
    const initialPosition = calculateInitialPositions().iconPosition
    const [iconPosition, setIconPosition] = useState<Position>(initialPosition)
    const [widgetPosition, setWidgetPosition] =
        useState<Position>(initialPosition)
    const currentPosition = isMinimized ? iconPosition : widgetPosition

    const constrainPosition = useCallback(
        (x: number, y: number) => {
            if (!elementRef.current) return { x, y }
            const rect = elementRef.current.getBoundingClientRect()
            const constrainedX = Math.max(
                0,
                Math.min(window.innerWidth - rect.width, x)
            )
            const constrainedY = Math.max(
                0,
                Math.min(window.innerHeight - rect.height, y)
            )
            return { x: constrainedX, y: constrainedY }
        },
        [elementRef]
    )

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

    const updateElementPosition = useCallback(
        (x: number, y: number) => {
            if (!elementRef.current) return
            const { x: constrainedX, y: constrainedY } = constrainPosition(x, y)
            elementRef.current.style.transform = `translate(${constrainedX}px, ${constrainedY}px)`
        },
        [elementRef, constrainPosition]
    )

    const handleMouseMove = useCallback(
        (e: MouseEvent) => {
            if (!elementRef.current) return

            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current)
            }

            animationFrameId.current = requestAnimationFrame(() => {
                // Handle resizing FIRST - before checking dragging
                if (
                    isResizing.current &&
                    interactionLock.current === 'resize'
                ) {
                    const {
                        startX,
                        startY,
                        startWidth,
                        startHeight,
                        direction,
                    } = resizeState.current
                    const deltaX = e.clientX - startX
                    const deltaY = e.clientY - startY

                    let newWidth = startWidth
                    let newHeight = startHeight

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
                    setWidgetSize(constrainedSize)

                    // Adjust position for north/west resizes
                    if (direction.includes('n') || direction.includes('w')) {
                        const transform = getComputedStyle(
                            elementRef.current
                        ).transform
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
                            newX =
                                currentX - (constrainedSize.width - startWidth)
                        }
                        if (direction.includes('n')) {
                            newY =
                                currentY -
                                (constrainedSize.height - startHeight)
                        }

                        elementRef.current.style.transform = `translate(${newX}px, ${newY}px)`
                    }
                } else if (
                    isDragging.current &&
                    interactionLock.current === 'drag'
                ) {
                    // Handle dragging ONLY if not resizing
                    const deltaX = e.clientX - dragState.current.startX
                    const deltaY = e.clientY - dragState.current.startY
                    const newX = dragState.current.elementX + deltaX
                    const newY = dragState.current.elementY + deltaY

                    updateElementPosition(newX, newY)

                    if (
                        !hasDragged.current &&
                        (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3)
                    ) {
                        hasDragged.current = true
                        elementRef.current?.classList.add('dragging')
                    }
                }
            })
        },
        [elementRef, updateElementPosition, constrainSize, setWidgetSize]
    )

    const handleMouseUp = useCallback(
        (e: MouseEvent) => {
            if (!isDragging.current && !isResizing.current) return

            // Clear interaction lock
            interactionLock.current = null

            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current)
                animationFrameId.current = null
            }

            if (isDragging.current) {
                isDragging.current = false
                elementRef.current?.classList.remove('dragging')

                if (elementRef.current) {
                    const transform = getComputedStyle(
                        elementRef.current
                    ).transform
                    let finalX = 0,
                        finalY = 0

                    if (transform && transform !== 'none') {
                        const matrix = new DOMMatrix(transform)
                        finalX = matrix.m41
                        finalY = matrix.m42
                    }

                    const finalPosition = { left: finalX, top: finalY }
                    isMinimized
                        ? setIconPosition(finalPosition)
                        : setWidgetPosition(finalPosition)
                    onDragEnd?.(finalPosition)
                }

                setTimeout(() => {
                    hasDragged.current = false
                }, 10)
            }

            if (isResizing.current) {
                isResizing.current = false
                document.body.style.cursor = ''
                document.body.classList.remove('resizing')
            }

            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        },
        [elementRef, onDragEnd, handleMouseMove, isMinimized]
    )

    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            if (
                !elementRef.current ||
                isResizing.current ||
                interactionLock.current === 'resize'
            )
                return

            // Enhanced resize handle detection
            const target = e.target as HTMLElement
            if (
                target.classList.contains('resize-handle') ||
                target.closest('.resize-handle') ||
                target.hasAttribute('data-resize-handle')
            ) {
                return
            }

            e.preventDefault()
            e.stopPropagation()

            // Set interaction lock
            interactionLock.current = 'drag'
            isDragging.current = true
            hasDragged.current = false

            const transform = getComputedStyle(elementRef.current).transform
            let currentX = 0,
                currentY = 0

            if (transform && transform !== 'none') {
                const matrix = new DOMMatrix(transform)
                currentX = matrix.m41
                currentY = matrix.m42
            }

            dragState.current = {
                startX: e.clientX,
                startY: e.clientY,
                elementX: currentX,
                elementY: currentY,
            }

            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
        },
        [elementRef, handleMouseMove, handleMouseUp]
    )

    const createResizeHandler = useCallback(
        (direction: string) => (e: React.MouseEvent) => {
            if (
                !elementRef.current ||
                isDragging.current ||
                interactionLock.current === 'drag'
            )
                return

            e.preventDefault()
            e.stopPropagation()
            e.nativeEvent.stopImmediatePropagation()

            // Set interaction lock
            interactionLock.current = 'resize'
            isDragging.current = false
            isResizing.current = true

            resizeState.current = {
                startX: e.clientX,
                startY: e.clientY,
                startWidth: widgetSize.width,
                startHeight: widgetSize.height,
                direction,
            }

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

    const handleToggle = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation()
            if (hasDragged.current) return

            if (isMinimized) {
                const { innerWidth: screenWidth, innerHeight: screenHeight } =
                    window
                const isOnRightSide = iconPosition.left > screenWidth / 2
                const isOnBottomHalf = iconPosition.top > screenHeight / 2

                const widgetLeft = isOnRightSide
                    ? iconPosition.left -
                      widgetSize.width +
                      WIDGET_CONFIG.ICON_SIZE
                    : iconPosition.left

                const widgetTop = isOnBottomHalf
                    ? iconPosition.top -
                      widgetSize.height +
                      WIDGET_CONFIG.ICON_SIZE
                    : iconPosition.top

                setWidgetPosition({
                    left: Math.max(
                        0,
                        Math.min(screenWidth - widgetSize.width, widgetLeft)
                    ),
                    top: Math.max(
                        0,
                        Math.min(screenHeight - widgetSize.height, widgetTop)
                    ),
                })
            }

            setIsMinimized(!isMinimized)
        },
        [isMinimized, iconPosition, widgetSize]
    )

    // Update DOM position when position state changes
    useEffect(() => {
        if (elementRef.current) {
            elementRef.current.style.transform = `translate(${currentPosition.left}px, ${currentPosition.top}px)`
        }
    }, [currentPosition])

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
        handleMouseDown,
        handleToggle,
        resizeHandlers,
        isDragging: isDragging.current,
        isResizing: isResizing.current,
        isMinimized,
        currentPosition,
        iconPosition,
        widgetPosition,
    }
}
