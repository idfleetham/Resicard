import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Registering a service worker is what makes the browser offer "install".
// Ours caches nothing (see client/public/sw.js), so there is no stale-version risk.
if ("serviceWorker" in navigator && window.location.protocol === "https:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Not being installable is not worth an error to the user.
    });
  });
}
