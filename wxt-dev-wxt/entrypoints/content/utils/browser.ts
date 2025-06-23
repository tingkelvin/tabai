import { buildDomTree } from "./buildDomTree";
// types/automation.ts - Type definitions
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

// ✅ Element location function
export const locateElement = async (selector: string): Promise<HTMLElement | null> => {
    // Try CSS selector first
    let element = document.querySelector(selector) as HTMLElement | null;

    if (!element && selector.startsWith('//')) {
        // Try XPath if it starts with //
        const result = document.evaluate(
            selector,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
        );
        element = result.singleNodeValue as HTMLElement | null;
    }

    if (!element) {
        // Try text content search
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null
        );

        let node: Node | null;
        while (node = walker.nextNode()) {
            if (node.textContent?.includes(selector)) {
                element = node.parentElement;
                break;
            }
        }
    }

    return element;
};

// ✅ Utility functions
export const isElementVisible = (element: HTMLElement): boolean => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);

    return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        style.opacity !== '0'
    );
};

export const generateSelector = (element: HTMLElement): string => {
    if (element.id) {
        return `#${element.id}`;
    }

    if (element.className) {
        const classes = element.className.split(' ').filter((c: string) => c.trim());
        if (classes.length > 0) {
            return `.${classes.join('.')}`;
        }
    }

    const path: string[] = [];
    let current: HTMLElement | null = element;

    while (current && current !== document.body) {
        let selector = current.tagName.toLowerCase();

        if (current.id) {
            selector += `#${current.id}`;
            path.unshift(selector);
            break;
        }

        const siblings = Array.from(current.parentNode?.children || []);
        const sameTagSiblings = siblings.filter((s: Element) => s.tagName === current!.tagName);

        if (sameTagSiblings.length > 1) {
            const index = sameTagSiblings.indexOf(current) + 1;
            selector += `:nth-of-type(${index})`;
        }

        path.unshift(selector);
        current = current.parentElement;
    }

    return path.join(' > ');
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

export const getClickableElements = (): ClickableElement[] => {
    const clickableSelectors: string[] = [
        'a[href]',
        'button',
        'input[type="button"]',
        'input[type="submit"]',
        'input[type="reset"]',
        '[onclick]',
        '[role="button"]',
        'select',
        'input[type="checkbox"]',
        'input[type="radio"]',
        '[tabindex]:not([tabindex="-1"])'
    ];

    const elements: ClickableElement[] = [];
    clickableSelectors.forEach((selector: string) => {
        const found = document.querySelectorAll(selector);
        found.forEach((el: Element) => {
            const htmlElement = el as HTMLElement;
            if (isElementVisible(htmlElement)) {
                const generatedSelector = generateSelector(htmlElement);
                elements.push({
                    element: htmlElement,
                    tagName: htmlElement.tagName.toLowerCase(),
                    text: htmlElement.textContent?.trim() || '',
                    selector: generatedSelector,
                    rect: htmlElement.getBoundingClientRect(),
                    click: () => clickElement(generatedSelector)
                });
            }
        });
    });

    return elements.filter((el: ClickableElement) => el.rect.width > 0 && el.rect.height > 0);
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

// ✅ Main automation object (optional - if you want to group functions)
export const automation = {
    // Navigation
    navigateTo,
    goBack,
    goForward,
    reload,

    // Interaction
    clickElement,
    inputText,

    // Analysis
    getClickableElements,
    locateElement,

    // Scrolling
    scrollDown,
    scrollUp,

    // Utilities
    getCurrentUrl,
    getTitle,
    isElementVisible,
    generateSelector,

    // Helpers
    createActionButton,
    handleElementClick,
    waitForPageLoad,
    scrollIntoView,
    waitForElementStability
};