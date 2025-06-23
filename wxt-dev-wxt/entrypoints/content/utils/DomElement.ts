export abstract class DOMBaseNode {
    isVisible: boolean;
    parent: DOMElementNode | null;

    constructor(isVisible: boolean, parent?: DOMElementNode | null) {
        this.isVisible = isVisible;
        // Use None as default and set parent later to avoid circular reference issues
        this.parent = parent ?? null;
    }
}

export type RawDomTextNode = {
    type: string;
    text: string;
    isVisible: boolean;
};

export class DOMTextNode extends DOMBaseNode {
    type = 'TEXT_NODE' as const;
    text: string;

    constructor(text: string, isVisible: boolean, parent?: DOMElementNode | null) {
        super(isVisible, parent);
        this.text = text;
    }

    hasParentWithHighlightIndex(): boolean {
        let current = this.parent;
        while (current != null) {
            if (current.highlightIndex !== null) {
                return true;
            }
            current = current.parent;
        }
        return false;
    }

    isParentInViewport(): boolean {
        if (this.parent === null) {
            return false;
        }
        return this.parent.isInViewport;
    }

    isParentTopElement(): boolean {
        if (this.parent === null) {
            return false;
        }
        return this.parent.isTopElement;
    }
}

export type RawDomElementNode = {
    // Element node doesn't have a type field
    tagName: string | null;
    xpath: string | null;
    attributes: Record<string, string>;
    children: string[]; // Array of node IDs
    isVisible?: boolean;
    isInteractive?: boolean;
    isTopElement?: boolean;
    isInViewport?: boolean;
    highlightIndex?: number;
    viewportCoordinates?: CoordinateSet;
    pageCoordinates?: CoordinateSet;
    viewportInfo?: ViewportInfo;
    shadowRoot?: boolean;
};

export interface PerfMetrics {
    nodeMetrics: {
        totalNodes: number;
        processedNodes: number;
        skippedNodes: number;
    };
    cacheMetrics: {
        boundingRectCacheHits: number;
        boundingRectCacheMisses: number;
        computedStyleCacheHits: number;
        computedStyleCacheMisses: number;
        getBoundingClientRectTime: number;
        getComputedStyleTime: number;
        boundingRectHitRate: number;
        computedStyleHitRate: number;
        overallHitRate: number;
    };
    timings: Record<string, number>;
    buildDomTreeBreakdown: Record<string, number | Record<string, number>>;
}

export type RawDomTreeNode = RawDomTextNode | RawDomElementNode;

export interface BuildDomTreeResult {
    rootId: string;
    map: Record<string, RawDomTreeNode>;
    perfMetrics?: PerfMetrics; // Only included when debugMode is true
}


export class DOMElementNode extends DOMBaseNode {
    tagName: string | null;
    /**
     * xpath: the xpath of the element from the last root node (shadow root or iframe OR document if no shadow root or iframe).
     * To properly reference the element we need to recursively switch the root node until we find the element (work you way up the tree with `.parent`)
     */
    xpath: string | null;
    attributes: Record<string, string>;
    children: DOMBaseNode[];
    isInteractive: boolean;
    isTopElement: boolean;
    isInViewport: boolean;
    shadowRoot: boolean;
    highlightIndex: number | null;
    viewportCoordinates?: CoordinateSet;
    pageCoordinates?: CoordinateSet;
    viewportInfo?: ViewportInfo;

    /*
      ### State injected by the browser context.
  
      The idea is that the clickable elements are sometimes persistent from the previous page -> tells the model which objects are new/_how_ the state has changed
      */
    isNew: boolean | null;

    constructor(params: {
        tagName: string | null;
        xpath: string | null;
        attributes: Record<string, string>;
        children: DOMBaseNode[];
        isVisible: boolean;
        isInteractive?: boolean;
        isTopElement?: boolean;
        isInViewport?: boolean;
        shadowRoot?: boolean;
        highlightIndex?: number | null;
        viewportCoordinates?: CoordinateSet;
        pageCoordinates?: CoordinateSet;
        viewportInfo?: ViewportInfo;
        isNew?: boolean | null;
        parent?: DOMElementNode | null;
    }) {
        super(params.isVisible, params.parent);
        this.tagName = params.tagName;
        this.xpath = params.xpath;
        this.attributes = params.attributes;
        this.children = params.children;
        this.isInteractive = params.isInteractive ?? false;
        this.isTopElement = params.isTopElement ?? false;
        this.isInViewport = params.isInViewport ?? false;
        this.shadowRoot = params.shadowRoot ?? false;
        this.highlightIndex = params.highlightIndex ?? null;
        this.viewportCoordinates = params.viewportCoordinates;
        this.pageCoordinates = params.pageCoordinates;
        this.viewportInfo = params.viewportInfo;
        this.isNew = params.isNew ?? null;
    }
}

export interface ViewportInfo {
    scrollX: number;
    scrollY: number;
    width: number;
    height: number;
}

export interface Coordinates {
    x: number;
    y: number;
}

export interface CoordinateSet {
    topLeft: Coordinates;
    topRight: Coordinates;
    bottomLeft: Coordinates;
    bottomRight: Coordinates;
    center: Coordinates;
    width: number;
    height: number;
}


export interface DOMState {
    elementTree: DOMElementNode;
    selectorMap: Map<number, DOMElementNode>;
}