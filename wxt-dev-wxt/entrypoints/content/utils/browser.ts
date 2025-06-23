// types/automation.ts - Type definitions
import { buildDomTree } from "./buildDomTree";
import { BuildDomTreeResult, DOMElementNode, DOMState } from "./DomElement";
import { constructDomTree, convertKey, getKeyCode } from "./domUtils";

export interface ClickableElement {
    element: HTMLElement;
    tagName: string;
    text: string;
    selector: string;
    rect: DOMRect;
    click: () => Promise<void>;
}

export interface ActionButton {
    id: string;
    label: string;
    onClick: () => Promise<void> | void;
    title: string;
}

export interface AutomationResult {
    success: boolean;
    message?: string;
    data?: any;
    error?: string;
}

export interface AutomationCommand {
    action: 'click' | 'type' | 'navigate' | 'scroll' | 'getClickableElements';
    params: {
        selector?: string;
        text?: string;
        url?: string;
        direction?: 'up' | 'down';
        amount?: number;
    };
}

// utils/automation.ts - Functional Implementation
// ✅ Simple utility functions
export const getCurrentUrl = (): string => window.location.href;
export const getTitle = (): string => document.title;

// ✅ Navigation functions
export const navigateTo = async (url: string): Promise<void> => {
    window.location.href = url;
    return waitForPageLoad();
};

export const goBack = async (): Promise<void> => {
    window.history.back();
    return waitForPageLoad();
};

export const goForward = async (): Promise<void> => {
    window.history.forward();
    return waitForPageLoad();
};

export const reload = async (): Promise<void> => {
    window.location.reload();
    return waitForPageLoad();
};

export const waitForPageLoad = (timeout: number = 5000): Promise<void> => {
    return new Promise<void>((resolve) => {
        if (document.readyState === 'complete') {
            resolve();
            return;
        }

        const timer = setTimeout(() => {
            document.removeEventListener('DOMContentLoaded', onLoad);
            window.removeEventListener('load', onLoad);
            resolve();
        }, timeout);

        const onLoad = (): void => {
            clearTimeout(timer);
            document.removeEventListener('DOMContentLoaded', onLoad);
            window.removeEventListener('load', onLoad);
            resolve();
        };

        document.addEventListener('DOMContentLoaded', onLoad);
        window.addEventListener('load', onLoad);
    });
};

export const scrollIntoView = async (element: HTMLElement, timeout: number = 1000): Promise<void> => {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        const rect = element.getBoundingClientRect();
        const isVisible = (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= window.innerHeight &&
            rect.right <= window.innerWidth
        );

        if (isVisible) break;

        element.scrollIntoView({
            behavior: 'auto',
            block: 'center',
            inline: 'center'
        });

        await new Promise<void>((resolve) => setTimeout(resolve, 100));
    }
};

export function getScrollInfo(): [number, number] {
    const scroll_y = window.scrollY;
    const viewport_height = window.innerHeight;
    const total_height = document.documentElement.scrollHeight;

    const pixels_above = scroll_y;
    const pixels_below = total_height - (scroll_y + viewport_height);

    return [pixels_above, pixels_below];
}

export const waitForElementStability = async (element: HTMLElement, timeout: number = 1000): Promise<void> => {
    const startTime = Date.now();
    let lastRect = element.getBoundingClientRect();

    while (Date.now() - startTime < timeout) {
        await new Promise<void>((resolve) => setTimeout(resolve, 50));

        const currentRect = element.getBoundingClientRect();

        if (
            Math.abs(lastRect.x - currentRect.x) < 2 &&
            Math.abs(lastRect.y - currentRect.y) < 2 &&
            Math.abs(lastRect.width - currentRect.width) < 2 &&
            Math.abs(lastRect.height - currentRect.height) < 2
        ) {
            await new Promise<void>((resolve) => setTimeout(resolve, 50));
            return;
        }

        lastRect = currentRect;
    }
};

