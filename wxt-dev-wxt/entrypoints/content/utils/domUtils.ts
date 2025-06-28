import { ViewportInfo } from "../types/dom/views";

import { RawDomNode, DomTreeResult, isTextNode } from '../types/dom/DomTree';
import { TextDomNode, ElementDomNode, BaseDomNode } from "../types/dom/DomNode";

export function constructDomTree(evalPage: DomTreeResult): [ElementDomNode, Map<number, ElementDomNode>] {

    const jsNodeMap = evalPage.map;
    const jsRootId = evalPage.rootId;

    const selectorMap = new Map<number, ElementDomNode>();
    const parentSelectorMap = new Map<number, ElementDomNode>();
    const nodeMap: Record<string, BaseDomNode> = {};

    // First pass: create all nodes
    for (const [id, nodeData] of Object.entries(jsNodeMap)) {
        const [node] = parse_node(nodeData);
        if (node === null) {
            continue;
        }

        nodeMap[id] = node;

        // Add to selector map if it has a highlight index
        if (node instanceof ElementDomNode && node.isInteractive && node.highlightIndex !== undefined && node.highlightIndex !== null) {
            selectorMap.set(node.highlightIndex, node);
        }
    }

    // Second pass: build the tree structure
    for (const [id, node] of Object.entries(nodeMap)) {
        if (node instanceof ElementDomNode) {
            const nodeData = jsNodeMap[id];
            const childrenIds = 'children' in nodeData ? nodeData.children : [];

            for (const childId of childrenIds) {
                if (!(childId in nodeMap)) {
                    continue;
                }

                const childNode = nodeMap[childId];

                childNode.parent = node;
                node.children.push(childNode);
            }
        }
    }

    // Third pass: filter children node - exclude nodes whose parents are highlighted
    for (const [highlightIndex, node] of selectorMap.entries()) {
        // Check if this node should be included
        const shouldInclude = !node.parent || // Include if no parent
            !(node.parent instanceof ElementDomNode) || // Include if parent is not ElementDomNode
            !node.parent.highlightIndex || // Include if parent has no highlightIndex
            node.parent.highlightIndex === null || // Include if parent highlightIndex is null
            node.parent.highlightIndex === undefined; // Include if parent highlightIndex is undefined

        if (shouldInclude) {
            parentSelectorMap.set(highlightIndex, node);
        }

    }

    console.log("parent", parentSelectorMap)




    if (!jsRootId) throw new Error('Failed to parse HTML to dictionary');

    const htmlToDict = nodeMap[jsRootId];

    console.log(selectorMap)

    if (htmlToDict === undefined || !(htmlToDict instanceof ElementDomNode)) {
        throw new Error('Failed to parse HTML to dictionary');
    }

    return [htmlToDict, parentSelectorMap];
}

export function parse_node(nodeData: RawDomNode): [BaseDomNode | null, string[]] {
    if (!nodeData) {
        return [null, []];
    }

    // Process text nodes immediately
    if (isTextNode(nodeData)) {
        const textNode = new TextDomNode(nodeData.text, nodeData.isVisible, null);
        return [textNode, []];
    }

    // At this point, nodeData is RawDomElementNode (not a text node)
    // TypeScript needs help to narrow the type
    const elementData = nodeData as Exclude<RawDomNode, { type: string }>;

    // Process viewport info if it exists
    let viewportInfo: ViewportInfo | undefined = undefined;
    if ('viewport' in nodeData && typeof nodeData.viewport === 'object' && nodeData.viewport) {
        const viewportObj = nodeData.viewport as { width: number; height: number };
        viewportInfo = {
            width: viewportObj.width,
            height: viewportObj.height,
            scrollX: 0,
            scrollY: 0,
        };
    }

    const elementNode = new ElementDomNode({
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
    });

    const childrenIds = elementData.children || [];

    return [elementNode, childrenIds];
}

interface OverlayData {
    element: HTMLDivElement;
    initialRect: DOMRect;
}

interface IframeOffset {
    x: number;
    y: number;
}

