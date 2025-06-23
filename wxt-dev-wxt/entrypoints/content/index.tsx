// 1. Import the style
import './css/style.css'
import ReactDOM from 'react-dom/client'
import ContentApp from './components/ContentApp'
import { onMessage, sendMessage } from '@/entrypoints/background/types/messages'
import { CheckAuthResponse } from '@/entrypoints/background/types/responses'
import Page from './page/Page'

let page: Page | null = null

export default defineContentScript({
    matches: ['<all_urls>'],
    // 2. Set cssInjectionMode
    cssInjectionMode: 'ui',

    async main(ctx) {
        const response: CheckAuthResponse = await sendMessage('checkAuth')
        const extensionStorage = storage.defineItem<boolean>(
            'sync:extensionEnabled'
        )
        const isExtensionEnabled = await extensionStorage.getValue()
        console.log('Content script loaded')

        let ui: any = null

        onMessage('toggleExtension', ({ data }) => {
            console.log('Extension toggled:', data.enabled)

            if (data.enabled && !ui) {
                // Mount UI when enabled
                mountUI()
            } else if (!data.enabled && ui) {
                // Remove UI when disabled
                ui.remove()
                ui = null
            }
        })

        // Initialize page instance
        page = new Page({
            displayHighlights: true,
            viewportExpansion: 100,
        })

        // Handle page automation messages
        onMessage('clickElement', async ({ data }) => {
            if (!page) return
            const element = page.getDomElementByIndex(data.index)
            if (element) {
                await page.clickElementNode(true, element)
            }
        })

        onMessage('inputText', async ({ data }) => {
            if (!page) return
            const element = page.getDomElementByIndex(data.index)
            if (element) {
                await page.inputTextElementNode(true, element, data.text)
            }
        })

        onMessage('getPageState', async ({ data }) => {
            if (!page) return null
            return await page.getState(
                data.useVision || false,
                data.cacheElements || false
            )
        })

        onMessage('scrollPage', async ({ data }) => {
            if (!page) return
            if (data.direction === 'down') {
                await page.scrollDown(data.amount)
            } else {
                await page.scrollUp(data.amount)
            }
        })

        onMessage('navigateTo', async ({ data }) => {
            if (!page) return
            await page.navigateTo(data.url)
        })

        onMessage('selectDropdown', async ({ data }) => {
            if (!page) return
            return await page.selectDropdownOption(data.index, data.text)
        })

        onMessage('sendKeys', async ({ data }) => {
            if (!page) return
            await page.sendKeys(data.keys)
        })

        onMessage('scrollToText', async ({ data }) => {
            if (!page) return
            return await page.scrollToText(data.text)
        })

        onMessage('takeScreenshot', async ({ data }) => {
            if (!page) return
            return await page.takeScreenshot(data.fullPage || false)
        })

        onMessage('toggleExtension', ({ data }) => {
            console.log('Extension toggled:', data.enabled)

            if (data.enabled && !ui) {
                mountUI()
            } else if (!data.enabled && ui) {
                ui.remove()
                ui = null
            }
        })

        const mountUI = async () => {
            ui = await createShadowRootUi(ctx, {
                name: 'example-ui',
                position: 'inline',
                anchor: 'body',
                onMount: (container) => {
                    const app = document.createElement('div')
                    container.append(app)
                    const root = ReactDOM.createRoot(app)
                    root.render(<ContentApp />)
                    return root
                },
                onRemove: (root) => {
                    root?.unmount()
                },
            })
            ui.mount()
        }
        await mountUI()
        // Initial mount if authenticated and enabled
        if (response.isAuthenticated && isExtensionEnabled) {
            await mountUI()
        }
    },
})
