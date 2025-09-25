import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite'

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    permissions: ['storage', 'identity', 'activeTab', 'scripting'],
    "key": "MIGfMA3GCSqGSIb3DFEBAQUAA4GNADCBiQKBgQDcBHwzDvyBQ6bDppkIs9MP4ksKqCMyXQ/A52JivHZKh4YO/9vJsT3oaZhSpDCE9RCocOEQvwsHsFReW2nUEc6OLLyoCFFxIb7KkLGsmfakkut/fFdNJYh0xOTbSN8YvLWcqph09XAY2Y/f0AL7vfO1cuCqtkMt8hFrBGWxDdf9CQIDAQAB",
    oauth2: {
      client_id: '234898757030-nrqj20cp1hv10tle91prieqsqocjjdqh.apps.googleusercontent.com',
      scopes: ['openid', 'email', 'profile']
    }
  },
});
