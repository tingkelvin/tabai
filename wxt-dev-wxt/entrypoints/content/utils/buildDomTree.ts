interface BuildDomTreeArgs {
  showHighlightElements?: boolean;
  focusHighlightIndex?: number;
  viewportExpansion?: number;
  debugMode?: boolean;
}

interface NodeData {
  tagName: string;
  attributes: Record<string, string>;
  xpath: string;
  children: string[];
  type?: string;
  text?: string;
  isVisible?: boolean;
  isTopElement?: boolean;
  isInteractive?: boolean;
  highlightIndex?: number;
  isInViewport?: boolean;
  shadowRoot?: boolean;
}

interface PerfMetrics {
  buildDomTreeCalls: number;
  timings: {
    buildDomTree: number;
    highlightElement: number;
    isInteractiveElement: number;
    isElementVisible: number;
    isTopElement: number;
    isInExpandedViewport: number;
    isTextNodeVisible: number;
    getEffectiveScroll: number;
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
    clientRectsCacheHits: number;
    clientRectsCacheMisses: number;
  };
  nodeMetrics: {
    totalNodes: number;
    processedNodes: number;
    skippedNodes: number;
  };
  buildDomTreeBreakdown: {
    totalTime: number;
    totalSelfTime: number;
    buildDomTreeCalls: number;
    domOperations: {
      getBoundingClientRect: number;
      getComputedStyle: number;
      [key: string]: number;
    };
    domOperationCounts: {
      getBoundingClientRect: number;
      getComputedStyle: number;
      [key: string]: number;
    };
    averageTimePerNode?: number;
    timeInChildCalls?: number;
  };
}

interface DomCache {
  boundingRects: WeakMap<Element, DOMRect>;
  clientRects: WeakMap<Element, DOMRectList>;
  computedStyles: WeakMap<Element, CSSStyleDeclaration>;
  clearCache: () => void;
}

interface OverlayData {
  element: HTMLDivElement;
  initialRect: DOMRect;
}

declare global {
  interface Window {
    getEventListenersForNode?: (element: Element) => Array<{
      type: string;
      listener: Function;
      useCapture: boolean;
    }>;
    getEventListeners?: (element: Element) => Record<string, any[]>;
  }
}

