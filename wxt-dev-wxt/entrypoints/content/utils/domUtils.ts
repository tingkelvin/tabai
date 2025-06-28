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


        if (highlightIndex == 23) console.log(node, node.parent);

        // Check if this node should be included
        const shouldInclude = !node.parent || // Include if no parent
            !(node.parent instanceof ElementDomNode) || // Include if parent is not ElementDomNode
            !node.parent.highlightIndex || // Include if parent has no highlightIndex
            node.parent.highlightIndex === null || // Include if parent highlightIndex is null
            node.parent.highlightIndex === undefined; // Include if parent highlightIndex is undefined

        if (shouldInclude) {
            parentSelectorMap.set(highlightIndex, node);
        } else {
            // Debug: log excluded nodes
            console.log(`Excluding node ${node.highlightIndex} because parent ${node.parent.highlightIndex} is highlighted`);
        }

    }

    console.log("parent", parentSelectorMap)




    if (!jsRootId) throw new Error('Failed to parse HTML to dictionary');

    const htmlToDict = nodeMap[jsRootId];

    console.log(selectorMap)

    if (htmlToDict === undefined || !(htmlToDict instanceof ElementDomNode)) {
        throw new Error('Failed to parse HTML to dictionary');
    }

    return [htmlToDict, selectorMap];
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