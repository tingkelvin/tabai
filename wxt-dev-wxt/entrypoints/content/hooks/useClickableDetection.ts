import { useState, useEffect, useCallback, useRef } from 'react'

// Type definitions
interface ClickableDetectionOptions {
    autoDetect?: boolean
    highlightColor?: string
    showLabels?: boolean
    watchForDynamicContent?: boolean
    detectCustomClickables?: boolean
    includeDisabled?: boolean
    minClickableSize?: number
    highlightFirstOnly?: boolean
    highlightCount?: number
}

interface ClickableElementInfo {
    element: HTMLElement
    type: 'button' | 'link' | 'input' | 'select' | 'textarea' | 'custom' | 'image' | 'area'
    subtype?: string
    text?: string
    href?: string
    title?: string
    ariaLabel?: string
    id?: string
    className?: string
    isDisabled: boolean
    hasClickHandler: boolean
    isInteractive: boolean
    boundingRect: DOMRect
}

interface ClickableDetectionResults {
    clickableElements: HTMLElement[]
    clickableInfos: ClickableElementInfo[]
    totalCount: number
    byType: Record<string, number>
}

interface UseClickableDetectionReturn {
    // State
    isHighlighting: boolean
    totalCount: number
    byType: Record<string, number>

    // Actions
    highlightClickables: () => void
    removeHighlights: () => void
    toggleHighlight: () => void
    detectClickables: () => ClickableDetectionResults
    refreshDetection: () => void

    // Additional data
    getClickableDetails: () => ClickableElementInfo[]
    getClickablesByType: (type: string) => ClickableElementInfo[]
}

