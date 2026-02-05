// Must be first import for why-did-you-render to work
import "./wdyr";

import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const router = createRouter({
    routeTree,
    defaultPreload: "intent",
    // Disable scroll restoration - it was causing scroll-to-top on URL changes
    // from slider interactions (replaceState triggers were being treated as navigation)
    scrollRestoration: false,
    // Disable view transitions to prevent shimmer effect during slider interactions
    // View transitions were causing fade-in/fade-out animations on state updates
    defaultViewTransition: false,
  });
  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
