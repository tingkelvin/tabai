import { useState, useEffect, useCallback, useRef, useMemo } from 'react'

interface TreeNavigationOptions {
    autoDetect?: boolean
    highlightColor?: string
    showLabels?: boolean
    watchForDynamicContent?: boolean
    includeDisabled?: boolean
    minClickableSize?: number
    maxDepth?: number
    groupBySemantic?: boolean
}

interface ClickableTreeNode {
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
    children: ClickableTreeNode[]
    parent: ClickableTreeNode | null
    depth: number
    index: number
    path: number[]
    semanticGroup?: string
}

interface TreeNavigationState {
    currentNode: ClickableTreeNode | null
    currentPath: number[]
    currentDepth: number
    isNavigating: boolean
}

interface TreeNavigationResults {
    tree: ClickableTreeNode[]
    flatList: ClickableTreeNode[]
    totalCount: number
    maxDepth: number
    byType: Record<string, number>
    byDepth: Record<number, number>
}

interface UseTreeNavigationReturn {
    isHighlighting: boolean
    isNavigating: boolean
    currentNode: ClickableTreeNode | null
    currentPath: number[]
    totalCount: number
    maxDepth: number
    byType: Record<string, number>
    tree: ClickableTreeNode[]
    buildTree: () => TreeNavigationResults
    navigateNext: () => void
    navigatePrevious: () => void
    navigateDown: () => void
    navigateUp: () => void
    navigateToPath: (path: number[]) => void
    navigateToNode: (node: ClickableTreeNode) => void
    highlightCurrentNode: () => void
    removeHighlights: () => void
    toggleNavigation: () => void
    getNodeByPath: (path: number[]) => ClickableTreeNode | null
    getSiblings: () => ClickableTreeNode[]
    getChildren: () => ClickableTreeNode[]
    getParent: () => ClickableTreeNode | null
    traverseDepthFirst: (callback: (node: ClickableTreeNode) => void) => void
    traverseBreadthFirst: (callback: (node: ClickableTreeNode) => void) => void
}

const STANDARD_SELECTORS = [
    'a', 'button',
    'input[type="button"]', 'input[type="submit"]', 'input[type="reset"]',
    '[onclick]', '[role="button"]', '[tabindex]:not([tabindex="-1"])',
    'select', 'textarea', 'input:not([type="hidden"])',
    '[contenteditable="true"]'
].join(',')

const CLICKABLE_TAGS = new Set(['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'])
const INTERACTIVE_ROLES = new Set(['button', 'link', 'tab', 'menuitem'])
const SEMANTIC_GROUPS = {
    'nav': ['nav', '[role="navigation"]'],
    'form': ['form', '[role="form"]'],
    'menu': ['[role="menu"]', '[role="menubar"]'],
    'toolbar': ['[role="toolbar"]'],
    'dialog': ['dialog', '[role="dialog"]']
}

const styleCache = new WeakMap<HTMLElement, CSSStyleDeclaration>()
const getComputedStyleCached = (element: HTMLElement): CSSStyleDeclaration => {
    if (!styleCache.has(element)) {
        styleCache.set(element, window.getComputedStyle(element))
    }
    return styleCache.get(element)!
}

