// 1. Import the style
import "./css/style.css";
import ReactDOM from "react-dom/client";
import ContentApp from "./components/ContentApp";
import {
  onMessage,
  sendMessage,
} from "@/entrypoints/background/types/messages";

import {
  ToggleExtensionRequest,
  navigateToRequest,
} from "@/entrypoints/background/types/requests";
import { CheckAuthResponse } from "@/entrypoints/background/types/responses";
import Page from "./Page";

export default defineContentScript({
  matches: ["<all_urls>"],
  // 2. Set cssInjectionMode
  cssInjectionMode: "ui",

  async main(ctx) {
    const response: CheckAuthResponse = await sendMessage("checkAuth");
    const extensionStorage = storage.defineItem<boolean>(
      "sync:extensionEnabled"
    );
    const isExtensionEnabled = await extensionStorage.getValue();
    console.log("Content script loaded");

    let page: Page = new Page();
    let ui: any = null;

    onMessage(
      "navigateTo",
      ({ data: { url } }: { data: navigateToRequest }) => {
        page.navigateTo(url);
      }
    );

    onMessage(
      "captureState",
      async () => {
        console.log("Capturing state...");
        const state = await page.captureState();
        console.log("Captured state:", state);
      }
    )

    onMessage("waitForPageLoad", async () => {
      if (document.readyState === 'complete') return;

      return new Promise(resolve => {
        const handler = () => {
          if (document.readyState === 'complete') {
            resolve();
          }
        };
        document.addEventListener('readystatechange', handler);
        window.addEventListener('load', () => {
          document.removeEventListener('readystatechange', handler);
          resolve();
        }, { once: true });
      });
    });

    onMessage(
      "toggleExtension",
      ({ data: { enabled } }: { data: ToggleExtensionRequest }) => {
        console.log("Extension toggled:", enabled);
        if (enabled && !ui) {
          mountUI();
        } else if (!enabled && ui) {
          ui.remove();
          ui = null;
        }
      }
    );

    const mountUI = async () => {
      ui = await createShadowRootUi(ctx, {
        name: "example-ui",
        position: "inline",
        anchor: "body",
        onMount: (container) => {
          const app = document.createElement("div");
          container.append(app);
          const root = ReactDOM.createRoot(app);
          root.render(<ContentApp />);
          return root;
        },
        onRemove: (root) => {
          root?.unmount();
        },
      });
      ui.mount();
    };
    await mountUI();
    // Initial mount if authenticated and enabled
    if (response.isAuthenticated && isExtensionEnabled) {
      await mountUI();
    }
  },
});