// ✅ Main interaction functions
export const clickElement = async (selector: string): Promise<void> => {
    const element = await locateElement(selector);
    if (!element) {
        throw new Error(`Element not found: ${selector}`);
    }

    await scrollIntoView(element);
    await waitForElementStability(element);

    try {
        element.click();
    } catch (error) {
        try {
            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            });
            element.dispatchEvent(clickEvent);
        } catch (error2) {
            element.focus();
            element.click();
        }
    }

    await waitForPageLoad(1000);
};

export const inputText = async (selector: string, text: string): Promise<void> => {
    const element = await locateElement(selector);
    if (!element) {
        throw new Error(`Element not found: ${selector}`);
    }

    await scrollIntoView(element);
    element.focus();

    const inputElement = element as HTMLInputElement | HTMLTextAreaElement;
    const editableElement = element as HTMLElement;

    if (inputElement.value !== undefined) {
        inputElement.value = '';
    } else if (editableElement.textContent !== undefined) {
        editableElement.textContent = '';
    }

    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        inputElement.value = text;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (editableElement.isContentEditable) {
        editableElement.textContent = text;
        element.dispatchEvent(new Event('input', { bubbles: true }));
    }
};

// ✅ Scrolling functions
export const scrollDown = (amount: number = window.innerHeight): Promise<void> => {
    window.scrollBy(0, amount);
    return new Promise<void>((resolve) => setTimeout(resolve, 100));
};

export const scrollUp = (amount: number = window.innerHeight): Promise<void> => {
    window.scrollBy(0, -amount);
    return new Promise<void>((resolve) => setTimeout(resolve, 100));
};

// ✅ Helper functions
export const createActionButton = (text: string, action: () => Promise<void> | void): ActionButton => ({
    id: `auto-${text.toLowerCase().replace(' ', '-')}`,
    label: text,
    onClick: action,
    title: `Automatically ${text.toLowerCase()}`
});

export const handleElementClick = (element: ClickableElement) => {
    return async (): Promise<void> => {
        try {
            await clickElement(element.selector);
            console.log(`Clicked: ${element.text}`);
        } catch (error) {
            console.error(`Failed to click ${element.text}:`, error);
        }
    };
};

export const createEventListener = (eventType: string, handler: (event: Event) => void) => {
    return (event: Event): void => {
        console.log(`${eventType} event triggered`);
        handler(event);
    };
};

export const removeHighlights = async (): Promise<void> {
    document.getElementById('playwright-highlight-container')?.remove();
}

export const getClickableElements = async (showHighlightElements: boolean, focusElement: number): Promise<DOMState | null> => {
    if (getCurrentUrl() === 'about:blank') {
        const elementTree = new DOMElementNode({
            tagName: 'body',
            xpath: '',
            attributes: {},
            children: [],
            isVisible: false,
            isInteractive: false,
            isTopElement: false,
            isInViewport: false,
            parent: null,
        });

        // Fixed: Return DOMState object instead of array
        return {
            elementTree,
            selectorMap: new Map<number, DOMElementNode>()
        };
    }

    const result = buildDomTree({
        showHighlightElements,
        focusHighlightIndex: focusElement,
    });

    // Fixed: 'results' should be 'result' (typo fix)
    const evalPage = result as BuildDomTreeResult;
    if (!evalPage || !evalPage.map || !evalPage.rootId) {
        throw new Error('Failed to build DOM tree: No result returned or invalid structure');
    }

    return constructDomTree(evalPage);
}

/**
 * Send keyboard keys to the active element or document
 * @param keys - Key combination string (e.g., "Control+A", "Shift+ArrowLeft", "Enter")
 * @param target - Target element (defaults to active element or document.body)
 */
