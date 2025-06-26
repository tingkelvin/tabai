// 1. Import the style
import './css/style.css'
import ReactDOM from 'react-dom/client'
import ContentApp from './components/ContentApp'
import { onMessage, sendMessage } from '@/entrypoints/background/types/messages'
import { CheckAuthResponse } from '@/entrypoints/background/types/responses'
import Page from './Page'



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

    let page: Page = new Page();
    let ui: any = null

    page.captureState()

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
