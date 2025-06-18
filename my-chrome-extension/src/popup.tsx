import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "./popup.css";

const Popup: React.FC = () => {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    setCount(count + 1);
    // Example Chrome API usage
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      console.log("Current tab:", tabs[0]);
    });
  };

  return (
    <div className="popup">
      <h1>My Chrome Extension</h1>
      <p>Count: {count}</p>
      <button onClick={handleClick}>Click me!</button>
    </div>
  );
};

const container = document.getElementById("popup-root");
if (container) {
  const root = createRoot(container);
  root.render(<Popup />);
}
