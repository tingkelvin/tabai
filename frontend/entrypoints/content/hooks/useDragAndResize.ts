import { useRef, useCallback, useState, useEffect } from 'react'
import type { Position } from '../types'
import { calculateInitialPositions } from '../utils/helper'
import { WIDGET_CONFIG, RESIZE_TYPES } from '../utils/constant'

interface UseDragOptions {
    onDragEnd?: (position: Position) => void
    widgetSize?: { width: number; height: number }
    onSizeChange?: (size: { width: number; height: number }) => void
}

type ResizeType = typeof RESIZE_TYPES[keyof typeof RESIZE_TYPES]

export const useDragAndResize = (
    elementRef: React.RefObject<HTMLElement | null>,
    options: UseDragOptions = {}
) => {
    const {
        onDragEnd,
        widgetSize = {
            width: WIDGET_CONFIG.DEFAULT_WIDTH,
            height: WIDGET_CONFIG.DEFAULT_HEIGHT,
        },
        onSizeChange,
    } = options

    // Drag state
    const isDragging = useRef(false)
    const hasDragged = useRef(false)
    const dragState = useRef({ startX: 0, startY: 0, elementX: 0, elementY: 0 })

    // Resize state
    const isResizing = useRef(false)
    const resizeType = useRef<ResizeType>('')
    const resizeState = useRef({ startX: 0, startY: 0, startWidth: 0, startHeight: 0, startLeft: 0, startTop: 0 })

    const animationFrameId = useRef<number | null>(null)

    // Manage minimized state and positions
    const [isMinimized, setIsMinimized] = useState<boolean>(true)
    const [currentSize, setCurrentSize] = useState(widgetSize)

    // Separate positions for icon and widget
    const initialPosition = calculateInitialPositions().iconPosition
    const [iconPosition, setIconPosition] = useState<Position>(initialPosition)
    const [widgetPosition, setWidgetPosition] = useState<Position>(initialPosition)

    // Current position based on state
    const currentPosition = isMinimized ? iconPosition : widgetPosition

    const constrainPosition = useCallback(
        (x: number, y: number) => {
            if (!elementRef.current) return { x, y }

            const element = elementRef.current
            const rect = element.getBoundingClientRect()
            const screenWidth = window.innerWidth
            const screenHeight = window.innerHeight

            const constrainedX = Math.max(
                0,
                Math.min(screenWidth - rect.width, x)
            )
            const constrainedY = Math.max(
                0,
                Math.min(screenHeight - rect.height, y)
            )

            return { x: constrainedX, y: constrainedY }
        },
        [elementRef]
    )

    const updateElementPosition = useCallback(
        (x: number, y: number) => {
            if (!elementRef.current) return
            const { x: constrainedX, y: constrainedY } = constrainPosition(x, y)
            elementRef.current.style.transform = `translate(${constrainedX}px, ${constrainedY}px)`
        },
        [elementRef, constrainPosition]
    )

    const updateElementSize = useCallback(
        (width: number, height: number) => {
            if (!elementRef.current) return
            elementRef.current.style.width = `${width}px`
            elementRef.current.style.height = `${height}px`
        },
        [elementRef]
    )

    const handleResize = useCallback(
        (deltaX: number, deltaY: number) => {
            if (!elementRef.current) return

            const { startWidth, startHeight, startLeft, startTop } = resizeState.current
            let newWidth = startWidth
            let newHeight = startHeight
            let newLeft = startLeft
            let newTop = startTop

            switch (resizeType.current) {
                case RESIZE_TYPES.SOUTHEAST:
                    newWidth = Math.max(WIDGET_CONFIG.MIN_WIDTH, startWidth + deltaX)
                    newHeight = Math.max(WIDGET_CONFIG.MIN_HEIGHT, startHeight + deltaY)
                    break
                case RESIZE_TYPES.SOUTHWEST:
                    newWidth = Math.max(WIDGET_CONFIG.MIN_WIDTH, startWidth - deltaX)
                    newHeight = Math.max(WIDGET_CONFIG.MIN_HEIGHT, startHeight + deltaY)
                    if (newWidth !== startWidth) {
                        newLeft = Math.max(0, startLeft + (startWidth - newWidth))
                    }
                    break
                case RESIZE_TYPES.NORTHEAST:
                    newWidth = Math.max(WIDGET_CONFIG.MIN_WIDTH, startWidth + deltaX)
                    newHeight = Math.max(WIDGET_CONFIG.MIN_HEIGHT, startHeight - deltaY)
                    if (newHeight !== startHeight) {
                        newTop = Math.max(0, startTop + (startHeight - newHeight))
                    }
                    break
                case RESIZE_TYPES.NORTHWEST:
                    newWidth = Math.max(WIDGET_CONFIG.MIN_WIDTH, startWidth - deltaX)
                    newHeight = Math.max(WIDGET_CONFIG.MIN_HEIGHT, startHeight - deltaY)
                    if (newWidth !== startWidth) {
                        newLeft = Math.max(0, startLeft + (startWidth - newWidth))
                    }
                    if (newHeight !== startHeight) {
                        newTop = Math.max(0, startTop + (startHeight - newHeight))
                    }
                    break
            }

            // Ensure widget doesn't exceed viewport
            newWidth = Math.min(newWidth, window.innerWidth - newLeft)
            newHeight = Math.min(newHeight, window.innerHeight - newTop)

            // Update size and position
            updateElementSize(newWidth, newHeight)
            updateElementPosition(newLeft, newTop)

            // Update state
            setCurrentSize({ width: newWidth, height: newHeight })
            setWidgetPosition({ left: newLeft, top: newTop })

            // Notify parent of size change
            onSizeChange?.({ width: newWidth, height: newHeight })
        },
        [updateElementSize, updateElementPosition, onSizeChange]
    )

    const handleMouseMove = useCallback(
        (e: MouseEvent) => {
            if (!isDragging.current && !isResizing.current) return
            if (!elementRef.current) return

            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current)
            }

            animationFrameId.current = requestAnimationFrame(() => {
                if (isResizing.current) {
                    const deltaX = e.clientX - resizeState.current.startX
                    const deltaY = e.clientY - resizeState.current.startY
                    handleResize(deltaX, deltaY)
                } else if (isDragging.current) {
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
        [elementRef, updateElementPosition, handleResize]
    )

    const handleMouseUp = useCallback(
        (e: MouseEvent) => {
            if (!isDragging.current && !isResizing.current) return

            isDragging.current = false
            isResizing.current = false
            resizeType.current = ''

            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current)
                animationFrameId.current = null
            }

            elementRef.current?.classList.remove('dragging')
            elementRef.current?.classList.remove('resizing')

            if (elementRef.current && hasDragged.current) {
                const transform = getComputedStyle(elementRef.current).transform
                let finalX = 0,
                    finalY = 0

                if (transform && transform !== 'none') {
                    const matrix = new DOMMatrix(transform)
                    finalX = matrix.m41
                    finalY = matrix.m42
                }

                const finalPosition = { left: finalX, top: finalY }

                if (isMinimized) {
                    // Update icon position
                    setIconPosition(finalPosition)
                } else {
                    // Update widget position AND sync icon position for future minimize
                    setWidgetPosition(finalPosition)
                    // Calculate where the icon should be positioned relative to the widget
                    const iconX = Math.max(0, Math.min(finalX, window.innerWidth - WIDGET_CONFIG.ICON_SIZE))
                    const iconY = Math.max(0, Math.min(finalY, window.innerHeight - WIDGET_CONFIG.ICON_SIZE))
                    setIconPosition({ left: iconX, top: iconY })
                }

                onDragEnd?.(finalPosition)
            }

            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
            document.body.style.userSelect = ''

            setTimeout(() => {
                hasDragged.current = false
            }, 10)
        },
        [elementRef, onDragEnd, handleMouseMove, isMinimized]
    )

    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            if (!elementRef.current) return

            e.preventDefault()
            e.stopPropagation()

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
            document.body.style.userSelect = 'none'
        },
        [elementRef, handleMouseMove, handleMouseUp]
    )

    const startResize = useCallback(
        (e: React.MouseEvent, type: ResizeType) => {
            if (isMinimized || !elementRef.current) return

            e.preventDefault()
            e.stopPropagation()

            isResizing.current = true
            resizeType.current = type

            const rect = elementRef.current.getBoundingClientRect()
            const transform = getComputedStyle(elementRef.current).transform
            let currentX = 0, currentY = 0

            if (transform && transform !== 'none') {
                const matrix = new DOMMatrix(transform)
                currentX = matrix.m41
                currentY = matrix.m42
            }

            resizeState.current = {
                startX: e.clientX,
                startY: e.clientY,
                startWidth: rect.width,
                startHeight: rect.height,
                startLeft: currentX,
                startTop: currentY,
            }

            elementRef.current.classList.add('resizing')

            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
            document.body.style.userSelect = 'none'
        },
        [elementRef, handleMouseMove, handleMouseUp, isMinimized]
    )

    const handleToggle = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation()
            if (hasDragged.current) return

            if (isMinimized) {
                // Calculate widget position based on current icon location
                const { innerWidth: screenWidth, innerHeight: screenHeight } =
                    window
                const widgetTop = iconPosition.top;
                const widgetLeft = iconPosition.left - widgetSize.width + WIDGET_CONFIG.ICON_SIZE;

                setWidgetPosition({
                    left: Math.max(
                        0,
                        Math.min(screenWidth - currentSize.width, widgetLeft)
                    ),
                    top: Math.max(
                        0,
                        Math.min(screenHeight - currentSize.height, widgetTop)
                    ),
                })
            }

            setIsMinimized(!isMinimized)
        },
        [isMinimized, iconPosition, currentSize]
    )

    // Update DOM position when position state changes
    useEffect(() => {
        if (elementRef.current && !isDragging.current && !isResizing.current) {
            elementRef.current.style.transform = `translate(${currentPosition.left}px, ${currentPosition.top}px)`
        }
    }, [currentPosition])

    // Update DOM size when size state changes
    useEffect(() => {
        if (elementRef.current && !isMinimized && !isResizing.current) {
            elementRef.current.style.width = `${currentSize.width}px`
            elementRef.current.style.height = `${currentSize.height}px`
        }
    }, [currentSize, isMinimized])

    return {
        handleMouseDown,
        handleToggle,
        startResize,
        isDragging: isDragging.current,
        isResizing: isResizing.current,
        isMinimized,
        setIsMinimized,
        setIconPosition,
        currentPosition,
        iconPosition,
        widgetPosition,
        currentSize,
        hasDragged: hasDragged.current,
    }
}