const useTreeNavigation = (options: TreeNavigationOptions = {}): UseTreeNavigationReturn => {
    const {
        autoDetect = true,
        highlightColor = '#00ff00',
        showLabels = true,
        watchForDynamicContent = true,
        includeDisabled = false,
        minClickableSize = 10,
        maxDepth = 10,
        groupBySemantic = true
    } = options

    const [isHighlighting, setIsHighlighting] = useState<boolean>(false)
    const [navigationState, setNavigationState] = useState<TreeNavigationState>({
        currentNode: null,
        currentPath: [],
        currentDepth: 0,
        isNavigating: false
    })
    const [tree, setTree] = useState<ClickableTreeNode[]>([])
    const [totalCount, setTotalCount] = useState<number>(0)
    const [maxDepthState, setMaxDepthState] = useState<number>(0)
    const [byType, setByType] = useState<Record<string, number>>({})

    const observerRef = useRef<MutationObserver | null>(null)
    const highlightedElementsRef = useRef<Set<HTMLElement>>(new Set())
    const flatListRef = useRef<ClickableTreeNode[]>([])

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

    const hasClickHandlers = useCallback((element: HTMLElement): boolean => {
        if (element.onclick !== null) return true
        if (element.hasAttribute('onclick')) return true
        const computedStyle = getComputedStyleCached(element)
        if (computedStyle.cursor === 'pointer') return true
        return !!(element as any)._listeners || !!(element as any).__reactEventHandlers
    }, [])

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

    const getElementTypeInfo = useCallback((element: HTMLElement): { type: ClickableTreeNode['type'], subtype?: string } => {
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
                return { type: 'image', subtype: element.hasAttribute('onclick') || hasClickHandlers(element) ? 'clickable' : 'static' }
            case 'AREA':
                return { type: 'area' }
            default:
                return { type: 'custom', subtype: tagName.toLowerCase() }
        }
    }, [hasClickHandlers])

    const getSemanticGroup = useCallback((element: HTMLElement): string | undefined => {
        if (!groupBySemantic) return undefined

        let current = element.parentElement
        while (current) {
            for (const [group, selectors] of Object.entries(SEMANTIC_GROUPS)) {
                for (const selector of selectors) {
                    if (current.matches(selector)) {
                        return group
                    }
                }
            }
            current = current.parentElement
        }
        return undefined
    }, [groupBySemantic])

    const createTreeNode = useCallback((
        element: HTMLElement,
        parent: ClickableTreeNode | null,
        depth: number,
        index: number,
        path: number[]
    ): ClickableTreeNode => {
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
            !!(role && INTERACTIVE_ROLES.has(role))

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
            boundingRect: rect,
            children: [],
            parent,
            depth,
            index,
            path: [...path],
            semanticGroup: getSemanticGroup(element)
        }
    }, [getElementTypeInfo, getElementText, hasClickHandlers, getSemanticGroup])

    const buildTree = useCallback((): TreeNavigationResults => {
        const allElements = Array.from(document.querySelectorAll<HTMLElement>(STANDARD_SELECTORS))
        const validElements = allElements.filter(el => {
            if (!includeDisabled && el.hasAttribute('disabled')) return false
            if (minClickableSize > 0) {
                const rect = el.getBoundingClientRect()
                if (rect.width < minClickableSize || rect.height < minClickableSize) return false
            }
            return true
        })

        const tree: ClickableTreeNode[] = []
        const flatList: ClickableTreeNode[] = []
        const typeCount: Record<string, number> = {}
        const depthCount: Record<number, number> = {}
        let maxDepthFound = 0
        let nodeIndex = 0

        const processElement = (
            element: HTMLElement,
            parent: ClickableTreeNode | null,
            depth: number,
            path: number[]
        ): ClickableTreeNode | null => {
            if (depth > maxDepth) return null

            const node = createTreeNode(element, parent, depth, nodeIndex++, path)
            flatList.push(node)

            const typeKey = node.subtype ? `${node.type}-${node.subtype}` : node.type
            typeCount[typeKey] = (typeCount[typeKey] || 0) + 1
            depthCount[depth] = (depthCount[depth] || 0) + 1
            maxDepthFound = Math.max(maxDepthFound, depth)

            // Find direct clickable children by traversing the tree structure
            const directChildren: HTMLElement[] = []
            const childElements = validElements.filter(child => child !== element)

            for (const child of childElements) {
                let isDirectChild = false
                let current = child.parentElement

                // Check if this element is a direct child in the clickable element hierarchy
                while (current && current !== element) {
                    if (validElements.includes(current)) {
                        // Found an intermediate clickable element, so not a direct child
                        break
                    }
                    current = current.parentElement
                }

                // If we reached our target element without finding intermediate clickables
                if (current === element) {
                    isDirectChild = true
                }

                if (isDirectChild) {
                    directChildren.push(child)
                }
            }

            directChildren.forEach((childElement, childIndex) => {
                const childPath = [...path, childIndex]
                const childNode = processElement(childElement, node, depth + 1, childPath)
                if (childNode) {
                    node.children.push(childNode)
                }
            })

            return node
        }

        // Find root elements (those without clickable parents)
        const rootElements = validElements.filter(el => {
            let current = el.parentElement
            while (current) {
                if (validElements.includes(current)) {
                    return false
                }
                current = current.parentElement
            }
            return true
        })

        rootElements.forEach((element, index) => {
            const node = processElement(element, null, 0, [index])
            if (node) {
                tree.push(node)
            }
        })

        flatListRef.current = flatList

        return {
            tree,
            flatList,
            totalCount: flatList.length,
            maxDepth: maxDepthFound,
            byType: typeCount,
            byDepth: depthCount
        }
    }, [createTreeNode, includeDisabled, minClickableSize, maxDepth])

    const highlightCurrentNode = useCallback((): void => {
        removeHighlights()

        if (!navigationState.currentNode) return

        const element = navigationState.currentNode.element
        element.style.outline = `3px solid ${highlightColor}`
        element.style.outlineOffset = '2px'
        element.style.backgroundColor = `${highlightColor}40`
        element.style.position = 'relative'
        element.classList.add('tree-nav-current')

        highlightedElementsRef.current.add(element)

        if (showLabels) {
            const label = document.createElement('div')
            label.textContent = `[${navigationState.currentPath.join('.')}]`
            label.style.cssText = labelStyles
            label.classList.add('tree-nav-label')
            element.appendChild(label)
        }

        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setIsHighlighting(true)
    }, [navigationState.currentNode, navigationState.currentPath, highlightColor, showLabels, labelStyles])

    const removeHighlights = useCallback((): void => {
        highlightedElementsRef.current.forEach((element: HTMLElement) => {
            if (element.isConnected) {
                element.style.outline = ''
                element.style.outlineOffset = ''
                element.style.backgroundColor = ''
                element.classList.remove('tree-nav-current')
                const labels = element.querySelectorAll('.tree-nav-label')
                labels.forEach(label => label.remove())
            }
        })
        highlightedElementsRef.current.clear()
        setIsHighlighting(false)
    }, [])

    const navigateToNode = useCallback((node: ClickableTreeNode): void => {
        setNavigationState({
            currentNode: node,
            currentPath: node.path,
            currentDepth: node.depth,
            isNavigating: true
        })
    }, [])

    const navigateToPath = useCallback((path: number[]): void => {
        const node = getNodeByPath(path)
        if (node) {
            navigateToNode(node)
        }
    }, [])

    const getNodeByPath = useCallback((path: number[]): ClickableTreeNode | null => {
        let current: ClickableTreeNode[] = tree
        let node: ClickableTreeNode | null = null

        for (const index of path) {
            if (index >= current.length) return null
            node = current[index]
            current = node.children
        }

        return node
    }, [tree])

    const navigateNext = useCallback((): void => {
        const flatList = flatListRef.current
        if (!flatList.length) return

        const currentIndex = navigationState.currentNode
            ? flatList.findIndex(node => node === navigationState.currentNode)
            : -1

        const nextIndex = (currentIndex + 1) % flatList.length
        navigateToNode(flatList[nextIndex])
    }, [navigationState.currentNode, navigateToNode])

    const navigatePrevious = useCallback((): void => {
        const flatList = flatListRef.current
        if (!flatList.length) return

        const currentIndex = navigationState.currentNode
            ? flatList.findIndex(node => node === navigationState.currentNode)
            : 0

        const prevIndex = currentIndex <= 0 ? flatList.length - 1 : currentIndex - 1
        navigateToNode(flatList[prevIndex])
    }, [navigationState.currentNode, navigateToNode])

    const navigateDown = useCallback((): void => {
        if (!navigationState.currentNode?.children.length) return
        navigateToNode(navigationState.currentNode.children[0])
    }, [navigationState.currentNode, navigateToNode])

    const navigateUp = useCallback((): void => {
        if (!navigationState.currentNode?.parent) return
        navigateToNode(navigationState.currentNode.parent)
    }, [navigationState.currentNode, navigateToNode])

    const getSiblings = useCallback((): ClickableTreeNode[] => {
        if (!navigationState.currentNode) return []
        return navigationState.currentNode.parent?.children || tree
    }, [navigationState.currentNode, tree])

    const getChildren = useCallback((): ClickableTreeNode[] => {
        return navigationState.currentNode?.children || []
    }, [navigationState.currentNode])

    const getParent = useCallback((): ClickableTreeNode | null => {
        return navigationState.currentNode?.parent || null
    }, [navigationState.currentNode])

    const traverseDepthFirst = useCallback((callback: (node: ClickableTreeNode) => void): void => {
        const traverse = (nodes: ClickableTreeNode[]) => {
            for (const node of nodes) {
                callback(node)
                traverse(node.children)
            }
        }
        traverse(tree)
    }, [tree])

    const traverseBreadthFirst = useCallback((callback: (node: ClickableTreeNode) => void): void => {
        const queue = [...tree]
        while (queue.length > 0) {
            const node = queue.shift()!
            callback(node)
            queue.push(...node.children)
        }
    }, [tree])

    const toggleNavigation = useCallback((): void => {
        if (navigationState.isNavigating) {
            removeHighlights()
            setNavigationState({
                currentNode: null,
                currentPath: [],
                currentDepth: 0,
                isNavigating: false
            })
        } else {
            const results = buildTree()
            setTree(results.tree)
            setTotalCount(results.totalCount)
            setMaxDepthState(results.maxDepth)
            setByType(results.byType)

            if (results.flatList.length > 0) {
                navigateToNode(results.flatList[0])
            }
        }
    }, [navigationState.isNavigating, removeHighlights, buildTree, navigateToNode])

    // Auto-highlight current node when it changes
    useEffect(() => {
        if (navigationState.isNavigating && navigationState.currentNode) {
            highlightCurrentNode()
        }
    }, [navigationState.currentNode, navigationState.isNavigating, highlightCurrentNode])

    // Keyboard navigation
    useEffect(() => {
        if (!navigationState.isNavigating) return

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowRight':
                case 'ArrowDown':
                    e.preventDefault()
                    navigateNext()
                    break
                case 'ArrowLeft':
                case 'ArrowUp':
                    e.preventDefault()
                    navigatePrevious()
                    break
                case 'Enter':
                case ' ':
                    e.preventDefault()
                    if (navigationState.currentNode) {
                        navigationState.currentNode.element.click()
                    }
                    break
                case 'Escape':
                    e.preventDefault()
                    toggleNavigation()
                    break
                case 'PageDown':
                    e.preventDefault()
                    navigateDown()
                    break
                case 'PageUp':
                    e.preventDefault()
                    navigateUp()
                    break
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [navigationState.isNavigating, navigateNext, navigatePrevious, navigateDown, navigateUp, toggleNavigation])

    // Auto-detect and build tree
    useEffect(() => {
        if (!autoDetect) return

        const runDetection = () => {
            setTimeout(() => {
                const results = buildTree()
                setTree(results.tree)
                setTotalCount(results.totalCount)
                setMaxDepthState(results.maxDepth)
                setByType(results.byType)
            }, 50)
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', runDetection, { once: true })
        } else {
            runDetection()
        }
    }, [autoDetect, buildTree])

    // Cleanup
    useEffect(() => {
        return () => {
            removeHighlights()
            observerRef.current?.disconnect()
        }
    }, [removeHighlights])

    return {
        isHighlighting,
        isNavigating: navigationState.isNavigating,
        currentNode: navigationState.currentNode,
        currentPath: navigationState.currentPath,
        totalCount,
        maxDepth: maxDepthState,
        byType,
        tree,
        buildTree,
        navigateNext,
        navigatePrevious,
        navigateDown,
        navigateUp,
        navigateToPath,
        navigateToNode,
        highlightCurrentNode,
        removeHighlights,
        toggleNavigation,
        getNodeByPath,
        getSiblings,
        getChildren,
        getParent,
        traverseDepthFirst,
        traverseBreadthFirst
    }
}

export default useTreeNavigation