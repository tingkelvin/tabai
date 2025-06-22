import { useState, useEffect, useCallback, useRef, useMemo } from 'react'

// Type definitions remain the same
interface ClickableDetectionOptions {
    autoDetect?: boolean
    highlightColor?: string
    spanHighlightColor?: string // Purple color for spans
    showLabels?: boolean
    watchForDynamicContent?: boolean
    includeDisabled?: boolean
    minClickableSize?: number
    highlightFirstOnly?: boolean
    highlightCount?: number
    includeSpansWithText?: boolean // Detect all spans with text content
}

interface ClickableElementInfo {
    element: HTMLElement
    type: 'button' | 'link' | 'input' | 'select' | 'textarea' | 'custom' | 'image' | 'area' | 'span'
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
    isHighlighting: boolean
    totalCount: number
    byType: Record<string, number>
    highlightClickables: () => void
    removeHighlights: () => void
    toggleHighlight: () => void
    detectClickables: () => ClickableDetectionResults
    refreshDetection: () => void
    getClickableDetails: () => ClickableElementInfo[]
    getClickablesByType: (type: string) => ClickableElementInfo[]
}

// Pre-compile selectors and constants outside component
const STANDARD_SELECTORS = [
    'a', 'button',
    'input[type="button"]', 'input[type="submit"]', 'input[type="reset"]',
    '[onclick]', '[role="button"]', '[tabindex]:not([tabindex="-1"])',
    'select', 'textarea', 'input:not([type="hidden"])',
    '[contenteditable="true"]'
].join(',')

const CLICKABLE_TAGS = new Set(['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'])
const INTERACTIVE_ROLES = new Set(['button', 'link', 'tab', 'menuitem'])
const CLICKABILITY_ATTRIBUTES = ['onclick', 'href', 'disabled', 'role']

// Cache for computed styles to avoid repeated calculations
const styleCache = new WeakMap<HTMLElement, CSSStyleDeclaration>()
const getComputedStyleCached = (element: HTMLElement): CSSStyleDeclaration => {
    if (!styleCache.has(element)) {
        styleCache.set(element, window.getComputedStyle(element))
    }
    return styleCache.get(element)!
}