async function sendKeys(keys: string, target?: HTMLElement): Promise<void> {
    // Split combination keys (e.g., "Control+A" or "Shift+ArrowLeft")
    const keyParts = keys.split('+');
    const modifiers = keyParts.slice(0, -1);
    const mainKey = keyParts[keyParts.length - 1];

    // Get target element
    const targetElement = target || (document.activeElement as HTMLElement) || document.body;

    // Track which modifiers are pressed
    const pressedModifiers = new Set<string>();

    try {
        // Press all modifier keys (e.g., Control, Shift, etc.)
        for (const modifier of modifiers) {
            const convertedKey = convertKey(modifier);
            pressedModifiers.add(convertedKey);

            // Dispatch keydown event for modifier
            const keydownEvent = new KeyboardEvent('keydown', {
                key: convertedKey,
                code: getKeyCode(convertedKey),
                ctrlKey: pressedModifiers.has('Control'),
                shiftKey: pressedModifiers.has('Shift'),
                altKey: pressedModifiers.has('Alt'),
                metaKey: pressedModifiers.has('Meta'),
                bubbles: true,
                cancelable: true
            });

            targetElement.dispatchEvent(keydownEvent);
        }

        // Press the main key
        const convertedMainKey = convertKey(mainKey);

        // Dispatch complete key sequence (keydown, keypress, keyup)
        const keydownEvent = new KeyboardEvent('keydown', {
            key: convertedMainKey,
            code: getKeyCode(convertedMainKey),
            ctrlKey: pressedModifiers.has('Control'),
            shiftKey: pressedModifiers.has('Shift'),
            altKey: pressedModifiers.has('Alt'),
            metaKey: pressedModifiers.has('Meta'),
            bubbles: true,
            cancelable: true
        });

        const keypressEvent = new KeyboardEvent('keypress', {
            key: convertedMainKey,
            code: getKeyCode(convertedMainKey),
            ctrlKey: pressedModifiers.has('Control'),
            shiftKey: pressedModifiers.has('Shift'),
            altKey: pressedModifiers.has('Alt'),
            metaKey: pressedModifiers.has('Meta'),
            bubbles: true,
            cancelable: true
        });

        const keyupEvent = new KeyboardEvent('keyup', {
            key: convertedMainKey,
            code: getKeyCode(convertedMainKey),
            ctrlKey: pressedModifiers.has('Control'),
            shiftKey: pressedModifiers.has('Shift'),
            altKey: pressedModifiers.has('Alt'),
            metaKey: pressedModifiers.has('Meta'),
            bubbles: true,
            cancelable: true
        });

        // Dispatch events in sequence
        targetElement.dispatchEvent(keydownEvent);
        if (isTypableKey(convertedMainKey)) {
            targetElement.dispatchEvent(keypressEvent);
        }
        targetElement.dispatchEvent(keyupEvent);

        // Wait for page stability if needed
        await waitForPageAndFramesLoad(0.5);

        console.info('sendKeys complete', keys);
    } catch (error) {
        console.error('Failed to send keys:', error);
        throw new Error(`Failed to send keys: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
        // Release all modifier keys in reverse order
        for (const modifier of [...modifiers].reverse()) {
            try {
                const convertedKey = convertKey(modifier);
                const keyupEvent = new KeyboardEvent('keyup', {
                    key: convertedKey,
                    code: getKeyCode(convertedKey),
                    bubbles: true,
                    cancelable: true
                });
                targetElement.dispatchEvent(keyupEvent);
                pressedModifiers.delete(convertedKey);
            } catch (releaseError) {
                console.error('Failed to release modifier:', modifier, releaseError);
            }
        }
    }
}



// ✅ Main automation object (optional - if you want to group functions)
export const browser = {
    // Navigation
    navigateTo,
    goBack,
    goForward,
    reload,

    // Interaction
    clickElement,
    inputText,

    // Scrolling
    scrollDown,
    scrollUp,

    // Utilities
    getCurrentUrl,
    getTitle,
    sendKeys,

    // Helpers
    createActionButton,
    handleElementClick,
    waitForPageLoad,
    scrollIntoView,
    waitForElementStability
};