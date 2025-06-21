interface DOMNavigationOptions {
    startElement?: HTMLElement
    filter?: (element: HTMLElement) => boolean
    includeHidden?: boolean
    onElement?: (element: HTMLElement, index: number) => void
}

interface DOMNavigationResult {
    elements: HTMLElement[]
    totalCount: number
    navigate: (callback: (element: HTMLElement, index: number) => void) => void
    findNext: (currentElement: HTMLElement) => HTMLElement | null
    findPrevious: (currentElement: HTMLElement) => HTMLElement | null
}

export const useDOMNavigation = (options: DOMNavigationOptions = {}): DOMNavigationResult => {
    const {
        startElement = document.body,
        filter = () => true,
        includeHidden = false,
        onElement
    } = options

    // Create TreeWalker with custom filter
    useEffect(() => {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const element = node as HTMLElement;
                            if (filter(element)) {
                                onElement?.(element, 0);
                            }
                        }
                    });
                }
            });
        });

        observer.observe(startElement, {
            childList: true,
            subtree: true
        });

        return () => observer.disconnect();
    }, [startElement, filter, onElement]);

    // Your existing TreeWalker code...
    const createTreeWalker = (): TreeWalker => {
        return document.createTreeWalker(
            startElement,
            NodeFilter.SHOW_ELEMENT,
            (node: Node): number => {
                const element = node as HTMLElement
                if (!includeHidden) {
                    const style = window.getComputedStyle(element)
                    if (style.display === 'none' ||
                        style.visibility === 'hidden' ||
                        style.opacity === '0') {
                        return NodeFilter.FILTER_SKIP
                    }
                }
                return filter(element) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP
            }
        )
    }

    // Get all elements using TreeWalker
    const getAllElements = (): HTMLElement[] => {
        const elements: HTMLElement[] = []
        const walker = createTreeWalker()

        let node = walker.currentNode as HTMLElement
        if (filter(node)) {
            elements.push(node)
        }

        while (node = walker.nextNode() as HTMLElement) {
            elements.push(node)
        }

        return elements
    }

    // Navigate through all elements
    const navigate = (callback: (element: HTMLElement, index: number) => void): void => {
        const walker = createTreeWalker()
        let index = 0

        let node = walker.currentNode as HTMLElement
        if (filter(node)) {
            callback(node, index++)
            onElement?.(node, index - 1)
        }

        while (node = walker.nextNode() as HTMLElement) {
            callback(node, index++)
            onElement?.(node, index - 1)
        }
    }

    // Find next element from current position
    const findNext = (currentElement: HTMLElement): HTMLElement | null => {
        const walker = createTreeWalker()
        walker.currentNode = currentElement

        const next = walker.nextNode() as HTMLElement
        return next || null
    }

    // Find previous element from current position
    const findPrevious = (currentElement: HTMLElement): HTMLElement | null => {
        const walker = createTreeWalker()
        walker.currentNode = currentElement

        const previous = walker.previousNode() as HTMLElement
        return previous || null
    }

    const elements = getAllElements()

    return {
        elements,
        totalCount: elements.length,
        navigate,
        findNext,
        findPrevious
    }
}