export interface RawTextNode {
    type: "TEXT_NODE";
    text: string;
    isVisible: boolean;
}

export interface RawElementNode {
    tagName: string;
    attributes: Record<string, string>;
    xpath: string;
    children: string[];
    isVisible: boolean;
    isTopElement: boolean;
    isInteractive?: boolean;
    isInViewport?: boolean;
    highlightIndex?: number;
    shadowRoot?: boolean;
}

export type RawDomNode = RawTextNode | RawElementNode;

export interface DomTreeResult {
    rootId: string | null;
    map: Record<string, RawDomNode>;
    perfMetrics?: any;
}

// Type guards
export function isTextNode(node: RawDomNode): node is RawTextNode {
    return 'type' in node && node.type === "TEXT_NODE";
}

export function isElementNode(node: RawDomNode): node is RawElementNode {
    return !('type' in node);
}