export const buildDomTree = (
  args: BuildDomTreeArgs = {
    showHighlightElements: true,
    focusHighlightIndex: -1,
    viewportExpansion: 0,
    debugMode: false,
  }
) => {
  const { showHighlightElements = true, focusHighlightIndex = -1, viewportExpansion = 0, debugMode = false } = args;
  const doHighlightElements = true;

  let highlightIndex = 0;

  // Store cleanup functions locally instead of on window
  const highlightCleanupFunctions: Array<() => void> = [];

  // Timing stack for handling recursion
  const TIMING_STACK: Record<string, number[] | null> = {
    nodeProcessing: [],
    treeTraversal: [],
    highlighting: [],
    current: null,
  };

  const pushTiming = (type: string): void => {
    TIMING_STACK[type] = TIMING_STACK[type] || [];
    TIMING_STACK[type].push(performance.now());
  };

  const popTiming = (type: string): number => {
    const stack = TIMING_STACK[type];
    if (!stack || stack.length === 0) {
      return 0;
    }
    const start = stack.pop();
    return performance.now() - (start || 0);
  };

  // Performance metrics initialization
  const PERF_METRICS: PerfMetrics | null = debugMode
    ? {
      buildDomTreeCalls: 0,
      timings: {
        buildDomTree: 0,
        highlightElement: 0,
        isInteractiveElement: 0,
        isElementVisible: 0,
        isTopElement: 0,
        isInExpandedViewport: 0,
        isTextNodeVisible: 0,
        getEffectiveScroll: 0,
      },
      cacheMetrics: {
        boundingRectCacheHits: 0,
        boundingRectCacheMisses: 0,
        computedStyleCacheHits: 0,
        computedStyleCacheMisses: 0,
        getBoundingClientRectTime: 0,
        getComputedStyleTime: 0,
        boundingRectHitRate: 0,
        computedStyleHitRate: 0,
        overallHitRate: 0,
        clientRectsCacheHits: 0,
        clientRectsCacheMisses: 0,
      },
      nodeMetrics: {
        totalNodes: 0,
        processedNodes: 0,
        skippedNodes: 0,
      },
      buildDomTreeBreakdown: {
        totalTime: 0,
        totalSelfTime: 0,
        buildDomTreeCalls: 0,
        domOperations: {
          getBoundingClientRect: 0,
          getComputedStyle: 0,
        },
        domOperationCounts: {
          getBoundingClientRect: 0,
          getComputedStyle: 0,
        },
      },
    }
    : null;

  // Timing measurement helper
  const measureTime = <T extends Function>(fn: T): T => {
    if (!debugMode) return fn;
    return ((...args: any[]) => {
      const start = performance.now();
      const result = fn.apply(this, args);
      const duration = performance.now() - start;
      return result;
    }) as unknown as T;
  };

  // DOM operation measurement helper
  const measureDomOperation = <T>(operation: () => T, name: string): T => {
    if (!debugMode) return operation();

    const start = performance.now();
    const result = operation();
    const duration = performance.now() - start;

    if (PERF_METRICS && name in PERF_METRICS.buildDomTreeBreakdown.domOperations) {
      PERF_METRICS.buildDomTreeBreakdown.domOperations[name] += duration;
      PERF_METRICS.buildDomTreeBreakdown.domOperationCounts[name]++;
    }

    return result;
  };

  // DOM cache implementation
  const DOM_CACHE: DomCache = {
    boundingRects: new WeakMap(),
    clientRects: new WeakMap(),
    computedStyles: new WeakMap(),
    clearCache: () => {
      DOM_CACHE.boundingRects = new WeakMap();
      DOM_CACHE.clientRects = new WeakMap();
      DOM_CACHE.computedStyles = new WeakMap();
    },
  };

  // Cache helper functions
  const getCachedBoundingRect = (element: Element): DOMRect | null => {
    if (!element) return null;

    if (DOM_CACHE.boundingRects.has(element)) {
      if (debugMode && PERF_METRICS) {
        PERF_METRICS.cacheMetrics.boundingRectCacheHits++;
      }
      return DOM_CACHE.boundingRects.get(element)!;
    }

    if (debugMode && PERF_METRICS) {
      PERF_METRICS.cacheMetrics.boundingRectCacheMisses++;
    }

    let rect: DOMRect;
    if (debugMode) {
      const start = performance.now();
      rect = element.getBoundingClientRect();
      const duration = performance.now() - start;
      if (PERF_METRICS) {
        PERF_METRICS.buildDomTreeBreakdown.domOperations.getBoundingClientRect += duration;
        PERF_METRICS.buildDomTreeBreakdown.domOperationCounts.getBoundingClientRect++;
      }
    } else {
      rect = element.getBoundingClientRect();
    }

    if (rect) {
      DOM_CACHE.boundingRects.set(element, rect);
    }
    return rect;
  };

  const getCachedComputedStyle = (element: Element): CSSStyleDeclaration | null => {
    if (!element) return null;

    if (DOM_CACHE.computedStyles.has(element)) {
      if (debugMode && PERF_METRICS) {
        PERF_METRICS.cacheMetrics.computedStyleCacheHits++;
      }
      return DOM_CACHE.computedStyles.get(element)!;
    }

    if (debugMode && PERF_METRICS) {
      PERF_METRICS.cacheMetrics.computedStyleCacheMisses++;
    }

    let style: CSSStyleDeclaration;
    if (debugMode) {
      const start = performance.now();
      style = window.getComputedStyle(element);
      const duration = performance.now() - start;
      if (PERF_METRICS) {
        PERF_METRICS.buildDomTreeBreakdown.domOperations.getComputedStyle += duration;
        PERF_METRICS.buildDomTreeBreakdown.domOperationCounts.getComputedStyle++;
      }
    } else {
      style = window.getComputedStyle(element);
    }

    if (style) {
      DOM_CACHE.computedStyles.set(element, style);
    }
    return style;
  };

  const getCachedClientRects = (element: Element): DOMRectList | null => {
    if (!element) return null;

    if (DOM_CACHE.clientRects.has(element)) {
      if (debugMode && PERF_METRICS) {
        PERF_METRICS.cacheMetrics.clientRectsCacheHits++;
      }
      return DOM_CACHE.clientRects.get(element)!;
    }

    if (debugMode && PERF_METRICS) {
      PERF_METRICS.cacheMetrics.clientRectsCacheMisses++;
    }

    const rects = element.getClientRects();

    if (rects) {
      DOM_CACHE.clientRects.set(element, rects);
    }
    return rects;
  };

  const DOM_HASH_MAP: Record<string, NodeData> = {};
  const ID = { current: 0 };
  const HIGHLIGHT_CONTAINER_ID = 'playwright-highlight-container';
  const xpathCache = new WeakMap<Element, string>();

  const viewportObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        elementVisibilityMap.set(entry.target, entry.isIntersecting);
      });
    },
    { rootMargin: `${viewportExpansion}px` }
  );

  const elementVisibilityMap = new Map<Element, boolean>();

  /**
   * Highlights an element in the DOM
   */
  const highlightElement = (element: Element, index: number, parentIframe: HTMLIFrameElement | null = null): number => {
    pushTiming('highlighting');

    if (!element) return index;

    const overlays: OverlayData[] = [];
    let label: HTMLDivElement | null = null;
    let labelWidth = 20;
    let labelHeight = 16;
    let cleanupFn: (() => void) | null = null;

    try {
      let container = document.getElementById(HIGHLIGHT_CONTAINER_ID) as HTMLDivElement;
      if (!container) {
        container = document.createElement('div');
        container.id = HIGHLIGHT_CONTAINER_ID;
        container.style.position = 'fixed';
        container.style.pointerEvents = 'none';
        container.style.top = '0';
        container.style.left = '0';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.zIndex = '2147483640';
        container.style.backgroundColor = 'transparent';
        container.style.display = showHighlightElements ? 'block' : 'none';
        document.body.appendChild(container);
      }

      const rects = element.getClientRects();
      if (!rects || rects.length === 0) return index;

      const colors = [
        '#FF0000', '#00FF00', '#0000FF', '#FFA500', '#800080', '#008080',
        '#FF69B4', '#4B0082', '#FF4500', '#2E8B57', '#DC143C', '#4682B4',
      ];
      const colorIndex = index % colors.length;
      const baseColor = colors[colorIndex];
      const backgroundColor = baseColor + '1A';

      let iframeOffset = { x: 0, y: 0 };
      if (parentIframe) {
        const iframeRect = parentIframe.getBoundingClientRect();
        iframeOffset.x = iframeRect.left;
        iframeOffset.y = iframeRect.top;
      }

      const fragment = document.createDocumentFragment();

      for (const rect of Array.from(rects)) {
        if (rect.width === 0 || rect.height === 0) continue;

        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.border = `2px solid ${baseColor}`;
        overlay.style.backgroundColor = backgroundColor;
        overlay.style.pointerEvents = 'none';
        overlay.style.boxSizing = 'border-box';

        const top = rect.top + iframeOffset.y;
        const left = rect.left + iframeOffset.x;

        overlay.style.top = `${top}px`;
        overlay.style.left = `${left}px`;
        overlay.style.width = `${rect.width}px`;
        overlay.style.height = `${rect.height}px`;

        fragment.appendChild(overlay);
        overlays.push({ element: overlay, initialRect: rect });
      }

      const firstRect = rects[0];
      label = document.createElement('div');
      label.className = 'playwright-highlight-label';
      label.style.position = 'fixed';
      label.style.background = baseColor;
      label.style.color = 'white';
      label.style.padding = '1px 4px';
      label.style.borderRadius = '4px';
      label.style.fontSize = `${Math.min(12, Math.max(8, firstRect.height / 2))}px`;
      label.textContent = index.toString();

      labelWidth = label.offsetWidth > 0 ? label.offsetWidth : labelWidth;
      labelHeight = label.offsetHeight > 0 ? label.offsetHeight : labelHeight;

      const firstRectTop = firstRect.top + iframeOffset.y;
      const firstRectLeft = firstRect.left + iframeOffset.x;

      let labelTop = firstRectTop + 2;
      let labelLeft = firstRectLeft + firstRect.width - labelWidth - 2;

      if (firstRect.width < labelWidth + 4 || firstRect.height < labelHeight + 4) {
        labelTop = firstRectTop - labelHeight - 2;
        labelLeft = firstRectLeft + firstRect.width - labelWidth;
        if (labelLeft < iframeOffset.x) labelLeft = firstRectLeft;
      }

      labelTop = Math.max(0, Math.min(labelTop, window.innerHeight - labelHeight));
      labelLeft = Math.max(0, Math.min(labelLeft, window.innerWidth - labelWidth));

      label.style.top = `${labelTop}px`;
      label.style.left = `${labelLeft}px`;

      fragment.appendChild(label);

      const updatePositions = (): void => {
        const newRects = element.getClientRects();
        let newIframeOffset = { x: 0, y: 0 };

        if (parentIframe) {
          const iframeRect = parentIframe.getBoundingClientRect();
          newIframeOffset.x = iframeRect.left;
          newIframeOffset.y = iframeRect.top;
        }

        overlays.forEach((overlayData, i) => {
          if (i < newRects.length) {
            const newRect = newRects[i];
            const newTop = newRect.top + newIframeOffset.y;
            const newLeft = newRect.left + newIframeOffset.x;

            overlayData.element.style.top = `${newTop}px`;
            overlayData.element.style.left = `${newLeft}px`;
            overlayData.element.style.width = `${newRect.width}px`;
            overlayData.element.style.height = `${newRect.height}px`;
            overlayData.element.style.display = newRect.width === 0 || newRect.height === 0 ? 'none' : 'block';
          } else {
            overlayData.element.style.display = 'none';
          }
        });

        if (newRects.length < overlays.length) {
          for (let i = newRects.length; i < overlays.length; i++) {
            overlays[i].element.style.display = 'none';
          }
        }

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

          newLabelTop = Math.max(0, Math.min(newLabelTop, window.innerHeight - labelHeight));
          newLabelLeft = Math.max(0, Math.min(newLabelLeft, window.innerWidth - labelWidth));

          label.style.top = `${newLabelTop}px`;
          label.style.left = `${newLabelLeft}px`;
          label.style.display = 'block';
        } else if (label) {
          label.style.display = 'none';
        }
      };

      const throttleFunction = <T extends Function>(func: T, delay: number): T => {
        let lastCall = 0;
        return ((...args: any[]) => {
          const now = performance.now();
          if (now - lastCall < delay) return;
          lastCall = now;
          return func(...args);
        }) as unknown as T;
      };

      const throttledUpdatePositions = throttleFunction(updatePositions, 16);
      window.addEventListener('scroll', throttledUpdatePositions, true);
      window.addEventListener('resize', throttledUpdatePositions);

      cleanupFn = () => {
        window.removeEventListener('scroll', throttledUpdatePositions, true);
        window.removeEventListener('resize', throttledUpdatePositions);
        overlays.forEach((overlay) => overlay.element.remove());
        if (label) label.remove();
      };

      container.appendChild(fragment);

      return index + 1;
    } finally {
      popTiming('highlighting');
      if (cleanupFn) {
        highlightCleanupFunctions.push(cleanupFn);
      }
    }
  };

  const cleanupHighlights = (): void => {
    if (highlightCleanupFunctions.length > 0) {
      highlightCleanupFunctions.forEach((fn) => fn());
      highlightCleanupFunctions.length = 0; // Clear the array
    }

    const container = document.getElementById(HIGHLIGHT_CONTAINER_ID);
    if (container) container.remove();
  };

  const getElementPosition = (currentElement: Element): number => {
    if (!currentElement.parentElement) {
      return 0;
    }

    const tagName = currentElement.nodeName.toLowerCase();
    const siblings = Array.from(currentElement.parentElement.children).filter(
      (sib) => sib.nodeName.toLowerCase() === tagName
    );

    if (siblings.length === 1) {
      return 0;
    }

    const index = siblings.indexOf(currentElement) + 1;
    return index;
  };

  const getXPathTree = (element: Element, stopAtBoundary: boolean = true): string => {
    if (xpathCache.has(element)) return xpathCache.get(element)!;

    const segments: string[] = [];
    let currentElement: Node | null = element;

    while (currentElement && currentElement.nodeType === Node.ELEMENT_NODE) {
      if (
        stopAtBoundary &&
        (currentElement.parentNode instanceof ShadowRoot || currentElement.parentNode instanceof HTMLIFrameElement)
      ) {
        break;
      }

      const position = getElementPosition(currentElement as Element);
      const tagName = (currentElement as Element).nodeName.toLowerCase();
      const xpathIndex = position > 0 ? `[${position}]` : '';
      segments.unshift(`${tagName}${xpathIndex}`);

      currentElement = currentElement.parentNode;
    }

    const result = segments.join('/');
    xpathCache.set(element, result);
    return result;
  };

  const isTextNodeVisible = (textNode: Text): boolean => {
    try {
      if (viewportExpansion === -1) {
        const parentElement = textNode.parentElement;
        if (!parentElement) return false;

        try {
          return (parentElement as any).checkVisibility({
            checkOpacity: true,
            checkVisibilityCSS: true,
          });
        } catch (e) {
          const style = window.getComputedStyle(parentElement);
          return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        }
      }

      const range = document.createRange();
      range.selectNodeContents(textNode);
      const rects = range.getClientRects();

      if (!rects || rects.length === 0) {
        return false;
      }

      let isAnyRectVisible = false;
      let isAnyRectInViewport = false;

      for (const rect of Array.from(rects)) {
        if (rect.width > 0 && rect.height > 0) {
          isAnyRectVisible = true;

          if (
            !(
              rect.bottom < -viewportExpansion ||
              rect.top > window.innerHeight + viewportExpansion ||
              rect.right < -viewportExpansion ||
              rect.left > window.innerWidth + viewportExpansion
            )
          ) {
            isAnyRectInViewport = true;
            break;
          }
        }
      }

      if (!isAnyRectVisible || !isAnyRectInViewport) {
        return false;
      }

      const parentElement = textNode.parentElement;
      if (!parentElement) return false;

      try {
        return (parentElement as any).checkVisibility({
          checkOpacity: true,
          checkVisibilityCSS: true,
        });
      } catch (e) {
        const style = window.getComputedStyle(parentElement);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
      }
    } catch (e) {
      console.warn('Error checking text node visibility:', e);
      return false;
    }
  };

  const isElementAccepted = (element: Element): boolean => {
    if (!element || !element.tagName) return false;

    const alwaysAccept = new Set(['body', 'div', 'main', 'article', 'section', 'nav', 'header', 'footer']);
    const tagName = element.tagName.toLowerCase();

    if (alwaysAccept.has(tagName)) return true;

    const leafElementDenyList = new Set(['svg', 'script', 'style', 'link', 'meta', 'noscript', 'template']);

    return !leafElementDenyList.has(tagName);
  };

  const isElementVisible = (element: Element): boolean => {
    const style = getCachedComputedStyle(element);
    return (
      (element as HTMLElement).offsetWidth > 0 &&
      (element as HTMLElement).offsetHeight > 0 &&
      style?.visibility !== 'hidden' &&
      style?.display !== 'none'
    );
  };

  const isInteractiveElement = (element: Element): boolean => {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }

    const tagName = element.tagName.toLowerCase();
    const style = getCachedComputedStyle(element);

    const interactiveCursors = new Set([
      'pointer', 'move', 'text', 'grab', 'grabbing', 'cell', 'copy', 'alias',
      'all-scroll', 'col-resize', 'context-menu', 'crosshair', 'e-resize',
      'ew-resize', 'help', 'n-resize', 'ne-resize', 'nesw-resize', 'ns-resize',
      'nw-resize', 'nwse-resize', 'row-resize', 's-resize', 'se-resize',
      'sw-resize', 'vertical-text', 'w-resize', 'zoom-in', 'zoom-out',
    ]);

    const nonInteractiveCursors = new Set(['not-allowed', 'no-drop', 'wait', 'progress', 'initial', 'inherit']);

    const doesElementHaveInteractivePointer = (element: Element): boolean => {
      if (element.tagName.toLowerCase() === 'html') return false;
      if (style && interactiveCursors.has(style.cursor)) return true;
      return false;
    };

    const isInteractiveCursor = doesElementHaveInteractivePointer(element);
    if (isInteractiveCursor) {
      return true;
    }

    const interactiveElements = new Set([
      'a', 'button', 'input', 'select', 'textarea', 'details', 'summary',
      'label', 'option', 'optgroup', 'fieldset', 'legend',
    ]);

    const explicitDisableTags = new Set(['disabled', 'readonly']);

    if (interactiveElements.has(tagName)) {
      if (style && nonInteractiveCursors.has(style.cursor)) {
        return false;
      }

      for (const disableTag of explicitDisableTags) {
        if (
          element.hasAttribute(disableTag) ||
          element.getAttribute(disableTag) === 'true' ||
          element.getAttribute(disableTag) === ''
        ) {
          return false;
        }
      }

      if ((element as HTMLInputElement).disabled) {
        return false;
      }

      if ((element as HTMLInputElement).readOnly) {
        return false;
      }

      if ((element as any).inert) {
        return false;
      }

      return true;
    }

    const role = element.getAttribute('role');
    const ariaRole = element.getAttribute('aria-role');

    if (element.getAttribute('contenteditable') === 'true' || (element as HTMLElement).isContentEditable) {
      return true;
    }

    if (
      element.classList &&
      (element.classList.contains('button') ||
        element.classList.contains('dropdown-toggle') ||
        element.getAttribute('data-index') ||
        element.getAttribute('data-toggle') === 'dropdown' ||
        element.getAttribute('aria-haspopup') === 'true')
    ) {
      return true;
    }

    const interactiveRoles = new Set([
      'button', 'menuitemradio', 'menuitemcheckbox', 'radio', 'checkbox',
      'tab', 'switch', 'slider', 'spinbutton', 'combobox', 'searchbox',
      'textbox', 'option', 'scrollbar',
    ]);

    const hasInteractiveRole =
      interactiveElements.has(tagName) ||
      (role && interactiveRoles.has(role)) ||
      (ariaRole && interactiveRoles.has(ariaRole));

    if (hasInteractiveRole) return true;

    try {
      if (typeof (window as any).getEventListeners === 'function') {
        const listeners = (window as any).getEventListeners(element);
        const mouseEvents = ['click', 'mousedown', 'mouseup', 'dblclick'];
        for (const eventType of mouseEvents) {
          if (listeners[eventType] && listeners[eventType].length > 0) {
            return true;
          }
        }
      }

      const getEventListenersForNode = window.getEventListenersForNode;
      if (typeof getEventListenersForNode === 'function') {
        const listeners = getEventListenersForNode(element);
        const interactionEvents = [
          'click', 'mousedown', 'mouseup', 'keydown', 'keyup',
          'submit', 'change', 'input', 'focus', 'blur',
        ];
        for (const eventType of interactionEvents) {
          for (const listener of listeners) {
            if (listener.type === eventType) {
              return true;
            }
          }
        }
      }

      const commonMouseAttrs = ['onclick', 'onmousedown', 'onmouseup', 'ondblclick'];
      for (const attr of commonMouseAttrs) {
        if (element.hasAttribute(attr) || typeof (element as any)[attr] === 'function') {
          return true;
        }
      }
    } catch (e) {
      // If checking listeners fails, rely on other checks
    }

    return false;
  };

  const isTopElement = (element: Element): boolean => {
    if (viewportExpansion === -1) {
      return true;
    }

    const rects = getCachedClientRects(element);

    if (!rects || rects.length === 0) {
      return false;
    }

    let isAnyRectInViewport = false;
    for (const rect of Array.from(rects)) {
      if (
        rect.width > 0 &&
        rect.height > 0 &&
        !(
          rect.bottom < -viewportExpansion ||
          rect.top > window.innerHeight + viewportExpansion ||
          rect.right < -viewportExpansion ||
          rect.left > window.innerWidth + viewportExpansion
        )
      ) {
        isAnyRectInViewport = true;
        break;
      }
    }

    if (!isAnyRectInViewport) {
      return false;
    }

    const doc = element.ownerDocument;

    if (doc !== window.document) {
      return true;
    }

    const shadowRoot = element.getRootNode();
    if (shadowRoot instanceof ShadowRoot) {
      const centerX = rects[Math.floor(rects.length / 2)].left + rects[Math.floor(rects.length / 2)].width / 2;
      const centerY = rects[Math.floor(rects.length / 2)].top + rects[Math.floor(rects.length / 2)].height / 2;

      try {
        const topEl = measureDomOperation(() => shadowRoot.elementFromPoint(centerX, centerY), 'elementFromPoint');
        if (!topEl) return false;

        let current: Element | null = topEl;
        while (current) {
          if (current === element) return true;
          current = current.parentElement;
        }
        return false;
      } catch (e) {
        return true;
      }
    }

    const centerX = rects[Math.floor(rects.length / 2)].left + rects[Math.floor(rects.length / 2)].width / 2;
    const centerY = rects[Math.floor(rects.length / 2)].top + rects[Math.floor(rects.length / 2)].height / 2;

    try {
      const topEl = document.elementFromPoint(centerX, centerY);
      if (!topEl) return false;

      let current: Element | null = topEl;
      while (current) {
        if (current === element) return true;
        current = current.parentElement;
      }
      return false;
    } catch (e) {
      return true;
    }
  };

  const isInExpandedViewport = (element: Element, viewportExpansion: number): boolean => {
    if (viewportExpansion === -1) {
      return true;
    }

    const rects = element.getClientRects();

    if (!rects || rects.length === 0) {
      const boundingRect = getCachedBoundingRect(element);
      if (!boundingRect || boundingRect.width === 0 || boundingRect.height === 0) {
        return false;
      }
      return !(
        boundingRect.bottom < -viewportExpansion ||
        boundingRect.top > window.innerHeight + viewportExpansion ||
        boundingRect.right < -viewportExpansion ||
        boundingRect.left > window.innerWidth + viewportExpansion
      );
    }

    for (const rect of Array.from(rects)) {
      if (rect.width === 0 || rect.height === 0) continue;

      if (
        !(
          rect.bottom < -viewportExpansion ||
          rect.top > window.innerHeight + viewportExpansion ||
          rect.right < -viewportExpansion ||
          rect.left > window.innerWidth + viewportExpansion
        )
      ) {
        return true;
      }
    }

    return false;
  };

  const getEffectiveScroll = (element: Element): { scrollX: number; scrollY: number } => {
    let currentEl: Element | null = element;
    let scrollX = 0;
    let scrollY = 0;

    return measureDomOperation(() => {
      while (currentEl && currentEl !== document.documentElement) {
        if ((currentEl as HTMLElement).scrollLeft || (currentEl as HTMLElement).scrollTop) {
          scrollX += (currentEl as HTMLElement).scrollLeft;
          scrollY += (currentEl as HTMLElement).scrollTop;
        }
        currentEl = currentEl.parentElement;
      }

      scrollX += window.scrollX;
      scrollY += window.scrollY;

      return { scrollX, scrollY };
    }, 'scrollOperations');
  };

  const isInteractiveCandidate = (element: Element): boolean => {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;

    const tagName = element.tagName.toLowerCase();
    const interactiveElements = new Set(['a', 'button', 'input', 'select', 'textarea', 'details', 'summary', 'label']);

    if (interactiveElements.has(tagName)) return true;

    const hasQuickInteractiveAttr =
      element.hasAttribute('onclick') ||
      element.hasAttribute('role') ||
      element.hasAttribute('tabindex') ||
      element.hasAttribute('aria-') ||
      element.hasAttribute('data-action') ||
      element.getAttribute('contenteditable') === 'true';

    return hasQuickInteractiveAttr;
  };

  const DISTINCT_INTERACTIVE_TAGS = new Set([
    'a', 'button', 'input', 'select', 'textarea', 'summary', 'details', 'label', 'option',
  ]);

  const INTERACTIVE_ROLES = new Set([
    'button', 'link', 'menuitem', 'menuitemradio', 'menuitemcheckbox', 'radio',
    'checkbox', 'tab', 'switch', 'slider', 'spinbutton', 'combobox', 'searchbox',
    'textbox', 'listbox', 'option', 'scrollbar',
  ]);

  const isHeuristicallyInteractive = (element: Element): boolean => {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;

    if (!isElementVisible(element)) return false;

    const hasInteractiveAttributes =
      element.hasAttribute('role') ||
      element.hasAttribute('tabindex') ||
      element.hasAttribute('onclick') ||
      typeof (element as any).onclick === 'function';

    const hasInteractiveClass = /\b(btn|clickable|menu|item|entry|link)\b/i.test(element.className || '');

    const isInKnownContainer = Boolean(element.closest('button,a,[role="button"],.menu,.dropdown,.list,.toolbar'));

    const hasVisibleChildren = [...element.children].some(isElementVisible);

    const isParentBody = element.parentElement && element.parentElement.isSameNode(document.body);

    return (
      (isInteractiveElement(element) || hasInteractiveAttributes || hasInteractiveClass) &&
      hasVisibleChildren &&
      isInKnownContainer &&
      !isParentBody
    );
  };

  const isElementDistinctInteraction = (element: Element): boolean => {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }

    const tagName = element.tagName.toLowerCase();
    const role = element.getAttribute('role');

    if (tagName === 'iframe') {
      return true;
    }

    if (DISTINCT_INTERACTIVE_TAGS.has(tagName)) {
      return true;
    }

    if (role && INTERACTIVE_ROLES.has(role)) {
      return true;
    }

    if ((element as HTMLElement).isContentEditable || element.getAttribute('contenteditable') === 'true') {
      return true;
    }

    if (element.hasAttribute('data-testid') || element.hasAttribute('data-cy') || element.hasAttribute('data-test')) {
      return true;
    }

    if (element.hasAttribute('onclick') || typeof (element as any).onclick === 'function') {
      return true;
    }

    try {
      const getEventListenersForNode = window.getEventListenersForNode;
      if (typeof getEventListenersForNode === 'function') {
        const listeners = getEventListenersForNode(element);
        const interactionEvents = [
          'click', 'mousedown', 'mouseup', 'keydown', 'keyup',
          'submit', 'change', 'input', 'focus', 'blur',
        ];
        for (const eventType of interactionEvents) {
          for (const listener of listeners) {
            if (listener.type === eventType) {
              return true;
            }
          }
        }
      }

      const commonEventAttrs = [
        'onmousedown', 'onmouseup', 'onkeydown', 'onkeyup',
        'onsubmit', 'onchange', 'oninput', 'onfocus', 'onblur',
      ];
      if (commonEventAttrs.some((attr) => element.hasAttribute(attr))) {
        return true;
      }
    } catch (e) {
      // If checking listeners fails, rely on other checks
    }

    if (isHeuristicallyInteractive(element)) {
      return true;
    }

    return false;
  };

  const handleHighlighting = (
    nodeData: NodeData,
    node: Element,
    parentIframe: HTMLIFrameElement | null,
    isParentHighlighted: boolean
  ): boolean => {
    if (!nodeData.isInteractive) return false;

    let shouldHighlight = false;
    if (!isParentHighlighted) {
      shouldHighlight = true;
    } else {
      if (isElementDistinctInteraction(node)) {
        shouldHighlight = true;
      } else {
        shouldHighlight = false;
      }
    }

    if (shouldHighlight) {
      nodeData.isInViewport = isInExpandedViewport(node, viewportExpansion);

      if (nodeData.isInViewport || viewportExpansion === -1) {
        nodeData.highlightIndex = highlightIndex++;

        if (doHighlightElements) {
          if (focusHighlightIndex >= 0) {
            if (focusHighlightIndex === nodeData.highlightIndex) {
              highlightElement(node, nodeData.highlightIndex, parentIframe);
            }
          } else {
            highlightElement(node, nodeData.highlightIndex, parentIframe);
          }
          return true;
        }
      }
    }

    return false;
  };

  const buildDomTree = (
    node: Node,
    parentIframe: HTMLIFrameElement | null = null,
    isParentHighlighted: boolean = false
  ): string | null => {
    if (
      !node ||
      (node as Element).id === HIGHLIGHT_CONTAINER_ID ||
      (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.TEXT_NODE)
    ) {
      if (debugMode && PERF_METRICS) PERF_METRICS.nodeMetrics.skippedNodes++;
      return null;
    }

    if (debugMode && PERF_METRICS) PERF_METRICS.nodeMetrics.totalNodes++;

    if (!node || (node as Element).id === HIGHLIGHT_CONTAINER_ID) {
      if (debugMode && PERF_METRICS) PERF_METRICS.nodeMetrics.skippedNodes++;
      return null;
    }

    if (node === document.body) {
      const nodeData: NodeData = {
        tagName: 'body',
        attributes: {},
        xpath: '/body',
        children: [],
      };

      for (const child of node.childNodes) {
        const domElement = buildDomTree(child, parentIframe, false);
        if (domElement) nodeData.children.push(domElement);
      }

      const id = `${ID.current++}`;
      DOM_HASH_MAP[id] = nodeData;
      if (debugMode && PERF_METRICS) PERF_METRICS.nodeMetrics.processedNodes++;
      return id;
    }

    if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.TEXT_NODE) {
      if (debugMode && PERF_METRICS) PERF_METRICS.nodeMetrics.skippedNodes++;
      return null;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      const textContent = node.textContent?.trim();
      if (!textContent) {
        if (debugMode && PERF_METRICS) PERF_METRICS.nodeMetrics.skippedNodes++;
        return null;
      }

      const parentElement = (node as Text).parentElement;
      if (!parentElement || parentElement.tagName.toLowerCase() === 'script') {
        if (debugMode && PERF_METRICS) PERF_METRICS.nodeMetrics.skippedNodes++;
        return null;
      }

      const id = `${ID.current++}`;
      DOM_HASH_MAP[id] = {
        type: 'TEXT_NODE',
        text: textContent,
        isVisible: isTextNodeVisible(node as Text),
        tagName: '',
        attributes: {},
        xpath: '',
        children: [],
      };
      if (debugMode && PERF_METRICS) PERF_METRICS.nodeMetrics.processedNodes++;
      return id;
    }

    if (node.nodeType === Node.ELEMENT_NODE && !isElementAccepted(node as Element)) {
      if (debugMode && PERF_METRICS) PERF_METRICS.nodeMetrics.skippedNodes++;
      return null;
    }

    if (viewportExpansion !== -1) {
      const rect = getCachedBoundingRect(node as Element);
      const style = getCachedComputedStyle(node as Element);

      const isFixedOrSticky = style && (style.position === 'fixed' || style.position === 'sticky');

      const hasSize = (node as HTMLElement).offsetWidth > 0 || (node as HTMLElement).offsetHeight > 0;

      if (
        !rect ||
        (!isFixedOrSticky &&
          !hasSize &&
          (rect.bottom < -viewportExpansion ||
            rect.top > window.innerHeight + viewportExpansion ||
            rect.right < -viewportExpansion ||
            rect.left > window.innerWidth + viewportExpansion))
      ) {
        if (debugMode && PERF_METRICS) PERF_METRICS.nodeMetrics.skippedNodes++;
        return null;
      }
    }

    const nodeData: NodeData = {
      tagName: (node as Element).tagName.toLowerCase(),
      attributes: {},
      xpath: getXPathTree(node as Element, true),
      children: [],
    };

    if (
      isInteractiveCandidate(node as Element) ||
      (node as Element).tagName.toLowerCase() === 'iframe' ||
      (node as Element).tagName.toLowerCase() === 'body'
    ) {
      const attributeNames = (node as Element).getAttributeNames?.() || [];
      for (const name of attributeNames) {
        nodeData.attributes[name] = (node as Element).getAttribute(name) || '';
      }
    }

    let nodeWasHighlighted = false;
    if (node.nodeType === Node.ELEMENT_NODE) {
      nodeData.isVisible = isElementVisible(node as Element);
      if (nodeData.isVisible) {
        nodeData.isTopElement = isTopElement(node as Element);
        if (nodeData.isTopElement) {
          nodeData.isInteractive = isInteractiveElement(node as Element);
          nodeWasHighlighted = handleHighlighting(nodeData, node as Element, parentIframe, isParentHighlighted);
        }
      }
    }

    if ((node as Element).tagName) {
      const tagName = (node as Element).tagName.toLowerCase();

      if (tagName === 'iframe') {
        try {
          const iframeDoc = (node as HTMLIFrameElement).contentDocument || (node as HTMLIFrameElement).contentWindow?.document;
          if (iframeDoc) {
            for (const child of iframeDoc.childNodes) {
              const domElement = buildDomTree(child, node as HTMLIFrameElement, false);
              if (domElement) nodeData.children.push(domElement);
            }
          }
        } catch (e) {
          console.warn('Unable to access iframe:', e);
        }
      } else if (
        (node as HTMLElement).isContentEditable ||
        (node as Element).getAttribute('contenteditable') === 'true' ||
        (node as Element).id === 'tinymce' ||
        (node as Element).classList.contains('mce-content-body') ||
        (tagName === 'body' && (node as Element).getAttribute('data-id')?.startsWith('mce_'))
      ) {
        for (const child of node.childNodes) {
          const domElement = buildDomTree(child, parentIframe, nodeWasHighlighted);
          if (domElement) nodeData.children.push(domElement);
        }
      } else {
        if ((node as Element).shadowRoot) {
          nodeData.shadowRoot = true;
          for (const child of (node as Element).shadowRoot!.childNodes) {
            const domElement = buildDomTree(child, parentIframe, nodeWasHighlighted);
            if (domElement) nodeData.children.push(domElement);
          }
        }
        for (const child of node.childNodes) {
          const passHighlightStatusToChild = nodeWasHighlighted || isParentHighlighted;
          const domElement = buildDomTree(child, parentIframe, passHighlightStatusToChild);
          if (domElement) nodeData.children.push(domElement);
        }
      }
    }

    if (nodeData.tagName === 'a' && nodeData.children.length === 0 && !nodeData.attributes.href) {
      if (debugMode && PERF_METRICS) PERF_METRICS.nodeMetrics.skippedNodes++;
      return null;
    }

    const id = `${ID.current++}`;
    DOM_HASH_MAP[id] = nodeData;
    if (debugMode && PERF_METRICS) PERF_METRICS.nodeMetrics.processedNodes++;
    return id;
  };

  // Wrap functions with performance measurement
  const measuredHighlightElement = measureTime(highlightElement);
  const measuredIsInteractiveElement = measureTime(isInteractiveElement);
  const measuredIsElementVisible = measureTime(isElementVisible);
  const measuredIsTopElement = measureTime(isTopElement);
  const measuredIsInExpandedViewport = measureTime(isInExpandedViewport);
  const measuredIsTextNodeVisible = measureTime(isTextNodeVisible);
  const measuredGetEffectiveScroll = measureTime(getEffectiveScroll);

  const rootId = buildDomTree(document.body);

  DOM_CACHE.clearCache();

  if (debugMode && PERF_METRICS) {
    Object.keys(PERF_METRICS.timings).forEach((key) => {
      PERF_METRICS.timings[key as keyof typeof PERF_METRICS.timings] = PERF_METRICS.timings[key as keyof typeof PERF_METRICS.timings] / 1000;
    });

    Object.keys(PERF_METRICS.buildDomTreeBreakdown).forEach((key) => {
      if (typeof PERF_METRICS.buildDomTreeBreakdown[key as keyof typeof PERF_METRICS.buildDomTreeBreakdown] === 'number') {
        (PERF_METRICS.buildDomTreeBreakdown as any)[key] = (PERF_METRICS.buildDomTreeBreakdown as any)[key] / 1000;
      }
    });

    if (PERF_METRICS.buildDomTreeBreakdown.buildDomTreeCalls > 0) {
      PERF_METRICS.buildDomTreeBreakdown.averageTimePerNode =
        PERF_METRICS.buildDomTreeBreakdown.totalTime / PERF_METRICS.buildDomTreeBreakdown.buildDomTreeCalls;
    }

    PERF_METRICS.buildDomTreeBreakdown.timeInChildCalls =
      PERF_METRICS.buildDomTreeBreakdown.totalTime - PERF_METRICS.buildDomTreeBreakdown.totalSelfTime;

    Object.keys(PERF_METRICS.buildDomTreeBreakdown.domOperations).forEach((op) => {
      const time = PERF_METRICS.buildDomTreeBreakdown.domOperations[op];
      const count = PERF_METRICS.buildDomTreeBreakdown.domOperationCounts[op];
      if (count > 0) {
        PERF_METRICS.buildDomTreeBreakdown.domOperations[`${op}Average`] = time / count;
      }
    });

    const boundingRectTotal =
      PERF_METRICS.cacheMetrics.boundingRectCacheHits + PERF_METRICS.cacheMetrics.boundingRectCacheMisses;
    const computedStyleTotal =
      PERF_METRICS.cacheMetrics.computedStyleCacheHits + PERF_METRICS.cacheMetrics.computedStyleCacheMisses;

    if (boundingRectTotal > 0) {
      PERF_METRICS.cacheMetrics.boundingRectHitRate =
        PERF_METRICS.cacheMetrics.boundingRectCacheHits / boundingRectTotal;
    }

    if (computedStyleTotal > 0) {
      PERF_METRICS.cacheMetrics.computedStyleHitRate =
        PERF_METRICS.cacheMetrics.computedStyleCacheHits / computedStyleTotal;
    }

    if (boundingRectTotal + computedStyleTotal > 0) {
      PERF_METRICS.cacheMetrics.overallHitRate =
        (PERF_METRICS.cacheMetrics.boundingRectCacheHits + PERF_METRICS.cacheMetrics.computedStyleCacheHits) /
        (boundingRectTotal + computedStyleTotal);
    }
  }

  return debugMode ? { rootId, map: DOM_HASH_MAP, perfMetrics: PERF_METRICS } : { rootId, map: DOM_HASH_MAP };
};