import {
    BuildDomTreeResult,
    DOMBaseNode,
    DOMElementNode,
    DOMState,
    DOMTextNode,
    RawDomTreeNode,
    ViewportInfo,
} from '../page/DomElement'

/**
 * Get the scroll information for the current page.
 * @returns A tuple containing the number of pixels above and below the current scroll position.
 */
export function getScrollInfo(): [number, number] {
    const scroll_y = window.scrollY
    const viewport_height = window.innerHeight
    const total_height = document.documentElement.scrollHeight

    const pixels_above = scroll_y
    const pixels_below = total_height - (scroll_y + viewport_height)

    return [pixels_above, pixels_below]
}

/**
 * Parse a raw DOM node and return the node object and its children IDs.
 * @param nodeData - The raw DOM node data to parse.
 * @returns A tuple containing the parsed node and an array of child IDs.
 */
export function _parse_node(
    nodeData: RawDomTreeNode
): [DOMBaseNode | null, string[]] {
    if (!nodeData) {
        return [null, []]
    }

    // Process text nodes immediately
    if ('type' in nodeData && nodeData.type === 'TEXT_NODE') {
        const textNode = new DOMTextNode(
            nodeData.text,
            nodeData.isVisible,
            null
        )
        return [textNode, []]
    }

    // At this point, nodeData is RawDomElementNode (not a text node)
    // TypeScript needs help to narrow the type
    const elementData = nodeData as Exclude<RawDomTreeNode, { type: string }>

    // Process viewport info if it exists
    let viewportInfo: ViewportInfo | undefined = undefined
    if (
        'viewport' in nodeData &&
        typeof nodeData.viewport === 'object' &&
        nodeData.viewport
    ) {
        const viewportObj = nodeData.viewport as {
            width: number
            height: number
        }
        viewportInfo = {
            width: viewportObj.width,
            height: viewportObj.height,
            scrollX: 0,
            scrollY: 0,
        }
    }

    const elementNode = new DOMElementNode({
        tagName: elementData.tagName,
        xpath: elementData.xpath,
        attributes: elementData.attributes ?? {},
        children: [],
        isVisible: elementData.isVisible ?? false,
        isInteractive: elementData.isInteractive ?? false,
        isTopElement: elementData.isTopElement ?? false,
        isInViewport: elementData.isInViewport ?? false,
        highlightIndex: elementData.highlightIndex ?? null,
        shadowRoot: elementData.shadowRoot ?? false,
        parent: null,
        viewportInfo: viewportInfo,
    })

    const childrenIds = elementData.children || []

    return [elementNode, childrenIds]
}

/**
 * Constructs a DOM tree from the evaluated page data.
 * @param evalPage - The result of building the DOM tree.
 * @returns A tuple containing the DOM element tree and selector map.
 */
/**
 * Constructs a DOM tree from the evaluated page data.
 * @param evalPage - The result of building the DOM tree.
 * @returns A DOMState object containing the DOM element tree and selector map.
 */
export function constructDomTree(evalPage: BuildDomTreeResult): DOMState {
    const jsNodeMap = evalPage.map
    const jsRootId = evalPage.rootId

    const selectorMap = new Map<number, DOMElementNode>()
    const nodeMap: Record<string, DOMBaseNode> = {}

    // First pass: create all nodes
    for (const [id, nodeData] of Object.entries(jsNodeMap)) {
        const [node] = _parse_node(nodeData)
        if (node === null) {
            continue
        }

        nodeMap[id] = node

        // Add to selector map if it has a highlight index
        if (
            node instanceof DOMElementNode &&
            node.highlightIndex !== undefined &&
            node.highlightIndex !== null
        ) {
            selectorMap.set(node.highlightIndex, node)
        }
    }

    // Second pass: build the tree structure
    for (const [id, node] of Object.entries(nodeMap)) {
        if (node instanceof DOMElementNode) {
            const nodeData = jsNodeMap[id]
            const childrenIds = 'children' in nodeData ? nodeData.children : []

            for (const childId of childrenIds) {
                if (!(childId in nodeMap)) {
                    continue
                }

                const childNode = nodeMap[childId]

                childNode.parent = node
                node.children.push(childNode)
            }
        }
    }

    const elementTree = nodeMap[jsRootId]

    if (elementTree === undefined || !(elementTree instanceof DOMElementNode)) {
        throw new Error('Failed to parse HTML to dictionary')
    }

    return { elementTree, selectorMap }
}

// ✅ Element location function
export const locateElement = async (
    selector: string
): Promise<HTMLElement | null> => {
    // Try CSS selector first inputText
    let element = document.querySelector(selector) as HTMLElement | null

    if (!element && selector.startsWith('//')) {
        // Try XPath if it starts with //
        const result = document.evaluate(
            selector,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
        )
        element = result.singleNodeValue as HTMLElement | null
    }

    if (!element) {
        // Try text content search
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null
        )

        let node: Node | null
        while ((node = walker.nextNode())) {
            if (node.textContent?.includes(selector)) {
                element = node.parentElement
                break
            }
        }
    }

    return element
}

// ✅ Utility functions
export const isElementVisible = (element: HTMLElement): boolean => {
    const rect = element.getBoundingClientRect()
    const style = window.getComputedStyle(element)

    return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        style.opacity !== '0'
    )
}

