/// <reference types="@welldone-software/why-did-you-render" />
import React from "react";

// Only enable in development
if (import.meta.env.DEV) {
  const whyDidYouRender = (await import("@welldone-software/why-did-you-render")).default;
  
  whyDidYouRender(React, {
    trackAllPureComponents: true,
    trackHooks: true,
    logOnDifferentValues: true,
    // Exclude some noisy components
    exclude: [/^BrowserRouter/, /^Link/, /^Route/],
  });
}