const useClickableDetection = (options: ClickableDetectionOptions = {}): UseClickableDetectionReturn => {
    const {
        autoDetect = true,
        highlightColor = '#00ff00',
        showLabels = true,
        watchForDynamicContent = true,
        detectCustomClickables = true,
        includeDisabled = false,
        minClickableSize = 10,
        highlightFirstOnly = false,
        highlightCount = 1
    } = options

    const [isHighlighting, setIsHighlighting] = useState<boolean>(false)
    const [totalCount, setTotalCount] = useState<number>(0)
    const [byType, setByType] = useState<Record<string, number>>({})
    const observerRef = useRef<MutationObserver | null>(null)
    const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const isDetectingRef = useRef<boolean>(false)

    // Helper function to check if element has click handlers
    const hasClickHandlers = useCallback((element: HTMLElement): boolean => {
        // Check for common click event indicators
        const hasOnClick = element.onclick !== null
        const hasEventListeners = (element as any)._listeners ||
            (element as any).__reactEventHandlers ||
            element.hasAttribute('onclick')

        // Check for cursor pointer style
        const computedStyle = window.getComputedStyle(element)
        const hasCursorPointer = computedStyle.cursor === 'pointer'

        return hasOnClick || hasEventListeners || hasCursorPointer
    }, [])

    // Helper function to get element text content
    const getElementText = useCallback((element: HTMLElement): string => {
        // For specific elements, get appropriate text
        if (element.tagName === 'IMG') {
            return element.getAttribute('alt') || element.getAttribute('title') || ''
        }
        if (element.tagName === 'INPUT') {
            const input = element as HTMLInputElement
            return input.value || input.placeholder || input.getAttribute('aria-label') || ''
        }

        // Get visible text content, truncated
        const text = element.textContent?.trim() || ''
        return text.length > 30 ? text.substring(0, 30) + '...' : text
    }, [])

    // Helper function to determine element type and subtype
    const getElementTypeInfo = useCallback((element: HTMLElement): { type: ClickableElementInfo['type'], subtype?: string } => {
        const tagName = element.tagName.toLowerCase()

        switch (tagName) {
            case 'button':
                return { type: 'button', subtype: (element as HTMLButtonElement).type || 'button' }
            case 'a':
                return { type: 'link', subtype: (element as HTMLAnchorElement).href ? 'external' : 'anchor' }
            case 'input':
                return { type: 'input', subtype: (element as HTMLInputElement).type || 'text' }
            case 'select':
                return { type: 'select' }
            case 'textarea':
                return { type: 'textarea' }
            case 'img':
                return { type: 'image', subtype: element.hasAttribute('onclick') || hasClickHandlers(element) ? 'clickable' : 'static' }
            case 'area':
                return { type: 'area' }
            default:
                return { type: 'custom', subtype: tagName }
        }
    }, [hasClickHandlers])

    // Helper function to get detailed element information
    const getElementInfo = useCallback((element: HTMLElement): ClickableElementInfo => {
        const { type, subtype } = getElementTypeInfo(element)
        const text = getElementText(element)
        const rect = element.getBoundingClientRect()

        const isDisabled = element.hasAttribute('disabled') ||
            element.getAttribute('aria-disabled') === 'true' ||
            window.getComputedStyle(element).pointerEvents === 'none'

        const hasClickHandler = hasClickHandlers(element)
        const isInteractive = element.tabIndex >= 0 ||
            ['button', 'a', 'input', 'select', 'textarea'].includes(element.tagName.toLowerCase()) ||
            element.hasAttribute('role') && ['button', 'link', 'tab', 'menuitem'].includes(element.getAttribute('role') || '')

        return {
            element,
            type,
            subtype,
            text,
            href: (element as HTMLAnchorElement).href || undefined,
            title: element.title || undefined,
            ariaLabel: element.getAttribute('aria-label') || undefined,
            id: element.id || undefined,
            className: element.className || undefined,
            isDisabled,
            hasClickHandler,
            isInteractive,
            boundingRect: rect
        }
    }, [getElementTypeInfo, getElementText, hasClickHandlers])

    // Helper function to check if element is a child of a button or anchor
    const isChildOfButtonOrAnchor = useCallback((element: HTMLElement): boolean => {
        let parent = element.parentElement
        while (parent) {
            if (parent.tagName === 'BUTTON' || parent.tagName === 'A') {
                return true
            }
            parent = parent.parentElement
        }
        return false
    }, [])

    // Function to find all clickable elements
    const findClickableElements = useCallback((): HTMLElement[] => {
        const clickableElements: HTMLElement[] = []
        const processedElements = new Set<HTMLElement>()

        // Standard clickable elements
        const standardSelectors = [
            'a',
            'button',
            'input[type="button"]',
            'input[type="submit"]',
            'input[type="reset"]',
            '[onclick]',
            '[role="button"]',
            '[tabindex]:not([tabindex="-1"])',
            'select',
            'textarea',
            'input:not([type="hidden"])',
            '[contenteditable="true"]'
        ]

        // First, find all buttons, anchors, and forms to mark their children as processed
        const interactiveContainers = document.querySelectorAll<HTMLElement>('button, a, form')
        interactiveContainers.forEach(parentEl => {
            // For forms, don't exclude the direct interactive children (input, select, etc.)
            if (parentEl.tagName === 'FORM') {
                // Only exclude non-interactive children of forms
                const children = parentEl.querySelectorAll<HTMLElement>('*:not(input):not(select):not(textarea):not(button)')
                children.forEach(child => processedElements.add(child))
            } else if (parentEl.tagName === 'A' || parentEl.tagName === 'BUTTON') {
                // For buttons and anchors, exclude all children including nested buttons
                const children = parentEl.querySelectorAll<HTMLElement>('*')
                children.forEach(child => processedElements.add(child))
            }
        })

        // Add standard clickable elements
        standardSelectors.forEach(selector => {
            const elements = document.querySelectorAll<HTMLElement>(selector)
            elements.forEach(el => {
                if (!processedElements.has(el) && (includeDisabled || !el.hasAttribute('disabled'))) {
                    const rect = el.getBoundingClientRect()
                    if (rect.width >= minClickableSize && rect.height >= minClickableSize) {
                        clickableElements.push(el)
                        processedElements.add(el)
                    }
                }
            })
        })

        // Detect custom clickable elements if enabled
        if (detectCustomClickables) {
            const allElements = document.querySelectorAll<HTMLElement>('*')
            allElements.forEach(el => {
                // Skip if already processed
                if (processedElements.has(el)) return

                // Skip if it's a child of button or anchor
                if (isChildOfButtonOrAnchor(el)) return

                // Check for click indicators
                if (hasClickHandlers(el) || window.getComputedStyle(el).cursor === 'pointer') {
                    const rect = el.getBoundingClientRect()
                    if (rect.width >= minClickableSize && rect.height >= minClickableSize) {
                        clickableElements.push(el)
                        processedElements.add(el)
                    }
                }
            })
        }

        return clickableElements.sort((a, b) => {
            const rectA = a.getBoundingClientRect()
            const rectB = b.getBoundingClientRect()

            // Sort by top position first, then by left position
            if (Math.abs(rectA.top - rectB.top) < 5) {
                // Elements are on roughly the same row, sort by left position
                return rectA.left - rectB.left
            }
            // Sort by top position (top to bottom)
            return rectA.top - rectB.top
        })
    }, [includeDisabled, minClickableSize, detectCustomClickables, hasClickHandlers, isChildOfButtonOrAnchor])

    // Function to highlight all clickable elements
    const highlightClickables = useCallback((): void => {
        // Prevent multiple simultaneous detections
        if (isDetectingRef.current) {
            console.log('Detection already in progress, skipping...')
            return
        }

        isDetectingRef.current = true
        removeHighlights()

        const clickableElements = findClickableElements()
        const typeCount: Record<string, number> = {}

        // Determine how many elements to highlight
        const countToHighlight = highlightFirstOnly ? highlightCount : clickableElements.length
        const elementsToHighlight = clickableElements.slice(0, countToHighlight)

        console.log(`Found ${clickableElements.length} clickable elements${highlightFirstOnly ? `, highlighting first ${Math.min(countToHighlight, clickableElements.length)}` : ''}`)
        setTotalCount(clickableElements.length) // Always show total count

        elementsToHighlight.forEach((element: HTMLElement, index: number) => {
            const elementInfo = getElementInfo(element)
            const typeKey = elementInfo.subtype ? `${elementInfo.type}-${elementInfo.subtype}` : elementInfo.type

            // Count by type (count all elements, not just highlighted ones)
            clickableElements.forEach(el => {
                const info = getElementInfo(el)
                const key = info.subtype ? `${info.type}-${info.subtype}` : info.type
                typeCount[key] = (typeCount[key] || 0) + 1
            })

            // Add highlight styling
            element.style.outline = `2px solid ${highlightColor}`
            element.style.outlineOffset = '2px'
            element.style.backgroundColor = `${highlightColor}20`
            element.style.position = 'relative'
            element.classList.add('extension-clickable-highlight')

            // Add label inside the element if enabled
            if (showLabels) {
                const label = document.createElement('div')
                label.textContent = `C${index + 1}`
                label.style.cssText = `
          position: absolute;
          top: 2px;
          left: 2px;
          background: ${highlightColor};
          color: black;
          padding: 2px 6px;
          font-size: 11px;
          font-family: Arial, sans-serif;
          font-weight: bold;
          border-radius: 3px;
          z-index: 10001;
          pointer-events: none;
          border: 1px solid black;
          box-shadow: 0 2px 4px rgba(0,0,0,0.5);
          min-width: 20px;
          text-align: center;
        `
                label.classList.add('extension-clickable-label')

                // Insert label into the element
                element.appendChild(label)
            }
        })

        setByType(typeCount)
        setIsHighlighting(true)
        isDetectingRef.current = false
    }, [findClickableElements, getElementInfo, highlightColor, showLabels, highlightFirstOnly, highlightCount])

    // Function to remove all highlights
    const removeHighlights = useCallback((): void => {
        const highlightedElements = document.querySelectorAll<HTMLElement>('.extension-clickable-highlight')
        highlightedElements.forEach((element: HTMLElement) => {
            element.style.outline = ''
            element.style.outlineOffset = ''
            element.style.backgroundColor = ''
            element.classList.remove('extension-clickable-highlight')
        })

        const labels = document.querySelectorAll<HTMLElement>('.extension-clickable-label')
        labels.forEach((label: HTMLElement) => label.remove())

        setIsHighlighting(false)
        setTotalCount(0)
        setByType({})
        isDetectingRef.current = false
    }, [])

    // Function to toggle highlighting
    const toggleHighlight = useCallback((): void => {
        if (isHighlighting) {
            removeHighlights()
        } else {
            highlightClickables()
        }
    }, [isHighlighting, removeHighlights, highlightClickables])

    // Function to detect clickables without highlighting
    const detectClickables = useCallback((): ClickableDetectionResults => {
        const clickableElements = findClickableElements()
        const clickableInfos = clickableElements.map(el => getElementInfo(el))
        const typeCount: Record<string, number> = {}

        clickableInfos.forEach(info => {
            const typeKey = info.subtype ? `${info.type}-${info.subtype}` : info.type
            typeCount[typeKey] = (typeCount[typeKey] || 0) + 1
        })

        return {
            clickableElements,
            clickableInfos,
            totalCount: clickableElements.length,
            byType: typeCount
        }
    }, [findClickableElements, getElementInfo])

    // Get detailed clickable information
    const getClickableDetails = useCallback((): ClickableElementInfo[] => {
        const clickableElements = findClickableElements()
        return clickableElements.map(el => getElementInfo(el))
    }, [findClickableElements, getElementInfo])

    // Get clickables by type
    const getClickablesByType = useCallback((type: string): ClickableElementInfo[] => {
        const allClickables = getClickableDetails()
        return allClickables.filter(info =>
            info.type === type ||
            `${info.type}-${info.subtype}` === type
        )
    }, [getClickableDetails])

    // Refresh detection (alias for highlightClickables)
    const refreshDetection = useCallback((): void => {
        highlightClickables()
    }, [highlightClickables])

    // Setup mutation observer for dynamic content
    useEffect(() => {
        if (!watchForDynamicContent) return

        const observer = new MutationObserver((mutations: MutationRecord[]) => {
            let shouldRerun = false
            let significantChange = false

            mutations.forEach((mutation: MutationRecord) => {
                if (mutation.type === 'childList') {
                    // Only trigger for significant DOM changes
                    mutation.addedNodes.forEach((node: Node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const element = node as Element
                            // Check if added element is likely to contain clickable elements
                            if (element.tagName &&
                                (element.querySelector('button, a, input, [onclick]') ||
                                    ['BUTTON', 'A', 'INPUT', 'SELECT'].includes(element.tagName))) {
                                significantChange = true
                            }
                        }
                    })
                } else if (mutation.type === 'attributes') {
                    // Only for clickability-affecting attributes
                    const relevantAttributes = ['onclick', 'href', 'disabled', 'role']
                    if (relevantAttributes.includes(mutation.attributeName || '')) {
                        significantChange = true
                    }
                }
            })

            // Only rerun if there's a significant change and we're currently highlighting
            if (significantChange && isHighlighting && !isDetectingRef.current) {
                shouldRerun = true
            }

            if (shouldRerun) {
                // Clear existing timeout
                if (highlightTimeoutRef.current) {
                    clearTimeout(highlightTimeoutRef.current)
                }

                // Debounce with longer delay to prevent excessive runs
                highlightTimeoutRef.current = setTimeout(() => {
                    console.log('DOM change detected, refreshing clickable detection...')
                    highlightClickables()
                }, 500) // Increased delay
            }
        })

        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['onclick', 'href', 'disabled', 'role']
            })
        }

        observerRef.current = observer

        return () => {
            observer.disconnect()
            if (highlightTimeoutRef.current) {
                clearTimeout(highlightTimeoutRef.current)
            }
        }
    }, [watchForDynamicContent, isHighlighting, highlightClickables])

    // Auto-detect on mount if enabled
    useEffect(() => {
        if (autoDetect) {
            if (document.readyState === 'loading') {
                const handleDOMContentLoaded = (): void => {
                    highlightClickables()
                    document.removeEventListener('DOMContentLoaded', handleDOMContentLoaded)
                }
                document.addEventListener('DOMContentLoaded', handleDOMContentLoaded)

                return () => {
                    document.removeEventListener('DOMContentLoaded', handleDOMContentLoaded)
                }
            } else {
                highlightClickables()
            }
        }
    }, [autoDetect, highlightClickables])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            removeHighlights()
            if (observerRef.current) {
                observerRef.current.disconnect()
            }
            if (highlightTimeoutRef.current) {
                clearTimeout(highlightTimeoutRef.current)
            }
        }
    }, [removeHighlights])

    return {
        // State
        isHighlighting,
        totalCount,
        byType,

        // Actions
        highlightClickables,
        removeHighlights,
        toggleHighlight,
        detectClickables,
        refreshDetection,

        // Additional data
        getClickableDetails,
        getClickablesByType
    }
}

export default useClickableDetection