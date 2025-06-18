import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";

const Options: React.FC = () => {
  const [setting, setSetting] = useState("");

  useEffect(() => {
    // Load saved settings
    chrome.storage.sync.get(["userSetting"], (result) => {
      setSetting(result.userSetting || "");
    });
  }, []);

  const saveSetting = () => {
    chrome.storage.sync.set({ userSetting: setting }, () => {
      console.log("Setting saved");
    });
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Extension Options</h1>
      <input
        type="text"
        value={setting}
        onChange={(e) => setSetting(e.target.value)}
        placeholder="Enter your setting"
      />
      <button onClick={saveSetting}>Save</button>
    </div>
  );
};

const container = document.getElementById("options-root");
if (container) {
  const root = createRoot(container);
  root.render(<Options />);
}
