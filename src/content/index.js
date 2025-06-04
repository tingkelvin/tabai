import React from 'react';
import { createRoot } from 'react-dom/client';
import ContentApp from './ContentApp';
import './content.css';

// Create container for React app
const container = document.createElement('div');
container.id = 'react-extension-root';
document.body.appendChild(container);

// Create React root and render app
const root = createRoot(container);
root.render(<ContentApp />);

console.log('React Chrome Extension loaded!');