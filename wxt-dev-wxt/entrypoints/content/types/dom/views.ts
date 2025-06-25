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

export interface ViewportInfo {
    scrollX: number;
    scrollY: number;
    width: number;
    height: number;
}

export interface ViewportInfo {
    scrollX: number;
    scrollY: number;
    width: number;
    height: number;
}

export class HashedDomElement {
    /**
     * Hash of the dom element to be used as a unique identifier
     */
    constructor(
        public branchPathHash: string,
        public attributesHash: string,
        public xpathHash: string,
        // textHash: string
    ) { }
}
