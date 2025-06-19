import { useRef, useCallback } from 'react'
import type { Position } from '../types'

export const useDrag = (
    elementRef: React.RefObject<HTMLElement | null>,
    onDragEnd?: (position: Position) => void
) => {
    const isDragging = useRef(false)
    const hasDragged = useRef(false)
    const dragState = useRef({ startX: 0, startY: 0, elementX: 0, elementY: 0 })
    const animationFrameId = useRef<number | null>(null)

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

            if (elementRef.current && onDragEnd) {
                const computedStyle = getComputedStyle(elementRef.current)
                const transform = computedStyle.transform
                let finalX = 0,
                    finalY = 0

                if (transform && transform !== 'none') {
                    const matrix = new DOMMatrix(transform)
                    finalX = matrix.m41
                    finalY = matrix.m42
                }

                onDragEnd({ left: finalX, top: finalY })
            }

            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)

            setTimeout(() => {
                hasDragged.current = false
            }, 10)
        },
        [elementRef, onDragEnd, handleMouseMove]
    )

    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            if (!elementRef.current) return

            e.preventDefault()
            e.stopPropagation()

            isDragging.current = true
            hasDragged.current = false

            const computedStyle = getComputedStyle(elementRef.current)
            const transform = computedStyle.transform
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

    return {
        handleMouseDown,
        isDragging: isDragging.current,
        hasDragged: hasDragged.current,
    }
}
