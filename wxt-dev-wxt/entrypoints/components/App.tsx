import React, { useState } from "react";

interface AppProps {
  title?: string;
}

const App: React.FC<AppProps> = ({ title = "Test App" }) => {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState("");

  const handleClick = () => {
    setCount((prev) => prev + 1);
    setMessage(`Button clicked ${count + 1} times!`);
  };

  const resetCount = () => {
    setCount(0);
    setMessage("");
  };

  return (
    <div
      style={{
        padding: "20px",
        fontFamily: "Arial, sans-serif",
        maxWidth: "400px",
        margin: "0 auto",
        textAlign: "center",
      }}
    >
      <h1 style={{ color: "#333" }}>{title}</h1>

      <div style={{ margin: "20px 0" }}>
        <p>
          Count: <strong>{count}</strong>
        </p>
        {message && (
          <p style={{ color: "#007bff", fontWeight: "bold" }}>{message}</p>
        )}
      </div>

      <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
        <button
          onClick={handleClick}
          style={{
            padding: "10px 20px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Click Me
        </button>

        <button
          onClick={resetCount}
          style={{
            padding: "10px 20px",
            backgroundColor: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Reset
        </button>
      </div>

      <div
        style={{
          marginTop: "20px",
          padding: "10px",
          backgroundColor: "#f8f9fa",
          borderRadius: "4px",
        }}
      >
        <p style={{ margin: 0, fontSize: "14px", color: "#666" }}>
          Extension is working! 🎉
        </p>
      </div>
    </div>
  );
};

export default App;
