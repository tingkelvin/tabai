import { useState, useCallback } from 'react'
import { getXPath, isVisible } from '../utils/domUtils'

export interface ElementData {
    tagName: string
    id: string
    className: string
    textContent: string
    attributes: Array<{ name: string; value: string }>
    xpath: string
    isClickable: boolean
    boundingRect: DOMRect
    depth: number
    parent: ElementData | null
    children: ElementData[]
}

interface UseDOMTreeWalkerReturn {
    clickablePaths: ElementData[]
    isScanning: boolean
    scanDOM: () => ElementData[]
}

export const useDOMTreeWalker = (): UseDOMTreeWalkerReturn => {
    const [clickablePaths, setClickablePaths] = useState<ElementData[]>([])
    const [isScanning, setIsScanning] = useState<boolean>(false)

    const isClickableElement = (element: HTMLElement): boolean => {
        const clickableTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'SUMMARY']
        const clickableInputTypes = ['button', 'submit', 'reset', 'checkbox', 'radio']

        if (clickableTags.includes(element.tagName)) {
            if (element.tagName === 'INPUT') {
                const inputElement = element as HTMLInputElement
                return clickableInputTypes.includes(inputElement.type?.toLowerCase())
            }
            return true
        }

        return !!(
            element.onclick ||
            element.style.cursor === 'pointer' ||
            element.getAttribute('role') === 'button' ||
            (element.hasAttribute('tabindex') && element.getAttribute('tabindex') !== '-1')
        )
    }

    const scanDOM = useCallback((): ElementData[] => {
        console.log("scanning")
        setIsScanning(true)
        const allPaths: ElementData[] = []
        const elementMap = new Map<HTMLElement, ElementData>()

        // Find all clickable elements first
        const clickableElements: HTMLElement[] = []
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_ELEMENT,
            {
                acceptNode: (node: Element) => {
                    const element = node as HTMLElement

                    // Skip structural elements
                    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'META', 'LINK', 'TITLE'].includes(element.tagName) || !isVisible(element)) {
                        return NodeFilter.FILTER_SKIP
                    }

                    return NodeFilter.FILTER_ACCEPT
                }
            }
        )
        let count = 0;

        let currentNode = walker.currentNode as HTMLElement
        while (currentNode) {
            if (isClickableElement(currentNode)) {
                clickableElements.push(currentNode)
            }
            currentNode = walker.nextNode() as HTMLElement
            count++;
        }

        console.log(count)

        // Build paths with parent/child relationships
        clickableElements.forEach(clickableElement => {
            const pathElements: HTMLElement[] = []
            let current: HTMLElement | null = clickableElement

            // Collect path elements
            while (current && current !== document.body) {
                pathElements.unshift(current)
                current = current.parentElement
            }

            // Convert to ElementData with relationships
            pathElements.forEach((element, index) => {
                if (!elementMap.has(element)) {
                    const parentElement = index > 0 ? pathElements[index - 1] : null
                    const parentData = parentElement ? elementMap.get(parentElement) : null

                    const elementData: ElementData = {
                        tagName: element.tagName,
                        id: element.id,
                        className: element.className,
                        textContent: element.textContent?.trim().substring(0, 100) || '',
                        attributes: Array.from(element.attributes).map(attr => ({
                            name: attr.name,
                            value: attr.value
                        })),
                        xpath: getXPath(element),
                        isClickable: element === clickableElement,
                        boundingRect: element.getBoundingClientRect(),
                        depth: index,
                        parent: parentData || null,
                        children: []
                    }

                    if (parentData) {
                        parentData.children.push(elementData)
                    }

                    elementMap.set(element, elementData)
                    allPaths.push(elementData)
                }
            })
        })

        setClickablePaths(allPaths)
        setIsScanning(false)

        return allPaths
    }, [])

    return {
        clickablePaths,
        isScanning,
        scanDOM
    }
}