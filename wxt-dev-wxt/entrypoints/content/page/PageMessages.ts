// Add these to your existing message types

export interface PageMessages {
    clickElement: {
        index: number
    }
    inputText: {
        index: number
        text: string
    }
    getPageState: {
        useVision?: boolean
        cacheElements?: boolean
    }
    scrollPage: {
        direction: 'up' | 'down'
        amount?: number
    }
    navigateTo: {
        url: string
    }
    selectDropdown: {
        index: number
        text: string
    }
    sendKeys: {
        keys: string
    }
    scrollToText: {
        text: string
    }
    takeScreenshot: {
        fullPage?: boolean
    }
}

// Usage in background script:
// sendMessage('clickElement', { index: 5 });
// sendMessage('inputText', { index: 3, text: 'Hello World' });
// const state = await sendMessage('getPageState', { useVision: true });