const useClickableDetection = (options: ClickableDetectionOptions = {}): UseClickableDetectionReturn => {
    const {
        autoDetect = true,
        highlightColor = '#00ff00',
        spanHighlightColor = '#800080', // Purple for spans
        showLabels = true,
        watchForDynamicContent = true,
        includeDisabled = false,
        minClickableSize = 10,
        highlightFirstOnly = false,
        highlightCount = 1,
        includeSpansWithText = true // Detect all spans with text content
    } = options

    const [isHighlighting, setIsHighlighting] = useState<boolean>(false)
    const [totalCount, setTotalCount] = useState<number>(0)
    const [byType, setByType] = useState<Record<string, number>>({})

    const observerRef = useRef<MutationObserver | null>(null)
    const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const isDetectingRef = useRef<boolean>(false)
    const highlightedElementsRef = useRef<Set<HTMLElement>>(new Set())

    // Memoize label styles for both regular and span elements
    const labelStyles = useMemo(() => `
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
    `, [highlightColor])

    const spanLabelStyles = useMemo(() => `
        position: absolute;
        top: 2px;
        left: 2px;
        background: ${spanHighlightColor};
        color: white;
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
    `, [spanHighlightColor])

    // Enhanced click handler detection
    const hasClickHandlers = useCallback((element: HTMLElement): boolean => {
        // Quick checks first
        if (element.onclick !== null) return true
        if (element.hasAttribute('onclick')) return true

        // Check computed style (cached)
        const computedStyle = getComputedStyleCached(element)
        if (computedStyle.cursor === 'pointer') return true

        // More expensive checks last
        return !!(element as any)._listeners || !!(element as any).__reactEventHandlers
    }, [])

    // Check if span has text content
    const hasTextContent = useCallback((element: HTMLElement): boolean => {
        if (element.tagName !== 'SPAN') return false
        return element.textContent && element.textContent.trim().length > 0
    }, [])

    // Optimized element text extraction
    const getElementText = useCallback((element: HTMLElement): string => {
        const tagName = element.tagName

        if (tagName === 'IMG') {
            return element.getAttribute('alt') || element.getAttribute('title') || ''
        }

        if (tagName === 'INPUT') {
            const input = element as HTMLInputElement
            return input.value || input.placeholder || input.getAttribute('aria-label') || ''
        }

        const text = element.textContent?.trim() || ''
        return text.length > 30 ? text.substring(0, 30) + '...' : text
    }, [])

    // Enhanced type detection with span support
    const getElementTypeInfo = useCallback((element: HTMLElement): { type: ClickableElementInfo['type'], subtype?: string } => {
        const tagName = element.tagName

        switch (tagName) {
            case 'BUTTON':
                return { type: 'button', subtype: (element as HTMLButtonElement).type || 'button' }
            case 'A':
                return { type: 'link', subtype: (element as HTMLAnchorElement).href ? 'external' : 'anchor' }
            case 'INPUT':
                return { type: 'input', subtype: (element as HTMLInputElement).type || 'text' }
            case 'SELECT':
                return { type: 'select' }
            case 'TEXTAREA':
                return { type: 'textarea' }
            case 'IMG':
                return {
                    type: 'image',
                    subtype: element.hasAttribute('onclick') || hasClickHandlers(element) ? 'clickable' : 'static'
                }
            case 'AREA':
                return { type: 'area' }
            case 'SPAN':
                return {
                    type: 'span',
                    subtype: element.getAttribute('role') || 'clickable-text'
                }
            default:
                return { type: 'custom', subtype: tagName.toLowerCase() }
        }
    }, [hasClickHandlers])

    // Batch DOM operations for better performance
    const getElementInfo = useCallback((element: HTMLElement): ClickableElementInfo => {
        const { type, subtype } = getElementTypeInfo(element)
        const text = getElementText(element)
        const rect = element.getBoundingClientRect()

        const computedStyle = getComputedStyleCached(element)
        const isDisabled = element.hasAttribute('disabled') ||
            element.getAttribute('aria-disabled') === 'true' ||
            computedStyle.pointerEvents === 'none'

        const hasClickHandler = hasClickHandlers(element)
        const role = element.getAttribute('role')
        const isInteractive = element.tabIndex >= 0 ||
            CLICKABLE_TAGS.has(element.tagName) ||
            !!(role && INTERACTIVE_ROLES.has(role)) ||
            (element.tagName === 'SPAN' && hasTextContent(element))

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
    }, [getElementTypeInfo, getElementText, hasClickHandlers, hasTextContent])

    // Enhanced element finding with span support
    const findClickableElements = useCallback((): HTMLElement[] => {
        // Use single querySelectorAll for standard elements
        let allElements = Array.from(document.querySelectorAll<HTMLElement>(STANDARD_SELECTORS))

        // Add spans with text if option is enabled
        if (includeSpansWithText) {
            const spans = Array.from(document.querySelectorAll<HTMLElement>('span'))
            const spansWithText = spans.filter(span => hasTextContent(span))
            allElements = [...allElements, ...spansWithText]
        }

        if (!includeDisabled && minClickableSize <= 0) {
            return allElements.filter(el => !el.hasAttribute('disabled'))
        }

        // Batch process filtering to minimize DOM access
        return allElements.filter(el => {
            if (!includeDisabled && el.hasAttribute('disabled')) return false

            if (minClickableSize > 0) {
                const rect = el.getBoundingClientRect()
                if (rect.width < minClickableSize || rect.height < minClickableSize) return false
            }

            return true
        })
    }, [includeDisabled, minClickableSize, includeSpansWithText, hasTextContent])

    // Optimized highlighting with batch DOM operations
    const highlightClickables = useCallback((): void => {
        if (isDetectingRef.current) return

        isDetectingRef.current = true
        removeHighlights()

        const clickableElements = findClickableElements()
        const typeCount: Record<string, number> = {}

        // Pre-calculate all element info to avoid repeated DOM access
        const elementInfos = clickableElements.map(el => getElementInfo(el))

        // Count types in single pass
        elementInfos.forEach(info => {
            const typeKey = info.subtype ? `${info.type}-${info.subtype}` : info.type
            typeCount[typeKey] = (typeCount[typeKey] || 0) + 1
        })

        const countToHighlight = highlightFirstOnly ? Math.min(highlightCount, clickableElements.length) : clickableElements.length
        const elementsToHighlight = clickableElements.slice(0, countToHighlight)

        // Use document fragment for batch DOM manipulation
        const fragment = document.createDocumentFragment()

        elementsToHighlight.forEach((element: HTMLElement, index: number) => {
            const isSpan = element.tagName === 'SPAN'
            const currentHighlightColor = isSpan ? spanHighlightColor : highlightColor

            // Apply highlight styles with different colors for spans
            element.style.outline = `2px solid ${currentHighlightColor}`
            element.style.outlineOffset = '2px'
            element.style.backgroundColor = `${currentHighlightColor}20`
            element.style.position = 'relative'
            element.classList.add('extension-clickable-highlight')

            highlightedElementsRef.current.add(element)

            if (showLabels) {
                const label = document.createElement('div')
                label.textContent = isSpan ? `S${index + 1}` : `C${index + 1}`
                label.style.cssText = isSpan ? spanLabelStyles : labelStyles
                label.classList.add('extension-clickable-label')
                element.appendChild(label)
            }
        })

        setTotalCount(clickableElements.length)
        setByType(typeCount)
        setIsHighlighting(true)
        isDetectingRef.current = false
    }, [findClickableElements, getElementInfo, highlightColor, spanHighlightColor, showLabels, highlightFirstOnly, highlightCount, labelStyles, spanLabelStyles])

    // Optimized highlight removal
    const removeHighlights = useCallback((): void => {
        // Use tracked elements instead of DOM query
        highlightedElementsRef.current.forEach((element: HTMLElement) => {
            if (element.isConnected) { // Check if element still in DOM
                element.style.outline = ''
                element.style.outlineOffset = ''
                element.style.backgroundColor = ''
                element.classList.remove('extension-clickable-highlight')

                // Remove labels
                const labels = element.querySelectorAll('.extension-clickable-label')
                labels.forEach(label => label.remove())
            }
        })

        highlightedElementsRef.current.clear()
        setIsHighlighting(false)
        setTotalCount(0)
        setByType({})
        isDetectingRef.current = false
    }, [])

    const toggleHighlight = useCallback((): void => {
        if (isHighlighting) {
            removeHighlights()
        } else {
            highlightClickables()
        }
    }, [isHighlighting, removeHighlights, highlightClickables])

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

    const getClickableDetails = useCallback((): ClickableElementInfo[] => {
        const clickableElements = findClickableElements()
        return clickableElements.map(el => getElementInfo(el))
    }, [findClickableElements, getElementInfo])

    const getClickablesByType = useCallback((type: string): ClickableElementInfo[] => {
        const allClickables = getClickableDetails()
        return allClickables.filter(info =>
            info.type === type || `${info.type}-${info.subtype}` === type
        )
    }, [getClickableDetails])

    const refreshDetection = useCallback((): void => {
        highlightClickables()
    }, [highlightClickables])

    // Enhanced mutation observer with span support
    useEffect(() => {
        if (!watchForDynamicContent) return

        const observer = new MutationObserver((mutations: MutationRecord[]) => {
            if (isDetectingRef.current || !isHighlighting) return

            let shouldRefresh = false

            // Process mutations more efficiently
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    // Check if any added nodes are clickable or contain clickable elements
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const element = node as Element
                            if (CLICKABLE_TAGS.has(element.tagName) ||
                                element.querySelector(STANDARD_SELECTORS) ||
                                (includeSpansWithText && (element.tagName === 'SPAN' || element.querySelector('span')))) {
                                shouldRefresh = true
                                break
                            }
                        }
                    }
                } else if (mutation.type === 'attributes' &&
                    CLICKABILITY_ATTRIBUTES.includes(mutation.attributeName || '')) {
                    shouldRefresh = true
                }

                if (shouldRefresh) break
            }

            if (shouldRefresh) {
                if (highlightTimeoutRef.current) {
                    clearTimeout(highlightTimeoutRef.current)
                }

                highlightTimeoutRef.current = setTimeout(() => {
                    highlightClickables()
                }, 300) // Reduced debounce time
            }
        })

        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: CLICKABILITY_ATTRIBUTES
            })
        }

        observerRef.current = observer
        return () => {
            observer.disconnect()
            if (highlightTimeoutRef.current) {
                clearTimeout(highlightTimeoutRef.current)
            }
        }
    }, [watchForDynamicContent, isHighlighting, highlightClickables, includeSpansWithText])

    // Auto-detect optimization
    useEffect(() => {
        if (!autoDetect) return

        const runDetection = () => {
            // Small delay to ensure DOM is fully ready
            setTimeout(highlightClickables, 50)
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', runDetection, { once: true })
        } else {
            runDetection()
        }
    }, [autoDetect, highlightClickables])

    // Cleanup
    useEffect(() => {
        return () => {
            removeHighlights()
            observerRef.current?.disconnect()
            if (highlightTimeoutRef.current) {
                clearTimeout(highlightTimeoutRef.current)
            }
        }
    }, [removeHighlights])

    return {
        isHighlighting,
        totalCount,
        byType,
        highlightClickables,
        removeHighlights,
        toggleHighlight,
        detectClickables,
        refreshDetection,
        getClickableDetails,
        getClickablesByType
    }
}

export default useClickableDetection