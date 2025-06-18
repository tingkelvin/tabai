// Content script runs in the context of web pages
console.log('Content script loaded');

// Example: Add a button to the page
const button = document.createElement('button');
button.textContent = 'My Extension Button';
button.style.position = 'fixed';
button.style.top = '10px';
button.style.right = '10px';
button.style.zIndex = '9999';
button.addEventListener('click', () => {
  alert('Hello from Chrome Extensionhihi2!');
});

document.body.appendChild(button);