export const generateSelector = (element: HTMLElement): string => {
    if (element.id) {
        return `#${element.id}`
    }

    if (element.className) {
        const classes = element.className
            .split(' ')
            .filter((c: string) => c.trim())
        if (classes.length > 0) {
            return `.${classes.join('.')}`
        }
    }

    const path: string[] = []
    let current: HTMLElement | null = element

    while (current && current !== document.body) {
        let selector = current.tagName.toLowerCase()

        if (current.id) {
            selector += `#${current.id}`
            path.unshift(selector)
            break
        }

        const siblings = Array.from(current.parentNode?.children || [])
        const sameTagSiblings = siblings.filter(
            (s: Element) => s.tagName === current!.tagName
        )

        if (sameTagSiblings.length > 1) {
            const index = sameTagSiblings.indexOf(current) + 1
            selector += `:nth-of-type(${index})`
        }

        path.unshift(selector)
        current = current.parentElement
    }

    return path.join(' > ')
}

/**
 * Convert key string to browser-compatible key name
 */
export function convertKey(key: string): string {
    const lowerKey = key.trim().toLowerCase()
    const isMac = navigator.userAgent.toLowerCase().includes('mac os x')

    if (isMac) {
        if (lowerKey === 'control' || lowerKey === 'ctrl') {
            return 'Meta' // Use Command key on Mac
        }
        if (lowerKey === 'command' || lowerKey === 'cmd') {
            return 'Meta' // Map Command/Cmd to Meta on Mac
        }
        if (lowerKey === 'option' || lowerKey === 'opt') {
            return 'Alt' // Map Option/Opt to Alt on Mac
        }
    }

    const keyMap: { [key: string]: string } = {
        // Letters (keep as-is for KeyboardEvent)
        a: 'a',
        b: 'b',
        c: 'c',
        d: 'd',
        e: 'e',
        f: 'f',
        g: 'g',
        h: 'h',
        i: 'i',
        j: 'j',
        k: 'k',
        l: 'l',
        m: 'm',
        n: 'n',
        o: 'o',
        p: 'p',
        q: 'q',
        r: 'r',
        s: 's',
        t: 't',
        u: 'u',
        v: 'v',
        w: 'w',
        x: 'x',
        y: 'y',
        z: 'z',

        // Numbers
        '0': '0',
        '1': '1',
        '2': '2',
        '3': '3',
        '4': '4',
        '5': '5',
        '6': '6',
        '7': '7',
        '8': '8',
        '9': '9',

        // Special keys
        control: 'Control',
        ctrl: 'Control',
        shift: 'Shift',
        alt: 'Alt',
        meta: 'Meta',
        enter: 'Enter',
        backspace: 'Backspace',
        delete: 'Delete',
        arrowleft: 'ArrowLeft',
        arrowright: 'ArrowRight',
        arrowup: 'ArrowUp',
        arrowdown: 'ArrowDown',
        escape: 'Escape',
        tab: 'Tab',
        space: ' ',
    }

    const convertedKey = keyMap[lowerKey] || key
    console.info('convertedKey', convertedKey)
    return convertedKey
}

export function getKeyCode(key: string): string {
    const codeMap: { [key: string]: string } = {
        // Letters
        a: 'KeyA',
        b: 'KeyB',
        c: 'KeyC',
        d: 'KeyD',
        e: 'KeyE',
        f: 'KeyF',
        g: 'KeyG',
        h: 'KeyH',
        i: 'KeyI',
        j: 'KeyJ',
        k: 'KeyK',
        l: 'KeyL',
        m: 'KeyM',
        n: 'KeyN',
        o: 'KeyO',
        p: 'KeyP',
        q: 'KeyQ',
        r: 'KeyR',
        s: 'KeyS',
        t: 'KeyT',
        u: 'KeyU',
        v: 'KeyV',
        w: 'KeyW',
        x: 'KeyX',
        y: 'KeyY',
        z: 'KeyZ',

        // Numbers
        '0': 'Digit0',
        '1': 'Digit1',
        '2': 'Digit2',
        '3': 'Digit3',
        '4': 'Digit4',
        '5': 'Digit5',
        '6': 'Digit6',
        '7': 'Digit7',
        '8': 'Digit8',
        '9': 'Digit9',

        // Special keys
        Control: 'ControlLeft',
        Shift: 'ShiftLeft',
        Alt: 'AltLeft',
        Meta: 'MetaLeft',
        Enter: 'Enter',
        Backspace: 'Backspace',
        Delete: 'Delete',
        ArrowLeft: 'ArrowLeft',
        ArrowRight: 'ArrowRight',
        ArrowUp: 'ArrowUp',
        ArrowDown: 'ArrowDown',
        Escape: 'Escape',
        Tab: 'Tab',
        ' ': 'Space',
    }

    return codeMap[key] || key
}

/*
 * Check if a key should trigger keypress event
 */
export function isTypableKey(key: string): boolean {
    const nonTypable = [
        'Control',
        'Shift',
        'Alt',
        'Meta',
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        'Escape',
        'Tab',
        'Backspace',
        'Delete',
    ]
    return !nonTypable.includes(key)
}
