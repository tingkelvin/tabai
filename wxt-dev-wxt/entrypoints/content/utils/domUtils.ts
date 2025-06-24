import { DOMBaseNode, DOMElementNode, DOMTextNode } from "../types/dom";
import { BuildDomTreeResult, RawDomTreeNode, ViewportInfo } from "../types/dom";

export function constructDomTree(evalPage: BuildDomTreeResult): [DOMElementNode, Map<number, DOMElementNode>] {
    const jsNodeMap = evalPage.map;
    const jsRootId = evalPage.rootId;

    const selectorMap = new Map<number, DOMElementNode>();
    const nodeMap: Record<string, DOMBaseNode> = {};

    // First pass: create all nodes
    for (const [id, nodeData] of Object.entries(jsNodeMap)) {
        const [node] = parse_node(nodeData);
        if (node === null) {
            continue;
        }

        nodeMap[id] = node;

        // Add to selector map if it has a highlight index
        if (node instanceof DOMElementNode && node.highlightIndex !== undefined && node.highlightIndex !== null) {
            selectorMap.set(node.highlightIndex, node);
        }
    }

    // Second pass: build the tree structure
    for (const [id, node] of Object.entries(nodeMap)) {
        if (node instanceof DOMElementNode) {
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

    if (!jsRootId) throw new Error('Failed to parse HTML to dictionary');

    const htmlToDict = nodeMap[jsRootId];

    if (htmlToDict === undefined || !(htmlToDict instanceof DOMElementNode)) {
        throw new Error('Failed to parse HTML to dictionary');
    }

    return [htmlToDict, selectorMap];
}

export function parse_node(nodeData: RawDomTreeNode): [DOMBaseNode | null, string[]] {
    if (!nodeData) {
        return [null, []];
    }

    // Process text nodes immediately
    if ('type' in nodeData && nodeData.type === 'TEXT_NODE' && nodeData.text && nodeData.isVisible) {
        const textNode = new DOMTextNode(nodeData.text, nodeData.isVisible, null);
        return [textNode, []];
    }

    // At this point, nodeData is RawDomElementNode (not a text node)
    // TypeScript needs help to narrow the type
    const elementData = nodeData as Exclude<RawDomTreeNode, { type: string }>;

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
    });

    const childrenIds = elementData.children || [];

    return [elementNode, childrenIds];
}