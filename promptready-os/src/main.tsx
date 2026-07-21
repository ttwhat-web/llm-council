import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "@/App";
import { bootExecutors } from "@/services/executors";
import "@/styles/globals.css";

// Register Operator's verbs (email today; calendar / WhatsApp / Stripe
// / computer-use later) before the first render so the action queue can
// resolve them.
bootExecutors();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
