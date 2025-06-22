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

export const useClickableHighlighter = () => {
    const [overlays, setOverlays] = useState<HTMLElement[]>([])

    const defaultOptions: Required<HighlightOptions> = {
        borderColor: '#00ff00',
        borderWidth: '2px',
        labelBgColor: '#00ff00',
        labelTextColor: '#000000',
        labelFontSize: '12px',
        zIndex: 10000
    }

    // const generateLabelText = (elementData: ElementData, index: number): string => {
    //     const parts: string[] = []

    //     parts.push(`[${index + 1}]`)
    //     parts.push(elementData.tagName.toLowerCase())

    //     if (elementData.id) {
    //         parts.push(`#${elementData.id}`)
    //     } else if (elementData.textContent) {
    //         const text = elementData.textContent.substring(0, 15)
    //         parts.push(`"${text}${elementData.textContent.length > 15 ? '...' : ''}"`)
    //     } else if (elementData.className) {
    //         const classes = elementData.className.split(' ').filter(c => c.length > 0)
    //         if (classes.length > 0) {
    //             parts.push(`.${classes[0]}`)
    //         }
    //     }

    //     return parts.join(' ')
    // }

    const generateLabelText = (elementData: ElementData, index: number): string => {
        return `C${index + 1}`
    }

    const createHighlight = useCallback((elementData: ElementData, index: number, options: Required<HighlightOptions>): HTMLElement[] => {
        const rect = elementData.boundingRect

        if (rect.width === 0 || rect.height === 0) return []

        const borderOverlay = document.createElement('div')
        borderOverlay.style.cssText = `
      position: absolute;
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      border: ${options.borderWidth} solid ${options.borderColor};
      pointer-events: none;
      z-index: ${options.zIndex};
      box-sizing: border-box;
    `

        const label = document.createElement('div')
        const labelText = generateLabelText(elementData, index)

        label.textContent = labelText
        label.style.cssText = `
      position: absolute;
      right: ${window.innerWidth - rect.right}px;
      top: ${rect.top}px;
      background-color: ${options.labelBgColor};
      color: ${options.labelTextColor};
      font-size: ${options.labelFontSize};
      font-family: monospace;
      padding: 2px 6px;
      border-radius: 3px;
      pointer-events: none;
      z-index: ${options.zIndex + 1};
      white-space: nowrap;
      font-weight: bold;
    `

        document.body.appendChild(borderOverlay)
        document.body.appendChild(label)

        return [borderOverlay, label]
    }, [])

    const highlightClickables = useCallback((elements: ElementData[], options: HighlightOptions = {}) => {
        clearHighlights()
        const opts = { ...defaultOptions, ...options }

        const clickableElements = elements.filter(el => el.isClickable)
        const newOverlays: HTMLElement[] = []

        clickableElements.forEach((elementData, index) => {
            const elementOverlays = createHighlight(elementData, index, opts)
            newOverlays.push(...elementOverlays)
        })

        setOverlays(newOverlays)
    }, [createHighlight])

    const clearHighlights = useCallback(() => {
        overlays.forEach(overlay => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay)
            }
        })
        setOverlays([])
    }, [overlays])

    const highlightTemporarily = useCallback((elements: ElementData[], duration: number = 5000, options: HighlightOptions = {}) => {
        highlightClickables(elements, options)
        setTimeout(() => clearHighlights(), duration)
    }, [highlightClickables, clearHighlights])

    useEffect(() => {
        return () => {
            overlays.forEach(overlay => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay)
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