import { useState, useCallback, useEffect } from 'react';

// Type definitions
interface BFSNodeData {
    id: string;
    element: HTMLElement;
    tagName: string;
    text: string;
    depth: number;
    isTarget: boolean;
    parent: string | null;
    children: string[];
    bounds: {
        top: number;
        left: number;
        width: number;
        height: number;
    } | null;
}

interface BFSDataStructure {
    nodes: BFSNodeData[];
    edges: Array<{
        from: string;
        to: string;
        relationship: string;
    }>;
    root: string | null;
}

interface BFSStats {
    totalNodes: number;
    targetCount: number;
    maxDepth: number;
}

interface BFSCollectedData {
    targetElements: HTMLElement[];
    dataStructure: BFSDataStructure;
    elementMap: Map<HTMLElement, string>;
    stats: BFSStats;
}

interface QueueItem {
    element: HTMLElement;
    parent: HTMLElement | null;
    depth: number;
}

// Core BFS traversal logic
const collectElementsWithBFS = (rootElement: HTMLElement = document.body): {
    targetElements: HTMLElement[];
    dataStructure: BFSDataStructure;
    elementMap: Map<HTMLElement, string>;
} => {
    const targetElements: HTMLElement[] = [];
    const elementMap = new Map<HTMLElement, string>();
    const queue: QueueItem[] = [];
    const visited = new Set<HTMLElement>();

    const dataStructure: BFSDataStructure = {
        nodes: [],
        edges: [],
        root: null
    };

    queue.push({ element: rootElement, parent: null, depth: 0 });

    while (queue.length > 0) {
        const queueItem = queue.shift();
        if (!queueItem) continue;

        const { element, parent, depth } = queueItem;

        if (visited.has(element)) continue;
        visited.add(element);

        const isTarget = element.tagName === 'BUTTON' || element.tagName === 'SPAN';
        const nodeId = `node_${dataStructure.nodes.length}`;

        const nodeData: BFSNodeData = {
            id: nodeId,
            element: element,
            tagName: element.tagName,
            text: element.textContent?.trim() || '',
            depth: depth,
            isTarget: isTarget,
            parent: parent ? elementMap.get(parent) || null : null,
            children: [],
            bounds: null
        };

        dataStructure.nodes.push(nodeData);
        elementMap.set(element, nodeId);

        if (!dataStructure.root && element === rootElement) {
            dataStructure.root = nodeId;
        }

        if (parent && elementMap.has(parent)) {
            const parentId = elementMap.get(parent);
            const parentNode = dataStructure.nodes.find(n => n.id === parentId);
            if (parentNode && parentId) {
                parentNode.children.push(nodeId);
                dataStructure.edges.push({
                    from: parentId,
                    to: nodeId,
                    relationship: 'parent-child'
                });
            }
        }

        if (isTarget) {
            targetElements.push(element);
            drawBorderAroundElement(element, nodeId);

            const rect = element.getBoundingClientRect();
            nodeData.bounds = {
                top: rect.top + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width,
                height: rect.height
            };
        }

        for (let child of element.children) {
            queue.push({ element: child as HTMLElement, parent: element, depth: depth + 1 });
        }
    }

    return { targetElements, dataStructure, elementMap };
};

// Draw border around element
const drawBorderAroundElement = (element: HTMLElement, nodeId: string): void => {
    const rect = element.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    const border = document.createElement('div');
    border.className = 'bfs-element-border';
    border.dataset.nodeId = nodeId;
    border.dataset.elementType = element.tagName.toLowerCase();

    border.style.cssText = `
    position: absolute;
    top: ${rect.top + scrollTop - 2}px;
    left: ${rect.left + scrollLeft - 2}px;
    width: ${rect.width + 4}px;
    height: ${rect.height + 4}px;
    border: 2px solid ${element.tagName === 'BUTTON' ? '#007bff' : '#28a745'};
    background: ${element.tagName === 'BUTTON' ? 'rgba(0, 123, 255, 0.1)' : 'rgba(40, 167, 69, 0.1)'};
    pointer-events: none;
    z-index: 9999;
    box-sizing: border-box;
    border-radius: 4px;
  `;

    const label = document.createElement('div');
    label.style.cssText = `
    position: absolute;
    top: -20px;
    left: 0;
    background: ${element.tagName === 'BUTTON' ? '#007bff' : '#28a745'};
    color: white;
    padding: 2px 6px;
    font-size: 10px;
    border-radius: 2px;
    white-space: nowrap;
    font-family: monospace;
  `;
    label.textContent = `${element.tagName}:${nodeId}`;
    border.appendChild(label);

    document.body.appendChild(border);
};

