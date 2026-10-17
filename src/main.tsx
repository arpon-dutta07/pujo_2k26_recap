import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/galada/400.css";
import "@fontsource/hind-siliguri/400.css";
import "@fontsource/hind-siliguri/500.css";
import "@fontsource/hind-siliguri/600.css";
import "@fontsource/hind-siliguri/700.css";
import "@fontsource/tiro-bangla/400.css";
import "./styles.css";
import { App } from "./App";

const root = createRoot(document.getElementById("root")!);

// Dev-only template and sticker sheet: /?gallery
if (import.meta.env.DEV && new URLSearchParams(location.search).has("gallery")) {
  void import("./dev/Gallery").then(({ Gallery }) => root.render(<Gallery />));
} else {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
