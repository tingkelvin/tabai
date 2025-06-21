import { useState, useEffect, useCallback, useRef } from 'react'

// Type definitions
interface FormDetectionOptions {
    autoDetect?: boolean
    highlightColor?: string
    elementHighlightColor?: string
    showLabels?: boolean
    detectStandaloneElements?: boolean
    watchForDynamicContent?: boolean
    highlightFormElements?: boolean
}

interface FormElementInfo {
    element: HTMLElement
    type: string
    name?: string
    id?: string
    placeholder?: string
    required: boolean
    formParent?: HTMLFormElement
}

interface FormInfo {
    form: HTMLFormElement
    elements: FormElementInfo[]
    action?: string
    method: string
    name?: string
    id?: string
}

interface FormDetectionResults {
    forms: HTMLFormElement[]
    formInfos: FormInfo[]
    standaloneElements: Element[]
    standaloneElementInfos: FormElementInfo[]
    formsCount: number
    elementsCount: number
    totalElementsInForms: number
    totalCount: number
}

interface UseFormDetectionReturn {
    // State
    isHighlighting: boolean
    formsCount: number
    elementsCount: number
    totalElementsInForms: number
    totalCount: number

    // Actions
    highlightForms: () => void
    removeBorders: () => void
    toggleHighlight: () => void
    detectForms: () => FormDetectionResults
    refreshDetection: () => void

    // Additional data
    getFormDetails: () => FormInfo[]
    getElementDetails: () => FormElementInfo[]
}

