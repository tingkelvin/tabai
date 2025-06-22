import { useState, useCallback, useEffect } from 'react'
import { ElementData } from './useDomTreewalker'

export interface HighlightOptions {
    borderColor?: string
    borderWidth?: string
    labelBgColor?: string
    labelTextColor?: string
    labelFontSize?: string
    zIndex?: number
}

interface ElementState {
    element: HTMLElement
    originalOutline: string
    originalOutlineOffset: string
    originalBackgroundColor: string
    originalPosition: string
    label?: HTMLElement
}

export const useClickableHighlighter = () => {
    const [highlightedElements, setHighlightedElements] = useState<ElementState[]>([])

    const defaultOptions: Required<HighlightOptions> = {
        borderColor: '#00ff00',
        borderWidth: '2px',
        labelBgColor: '#00ff00',
        labelTextColor: '#000000',
        labelFontSize: '11px',
        zIndex: 10000
    }

    const generateLabelText = (elementData: ElementData, index: number): string => {
        const parts: string[] = []

        parts.push(`[${index + 1}]`)
        parts.push(elementData.tagName.toLowerCase())

        if (elementData.id) {
            parts.push(`#${elementData.id}`)
        } else if (elementData.textContent) {
            const text = elementData.textContent.substring(0, 15)
            parts.push(`"${text}${elementData.textContent.length > 15 ? '...' : ''}"`)
        } else if (elementData.className) {
            const classes = elementData.className.split(' ').filter(c => c.length > 0)
            if (classes.length > 0) {
                parts.push(`.${classes[0]}`)
            }
        }

        return parts.join(' ')
    }

    const getElementFromXPath = (xpath: string): HTMLElement | null => {
        try {
            const result = document.evaluate(
                xpath,
                document,
                null,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null
            )
            return result.singleNodeValue as HTMLElement
        } catch (error) {
            console.error('Error evaluating XPath:', error)
            return null
        }
    }

    const createLabel = (element: HTMLElement, labelText: string, options: Required<HighlightOptions>): HTMLElement => {
        const label = document.createElement('div')
        label.textContent = labelText
        label.style.cssText = `
            position: absolute;
            top: 2px;
            left: 2px;
            background: ${options.labelBgColor};
            color: ${options.labelTextColor};
            padding: 2px 6px;
            font-size: ${options.labelFontSize};
            font-family: Arial, sans-serif;
            font-weight: bold;
            border-radius: 3px;
            z-index: ${options.zIndex + 1};
            pointer-events: none;
            border: 1px solid black;
            box-shadow: 0 2px 4px rgba(0,0,0,0.5);
            min-width: 20px;
            text-align: center;
        `
        label.classList.add('extension-clickable-label')

        element.appendChild(label)
        return label
    }

    const highlightElement = useCallback((elementData: ElementData, index: number, options: Required<HighlightOptions>): ElementState | null => {
        const element = getElementFromXPath(elementData.xpath)
        if (!element) return null

        // Store original styles
        const originalOutline = element.style.outline
        const originalOutlineOffset = element.style.outlineOffset
        const originalBackgroundColor = element.style.backgroundColor
        const originalPosition = element.style.position

        // Apply highlight styles (copying the method from the reference code)
        element.style.outline = `${options.borderWidth} solid ${options.borderColor}`
        element.style.outlineOffset = '2px'
        element.style.backgroundColor = `${options.borderColor}20` // 20% opacity
        element.style.position = 'relative'
        element.classList.add('extension-clickable-highlight')

        // Create and attach label
        const labelText = generateLabelText(elementData, index)
        const label = createLabel(element, labelText, options)

        return {
            element,
            originalOutline,
            originalOutlineOffset,
            originalBackgroundColor,
            originalPosition,
            label
        }
    }, [])

    const highlightClickables = useCallback((elements: ElementData[], options: HighlightOptions = {}) => {
        clearHighlights()
        const opts = { ...defaultOptions, ...options }

        const clickableElements = elements.filter(el => el.isClickable)
        const newHighlights: ElementState[] = []

        clickableElements.forEach((elementData, index) => {
            const elementState = highlightElement(elementData, index, opts)
            if (elementState) {
                newHighlights.push(elementState)
            }
        })

        setHighlightedElements(newHighlights)
    }, [highlightElement])

    const clearHighlights = useCallback(() => {
        highlightedElements.forEach(({ element, originalOutline, originalOutlineOffset, originalBackgroundColor, originalPosition, label }) => {
            if (element.isConnected) {
                // Restore original element styles
                element.style.outline = originalOutline
                element.style.outlineOffset = originalOutlineOffset
                element.style.backgroundColor = originalBackgroundColor
                element.style.position = originalPosition
                element.classList.remove('extension-clickable-highlight')

                // Remove label
                if (label && label.parentNode) {
                    label.parentNode.removeChild(label)
                }
            }
        })
        setHighlightedElements([])
    }, [highlightedElements])

    const highlightTemporarily = useCallback((elements: ElementData[], duration: number = 5000, options: HighlightOptions = {}) => {
        highlightClickables(elements, options)
        setTimeout(() => clearHighlights(), duration)
    }, [highlightClickables, clearHighlights])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            highlightedElements.forEach(({ element, originalOutline, originalOutlineOffset, originalBackgroundColor, originalPosition, label }) => {
                if (element.isConnected) {
                    element.style.outline = originalOutline
                    element.style.outlineOffset = originalOutlineOffset
                    element.style.backgroundColor = originalBackgroundColor
                    element.style.position = originalPosition
                    element.classList.remove('extension-clickable-highlight')
                    if (label && label.parentNode) {
                        label.parentNode.removeChild(label)
                    }
                }
            })
        }
    }, [])

    return {
        highlightClickables,
        clearHighlights,
        highlightTemporarily
    }
}