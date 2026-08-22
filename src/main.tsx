import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Retire the pre-React branded splash (index.html) once React has painted.
// Double rAF waits for the first app frame, then the splash fades out.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const splash = document.getElementById("app-splash");
    if (!splash) return;
    splash.classList.add("hide");
    setTimeout(() => splash.remove(), 450);
  });
});