export const useFormDetection = (options: FormDetectionOptions = {}): UseFormDetectionReturn => {
    const {
        autoDetect = true,
        highlightColor = '#ff4444',
        elementHighlightColor = '#ff8800',
        showLabels = true,
        detectStandaloneElements = true,
        watchForDynamicContent = true,
        highlightFormElements = true
    } = options

    const [isHighlighting, setIsHighlighting] = useState<boolean>(false)
    const [formsCount, setFormsCount] = useState<number>(0)
    const [elementsCount, setElementsCount] = useState<number>(0)
    const [totalElementsInForms, setTotalElementsInForms] = useState<number>(0)
    const observerRef = useRef<MutationObserver | null>(null)
    const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Helper function to get element information
    const getElementInfo = useCallback((element: HTMLElement, formParent?: HTMLFormElement): FormElementInfo => {
        const tagName = element.tagName.toLowerCase()
        let type = tagName

        if (tagName === 'input') {
            type = (element as HTMLInputElement).type || 'text'
        } else if (tagName === 'button') {
            type = (element as HTMLButtonElement).type || 'button'
        }

        return {
            element,
            type,
            name: element.getAttribute('name') || undefined,
            id: element.id || undefined,
            placeholder: element.getAttribute('placeholder') || undefined,
            required: element.hasAttribute('required'),
            formParent
        }
    }, [])

    // Helper function to get detailed form information
    const getFormInfo = useCallback((form: HTMLFormElement): FormInfo => {
        const formElements = form.querySelectorAll<HTMLElement>('input, textarea, select, button')
        const elements: FormElementInfo[] = Array.from(formElements).map(el => getElementInfo(el, form))

        return {
            form,
            elements,
            action: form.action || undefined,
            method: form.method || 'get',
            name: form.name || undefined,
            id: form.id || undefined
        }
    }, [getElementInfo])
    // Function to add borders to all forms
    const highlightForms = useCallback((): void => {
        // Remove any existing highlights first
        removeBorders()

        // Find all form elements using querySelectorAll
        const forms = document.querySelectorAll<HTMLFormElement>('form')
        let totalFormElements = 0

        console.log(`Found ${forms.length} forms on the page`)
        setFormsCount(forms.length)

        // Add borders to each form
        forms.forEach((form: HTMLFormElement, index: number) => {
            // Add a distinctive border
            form.style.border = `3px solid ${highlightColor}`
            form.style.boxShadow = `0 0 10px ${highlightColor}80`
            form.style.borderRadius = '4px'
            form.style.position = 'relative'

            // Add a class for easy removal later
            form.classList.add('extension-form-highlight')

            // Highlight form elements within this form
            if (highlightFormElements) {
                const formElements = form.querySelectorAll<HTMLElement>('input, textarea, select, button')
                formElements.forEach((element: HTMLElement, elemIndex: number) => {
                    element.style.outline = `2px solid ${elementHighlightColor}`
                    element.style.outlineOffset = '1px'
                    element.classList.add('extension-form-element-highlight')

                    // Add element label if enabled
                    if (showLabels) {
                        const elementLabel = document.createElement('div')
                        elementLabel.textContent = `E${elemIndex + 1}`
                        elementLabel.style.cssText = `
              position: absolute;
              background: ${elementHighlightColor};
              color: white;
              padding: 1px 4px;
              font-size: 10px;
              font-family: Arial, sans-serif;
              border-radius: 2px;
              z-index: 10001;
              pointer-events: none;
              transform: translate(-100%, -100%);
            `
                        elementLabel.classList.add('extension-element-label')

                        // Position relative to element
                        const rect = element.getBoundingClientRect()
                        elementLabel.style.left = (rect.left + window.scrollX) + 'px'
                        elementLabel.style.top = (rect.top + window.scrollY) + 'px'

                        document.body.appendChild(elementLabel)
                    }
                })
                totalFormElements += formElements.length
            }

            // Optional: Add a label to identify the form
            if (showLabels) {
                const label = document.createElement('div')
                const formElementsCount = form.querySelectorAll('input, textarea, select, button').length
                label.textContent = `Form ${index + 1} (${formElementsCount} elements)`
                label.style.cssText = `
          position: absolute;
          background: ${highlightColor};
          color: white;
          padding: 2px 8px;
          font-size: 12px;
          font-family: Arial, sans-serif;
          border-radius: 0 0 4px 0;
          z-index: 10000;
          pointer-events: none;
          top: -3px;
          left: -3px;
        `
                label.classList.add('extension-form-label')

                // Insert label into the form
                form.appendChild(label)
            }
        })

        setTotalElementsInForms(totalFormElements)

        // Also detect form-related elements that might not be in a <form> tag
        if (detectStandaloneElements) {
            highlightStandaloneElements()
        }

        setIsHighlighting(true)
    }, [highlightColor, elementHighlightColor, showLabels, detectStandaloneElements, highlightFormElements])

    // Function to highlight individual form elements that might not be in forms
    const highlightStandaloneElements = useCallback((): void => {
        const formElements = document.querySelectorAll<HTMLElement>('input, textarea, select, button')
        let standaloneCount = 0

        formElements.forEach((element: HTMLElement) => {
            // Only highlight if not already inside a highlighted form
            if (!element.closest('.extension-form-highlight')) {
                element.style.outline = `2px dashed ${elementHighlightColor}`
                element.classList.add('extension-element-highlight')
                standaloneCount++
            }
        })

        setElementsCount(standaloneCount)
    }, [elementHighlightColor])

    // Function to remove all borders and highlights
    const removeBorders = useCallback((): void => {
        // Remove form highlights
        const highlightedForms = document.querySelectorAll<HTMLElement>('.extension-form-highlight')
        highlightedForms.forEach((form: HTMLElement) => {
            form.style.border = ''
            form.style.boxShadow = ''
            form.style.borderRadius = ''
            form.style.position = ''
            form.classList.remove('extension-form-highlight')
        })

        // Remove form element highlights within forms
        const highlightedFormElements = document.querySelectorAll<HTMLElement>('.extension-form-element-highlight')
        highlightedFormElements.forEach((element: HTMLElement) => {
            element.style.outline = ''
            element.style.outlineOffset = ''
            element.classList.remove('extension-form-element-highlight')
        })

        // Remove standalone form element highlights
        const highlightedElements = document.querySelectorAll<HTMLElement>('.extension-element-highlight')
        highlightedElements.forEach((element: HTMLElement) => {
            element.style.outline = ''
            element.classList.remove('extension-element-highlight')
        })

        // Remove form labels
        const labels = document.querySelectorAll<HTMLElement>('.extension-form-label')
        labels.forEach((label: HTMLElement) => label.remove())

        // Remove element labels
        const elementLabels = document.querySelectorAll<HTMLElement>('.extension-element-label')
        elementLabels.forEach((label: HTMLElement) => label.remove())

        setIsHighlighting(false)
        setFormsCount(0)
        setElementsCount(0)
        setTotalElementsInForms(0)
    }, [])

    // Function to toggle highlighting
    const toggleHighlight = useCallback((): void => {
        if (isHighlighting) {
            removeBorders()
        } else {
            highlightForms()
        }
    }, [isHighlighting, highlightForms, removeBorders])

    // Function to detect forms without highlighting
    const detectForms = useCallback((): FormDetectionResults => {
        const forms = document.querySelectorAll<HTMLFormElement>('form')
        const formInfos: FormInfo[] = Array.from(forms).map(form => getFormInfo(form))
        const totalElementsInForms = formInfos.reduce((sum, formInfo) => sum + formInfo.elements.length, 0)

        const formElements = document.querySelectorAll<Element>('input, textarea, select, button')
        const standaloneElements = Array.from(formElements).filter((el: Element) => !el.closest('form'))
        const standaloneElementInfos: FormElementInfo[] = standaloneElements.map(el => getElementInfo(el as HTMLElement))

        return {
            forms: Array.from(forms),
            formInfos,
            standaloneElements,
            standaloneElementInfos,
            formsCount: forms.length,
            elementsCount: standaloneElements.length,
            totalElementsInForms,
            totalCount: forms.length + standaloneElements.length + totalElementsInForms
        }
    }, [getFormInfo, getElementInfo])

    // Get detailed form information
    const getFormDetails = useCallback((): FormInfo[] => {
        const forms = document.querySelectorAll<HTMLFormElement>('form')
        return Array.from(forms).map(form => getFormInfo(form))
    }, [getFormInfo])

    // Get detailed element information
    const getElementDetails = useCallback((): FormElementInfo[] => {
        const allElements = document.querySelectorAll<HTMLElement>('input, textarea, select, button')
        return Array.from(allElements).map(el => {
            const formParent = el.closest('form') as HTMLFormElement | null
            return getElementInfo(el, formParent || undefined)
        })
    }, [getElementInfo])

    // Refresh detection (alias for highlightForms)
    const refreshDetection = useCallback((): void => {
        highlightForms()
    }, [highlightForms])

    // Setup mutation observer for dynamic content
    useEffect(() => {
        if (!watchForDynamicContent) return

        const observer = new MutationObserver((mutations: MutationRecord[]) => {
            let shouldRerun = false
            mutations.forEach((mutation: MutationRecord) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node: Node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const element = node as Element
                            if (element.tagName === 'FORM' ||
                                element.querySelector?.('form') ||
                                ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName) ||
                                element.querySelector?.('input, textarea, select')) {
                                shouldRerun = true
                            }
                        }
                    })
                }
            })

            if (shouldRerun && isHighlighting) {
                // Clear existing timeout
                if (highlightTimeoutRef.current) {
                    clearTimeout(highlightTimeoutRef.current)
                }

                // Debounce the re-highlighting
                highlightTimeoutRef.current = setTimeout(() => {
                    highlightForms()
                }, 100)
            }
        })

        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            })
        }

        observerRef.current = observer

        return () => {
            observer.disconnect()
            if (highlightTimeoutRef.current) {
                clearTimeout(highlightTimeoutRef.current)
            }
        }
    }, [watchForDynamicContent, isHighlighting, highlightForms])

    // Auto-detect on mount if enabled
    useEffect(() => {
        if (autoDetect) {
            if (document.readyState === 'loading') {
                const handleDOMContentLoaded = (): void => {
                    highlightForms()
                    document.removeEventListener('DOMContentLoaded', handleDOMContentLoaded)
                }
                document.addEventListener('DOMContentLoaded', handleDOMContentLoaded)

                return () => {
                    document.removeEventListener('DOMContentLoaded', handleDOMContentLoaded)
                }
            } else {
                highlightForms()
            }
        }
    }, [autoDetect, highlightForms])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            removeBorders()
            if (observerRef.current) {
                observerRef.current.disconnect()
            }
            if (highlightTimeoutRef.current) {
                clearTimeout(highlightTimeoutRef.current)
            }
        }
    }, [removeBorders])

    return {
        // State
        isHighlighting,
        formsCount,
        elementsCount,
        totalElementsInForms,
        totalCount: formsCount + elementsCount + totalElementsInForms,

        // Actions
        highlightForms,
        removeBorders,
        toggleHighlight,
        detectForms,
        refreshDetection,

        // Additional data
        getFormDetails,
        getElementDetails
    }
}

export default useFormDetection