// Remove all borders
const removeBorders = (): void => {
    const borders = document.querySelectorAll('.bfs-element-border');
    borders.forEach(border => border.remove());
};

// Visualize data structure
const visualizeDataStructure = (dataStructure: BFSDataStructure): BFSStats => {
    console.group('BFS Data Structure');
    console.log('Root:', dataStructure.root);
    console.log('Total nodes:', dataStructure.nodes.length);
    console.log('Total edges:', dataStructure.edges.length);

    const targetNodes = dataStructure.nodes.filter(n => n.isTarget);
    console.log('Target elements:', targetNodes.length);
    console.groupEnd();

    return {
        totalNodes: dataStructure.nodes.length,
        targetCount: targetNodes.length,
        maxDepth: Math.max(...dataStructure.nodes.map(n => n.depth))
    };
};

// Main BFS Hook
export const useBFSCollector = (): {
    collectedData: BFSCollectedData | null;
    isCollecting: boolean;
    runBFS: (rootElement?: HTMLElement | null) => BFSCollectedData;
    clearBorders: () => void;
    reset: () => void;
} => {
    const [collectedData, setCollectedData] = useState<BFSCollectedData | null>(null);
    const [isCollecting, setIsCollecting] = useState<boolean>(false);

    // Auto-scan on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            runBFS();
        }, 1000); // Delay to let page load

        return () => clearTimeout(timer);
    }, []);

    // Update borders on window resize
    useEffect(() => {
        const updateBorders = () => {
            if (collectedData) {
                removeBorders();
                collectedData.targetElements.forEach((element, index) => {
                    const nodeId = collectedData.elementMap.get(element);
                    if (nodeId) {
                        drawBorderAroundElement(element, nodeId);
                    }
                });
            }
        };

        window.addEventListener('resize', updateBorders);
        window.addEventListener('scroll', updateBorders);

        return () => {
            window.removeEventListener('resize', updateBorders);
            window.removeEventListener('scroll', updateBorders);
        };
    }, [collectedData]);

    const runBFS = useCallback((rootElement?: HTMLElement | null): BFSCollectedData => {
        setIsCollecting(true);
        removeBorders();

        const root = rootElement || document.body as HTMLElement;
        const result = collectElementsWithBFS(root);
        const stats = visualizeDataStructure(result.dataStructure);

        const collectedResult: BFSCollectedData = { ...result, stats };
        setCollectedData(collectedResult);
        setIsCollecting(false);

        return collectedResult;
    }, []);

    const clearBorders = useCallback((): void => {
        removeBorders();
    }, []);

    const reset = useCallback((): void => {
        removeBorders();
        setCollectedData(null);
    }, []);

    return {
        collectedData,
        isCollecting,
        runBFS,
        clearBorders,
        reset
    };
};

// BFS Controls Hook
export const useBFSControls = (widgetRef: React.RefObject<HTMLDivElement>) => {
    const { collectedData, isCollecting, runBFS, clearBorders, reset } = useBFSCollector();

    const scanWidget = useCallback((): void => {
        if (widgetRef?.current) {
            runBFS(widgetRef.current);
        }
    }, [runBFS, widgetRef]);

    const scanPage = useCallback((): void => {
        runBFS();
    }, [runBFS]);

    const buttons = [
        {
            label: 'Scan Widget',
            onClick: scanWidget,
            disabled: isCollecting || !widgetRef?.current,
            title: 'Run BFS on terminal widget'
        },
        {
            label: 'Scan Page',
            onClick: scanPage,
            disabled: isCollecting,
            title: 'Run BFS on entire page'
        },
        {
            label: 'Clear',
            onClick: clearBorders,
            disabled: false,
            title: 'Remove visual borders'
        }
    ];

    return {
        collectedData,
        isCollecting,
        buttons,
        scanWidget,
        scanPage,
        clearBorders,
        reset
    };
};

// Auto-clear hook
export const useAutoClearBFS = (shouldClear: boolean, clearFunction?: () => void): void => {
    useEffect(() => {
        if (shouldClear && clearFunction) {
            clearFunction();
        }
    }, [shouldClear, clearFunction]);
};