import React from "react";

function LogoPanel() {
  return (
    <div style={{
      alignItems: "center",
      display: "flex",
      justifyContent: "center",
      background: "transparent",
      borderRadius: 20,
      padding: "8px 0"
    }}>
      <img
        src="/logo.png"
        alt="Logo"
        style={{
          width: 180,      // %50 büyütüldü!
          height: "auto",
          background: "transparent",
          display: "block",
        }}
      />
    </div>
  );
}

export default LogoPanel;