import { useRef, useCallback, useState, useEffect } from 'react'
import type { Position } from '../types'
import { calculateInitialPositions } from '../utils/helper'
import { WIDGET_CONFIG } from '../utils/constant'

interface UseDragOptions {
    onDragEnd?: (position: Position) => void
    widgetSize?: { width: number; height: number }
}

export const useDrag = (
    elementRef: React.RefObject<HTMLElement | null>,
    options: UseDragOptions = {}
) => {
    const {
        onDragEnd,
        widgetSize = {
            width: WIDGET_CONFIG.DEFAULT_WIDTH,
            height: WIDGET_CONFIG.DEFAULT_HEIGHT,
        },
    } = options

    const isDragging = useRef(false)
    const hasDragged = useRef(false)
    const dragState = useRef({ startX: 0, startY: 0, elementX: 0, elementY: 0 })
    const animationFrameId = useRef<number | null>(null)

    // Manage minimized state and positions
    const [isMinimized, setIsMinimized] = useState<boolean>(true)

    // Separate positions for icon and widget
    const initialPosition = calculateInitialPositions().iconPosition
    const [iconPosition, setIconPosition] = useState<Position>(initialPosition)
    const [widgetPosition, setWidgetPosition] =
        useState<Position>(initialPosition)

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

    const handleMouseMove = useCallback(
        (e: MouseEvent) => {
            if (!isDragging.current || !elementRef.current) return

            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current)
            }

            animationFrameId.current = requestAnimationFrame(() => {
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
            })
        },
        [elementRef, updateElementPosition]
    )

    const handleMouseUp = useCallback(
        (e: MouseEvent) => {
            if (!isDragging.current) return

            isDragging.current = false

            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current)
                animationFrameId.current = null
            }

            elementRef.current?.classList.remove('dragging')

            if (elementRef.current) {
                const transform = getComputedStyle(elementRef.current).transform
                let finalX = 0,
                    finalY = 0

                if (transform && transform !== 'none') {
                    const matrix = new DOMMatrix(transform)
                    finalX = matrix.m41
                    finalY = matrix.m42
                }

                const finalPosition = { left: finalX, top: finalY }

                // Update the appropriate position state
                isMinimized
                    ? setIconPosition(finalPosition)
                    : setWidgetPosition(finalPosition)

                onDragEnd?.(finalPosition)
            }

            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)

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
        },
        [elementRef, handleMouseMove, handleMouseUp]
    )

    const handleToggle = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation()
            if (hasDragged.current) return

            if (isMinimized) {
                // Calculate widget position based on current icon location
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

    return {
        handleMouseDown,
        handleToggle,
        isDragging: isDragging.current,
        hasDragged: hasDragged.current,
        isMinimized,
        currentPosition,
        iconPosition,
        widgetPosition,
    }
}