const HIGHLIGHT_CONTAINER_ID: string = "playwright-highlight-container";

export function highlightElement(
    element: Element,
    index: number,
    parentIframe: HTMLIFrameElement | null = null
): number {
    if (!element) return index;

    // Store overlays and the single label for updating
    const overlays: OverlayData[] = [];
    let label: HTMLDivElement | null = null;
    let labelWidth = 20;
    let labelHeight = 16;
    let cleanupFn: (() => void) | null = null;

    try {
        // Create or get highlight container
        let container = document.getElementById(HIGHLIGHT_CONTAINER_ID) as HTMLDivElement | null;
        if (!container) {
            container = document.createElement("div");
            container.id = HIGHLIGHT_CONTAINER_ID;
            container.style.position = "fixed";
            container.style.pointerEvents = "none";
            container.style.top = "0";
            container.style.left = "0";
            container.style.width = "100%";
            container.style.height = "100%";
            container.style.zIndex = "2147483640";
            container.style.backgroundColor = 'transparent';
            document.body.appendChild(container);
        }

        // Get element client rects
        const rects = element.getClientRects();

        if (!rects || rects.length === 0) return index; // Exit if no rects

        // Generate a color based on the index
        const colors: string[] = [
            "#FF0000",
            "#00FF00",
            "#0000FF",
            "#FFA500",
            "#800080",
            "#008080",
            "#FF69B4",
            "#4B0082",
            "#FF4500",
            "#2E8B57",
            "#DC143C",
            "#4682B4",
        ];
        const colorIndex = index % colors.length;
        const baseColor = colors[colorIndex];
        const backgroundColor = baseColor + "1A"; // 10% opacity version of the color

        // Get iframe offset if necessary
        let iframeOffset: IframeOffset = { x: 0, y: 0 };
        if (parentIframe) {
            const iframeRect = parentIframe.getBoundingClientRect();
            iframeOffset.x = iframeRect.left;
            iframeOffset.y = iframeRect.top;
        }

        // Create fragment to hold overlay elements
        const fragment = document.createDocumentFragment();

        // Create highlight overlays for each client rect
        for (const rect of rects) {
            if (rect.width === 0 || rect.height === 0) continue; // Skip empty rects

            const overlay = document.createElement("div");
            overlay.style.position = "fixed";
            overlay.style.border = `2px solid ${baseColor}`;
            overlay.style.backgroundColor = backgroundColor;
            overlay.style.pointerEvents = "none";
            overlay.style.boxSizing = "border-box";

            const top = rect.top + iframeOffset.y;
            const left = rect.left + iframeOffset.x;

            overlay.style.top = `${top}px`;
            overlay.style.left = `${left}px`;
            overlay.style.width = `${rect.width}px`;
            overlay.style.height = `${rect.height}px`;

            fragment.appendChild(overlay);
            overlays.push({ element: overlay, initialRect: rect });
        }

        // Create and position a single label relative to the first rect
        const firstRect = rects[0];
        label = document.createElement("div");
        label.className = "playwright-highlight-label";
        label.style.position = "fixed";
        label.style.background = baseColor;
        label.style.color = "white";
        label.style.padding = "1px 4px";
        label.style.borderRadius = "4px";
        label.style.fontSize = `${Math.min(12, Math.max(8, firstRect.height / 2))}px`;
        label.textContent = index.toString();

        labelWidth = label.offsetWidth > 0 ? label.offsetWidth : labelWidth;
        labelHeight = label.offsetHeight > 0 ? label.offsetHeight : labelHeight;

        const firstRectTop = firstRect.top + iframeOffset.y;
        const firstRectLeft = firstRect.left + iframeOffset.x;

        let labelTop = firstRectTop + 2;
        let labelLeft = firstRectLeft + firstRect.width - labelWidth - 2;

        // Adjust label position if first rect is too small
        if (firstRect.width < labelWidth + 4 || firstRect.height < labelHeight + 4) {
            labelTop = firstRectTop - labelHeight - 2;
            labelLeft = firstRectLeft + firstRect.width - labelWidth;
            if (labelLeft < iframeOffset.x) labelLeft = firstRectLeft;
        }

        // Ensure label stays within viewport bounds
        labelTop = Math.max(0, Math.min(labelTop, window.innerHeight - labelHeight));
        labelLeft = Math.max(0, Math.min(labelLeft, window.innerWidth - labelWidth));

        label.style.top = `${labelTop}px`;
        label.style.left = `${labelLeft}px`;

        fragment.appendChild(label);

        // Update positions on scroll/resize
        const updatePositions = (): void => {
            const newRects = element.getClientRects();
            let newIframeOffset: IframeOffset = { x: 0, y: 0 };

            if (parentIframe) {
                const iframeRect = parentIframe.getBoundingClientRect();
                newIframeOffset.x = iframeRect.left;
                newIframeOffset.y = iframeRect.top;
            }

            // Update each overlay
            overlays.forEach((overlayData, i) => {
                if (i < newRects.length) {
                    const newRect = newRects[i];
                    const newTop = newRect.top + newIframeOffset.y;
                    const newLeft = newRect.left + newIframeOffset.x;

                    overlayData.element.style.top = `${newTop}px`;
                    overlayData.element.style.left = `${newLeft}px`;
                    overlayData.element.style.width = `${newRect.width}px`;
                    overlayData.element.style.height = `${newRect.height}px`;
                    overlayData.element.style.display = (newRect.width === 0 || newRect.height === 0) ? 'none' : 'block';
                } else {
                    overlayData.element.style.display = 'none';
                }
            });

            // If there are fewer new rects than overlays, hide the extras
            if (newRects.length < overlays.length) {
                for (let i = newRects.length; i < overlays.length; i++) {
                    overlays[i].element.style.display = 'none';
                }
            }

            // Update label position based on the first new rect
            if (label && newRects.length > 0) {
                const firstNewRect = newRects[0];
                const firstNewRectTop = firstNewRect.top + newIframeOffset.y;
                const firstNewRectLeft = firstNewRect.left + newIframeOffset.x;

                let newLabelTop = firstNewRectTop + 2;
                let newLabelLeft = firstNewRectLeft + firstNewRect.width - labelWidth - 2;

                if (firstNewRect.width < labelWidth + 4 || firstNewRect.height < labelHeight + 4) {
                    newLabelTop = firstNewRectTop - labelHeight - 2;
                    newLabelLeft = firstNewRectLeft + firstNewRect.width - labelWidth;
                    if (newLabelLeft < newIframeOffset.x) newLabelLeft = firstNewRectLeft;
                }

                // Ensure label stays within viewport bounds
                newLabelTop = Math.max(0, Math.min(newLabelTop, window.innerHeight - labelHeight));
                newLabelLeft = Math.max(0, Math.min(newLabelLeft, window.innerWidth - labelWidth));

                label.style.top = `${newLabelTop}px`;
                label.style.left = `${newLabelLeft}px`;
                label.style.display = 'block';
            } else if (label) {
                label.style.display = 'none';
            }
        };

        const throttleFunction = (func: (...args: any[]) => void, delay: number) => {
            let lastCall = 0;
            return (...args: any[]) => {
                const now = performance.now();
                if (now - lastCall < delay) return;
                lastCall = now;
                return func(...args);
            };
        };

        const throttledUpdatePositions = throttleFunction(updatePositions, 16); // ~60fps
        window.addEventListener('scroll', throttledUpdatePositions, true);
        window.addEventListener('resize', throttledUpdatePositions);

        // Add cleanup function
        cleanupFn = () => {
            window.removeEventListener('scroll', throttledUpdatePositions, true);
            window.removeEventListener('resize', throttledUpdatePositions);
            overlays.forEach(overlay => overlay.element.remove());
            if (label) label.remove();
        };

        container.appendChild(fragment);

        return index + 1;
    } catch (error) {
        console.error('Error in highlightElement:', error);
        return index;
    }
}