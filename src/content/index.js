// content.js - Fixed version
import React from 'react';
import { createRoot } from 'react-dom/client';
import ContentApp from './ContentApp';
import YouTubeContentApp from './YoutubeContentApp'; // Make sure this matches your actual filename
import './content.css';

// Create container for React app
const container = document.createElement('div');
container.id = 'react-extension-root';
document.body.appendChild(container);

// Create React root and render app
const root = createRoot(container);

// Check if we're on YouTube and render appropriate component
const isYouTube = window.location.hostname.includes('youtube.com');

if (isYouTube) {
  root.render(<YouTubeContentApp />);
} else {
  root.render(<ContentApp />);
}

console.log(`React Chrome Extension loaded on ${isYouTube ? 'YouTube' : 'other site'}!`);