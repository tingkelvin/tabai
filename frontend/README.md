# Modern React Chrome Extension

A modern Chrome extension boilerplate built with React 18, Webpack 5, and Tailwind CSS, supporting Manifest V3.

## 🚀 Features

- **Modern Tech Stack**
  - React 18 with Hooks
  - Webpack 5 for bundling
  - Tailwind CSS for styling
  - Babel for ES6+ and JSX
  - Manifest V3 support

- **Extension Components**
  - 🔌 Content Script: Inject React components into web pages
  - 💻 Popup: Custom extension popup interface
  - 🔄 Background Script: Service worker functionality

- **Developer Experience**
  - Hot reload development workflow
  - CSS Modules support
  - Modern JavaScript features
  - Optimized production builds

## 📦 Installation

1. Clone the repository:
   ```bash
   git clone [your-repo-url]
   cd react-chrome-extension
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## 🛠️ Development

### Available Scripts

- Start development mode with hot reload:
  ```bash
  npm run dev
  ```

- Create production build:
  ```bash
  npm run build
  ```

- Clean build directory:
  ```bash
  npm run clean
  ```

### Project Structure
```
react-chrome-extension/
├── src/
│   ├── content/          # Content script files
│   │   ├── index.js
│   │   ├── ContentApp.jsx
│   │   └── content.css
│   ├── popup/           # Popup interface files
│   │   ├── index.js
│   │   ├── PopupApp.jsx
│   │   ├── popup.html
│   │   └── popup.css
│   └── background/      # Service worker
│       └── index.js
├── public/
│   └── manifest.json    # Extension manifest
├── webpack.config.js    # Webpack configuration
└── package.json        # Project dependencies
```

## 🚀 Loading the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `dist` folder (created after building)

## 💻 Development Workflow

1. Make changes to your React components in `src/`
2. Run `npm run dev` for automatic rebuilds
3. Reload the extension in Chrome's extensions page
4. Refresh the webpage to see content script changes

## 🎨 Customization

### Adding New Components

Create new React components in their respective directories:

```jsx
// src/content/MyNewComponent.jsx
import React, { useState } from 'react';

const MyNewComponent = () => {
  const [data, setData] = useState(null);
  
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      {/* Your component JSX */}
    </div>
  );
};

export default MyNewComponent;
```

### Styling with Tailwind CSS

- Use Tailwind CSS utility classes directly in your components
- Create custom styles in your CSS files
- Extend Tailwind's configuration in `tailwind.config.js`

### State Management

- Use React Hooks for local state
- Implement Context API for global state
- Add Redux or Zustand for complex state management

## 📝 Best Practices

- **Security**
  - Follow Content Security Policy (CSP) guidelines
  - Minimize required permissions in manifest
  - Avoid inline scripts and eval()

- **Performance**
  - Monitor bundle size
  - Optimize assets for production
  - Use code splitting when possible

- **Debugging**
  - Use React DevTools for component inspection
  - Check browser console for content script logs
  - Test thoroughly on different websites

## 📦 Production Deployment

1. Create a production build:
   ```bash
   npm run build
   ```
2. The `dist` folder will contain your optimized extension
3. Package the contents for Chrome Web Store submission
4. Test the production build thoroughly

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
