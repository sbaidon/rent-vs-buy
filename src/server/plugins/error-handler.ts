import { definePlugin } from "nitro";

export default definePlugin((nitroApp) => {
  // Log when the server starts
  console.log("[nitro] Server plugin initialized");

  // Hook into errors
  nitroApp.hooks.hook("error", (error, { event }) => {
    console.error("[nitro] Unhandled error:", {
      message: error.message,
      stack: error.stack,
      url: event?.path,
      method: event?.method,
    });
  });

  // Hook into requests for debugging
  nitroApp.hooks.hook("request", (event) => {
    console.log("[nitro] Request:", event.method, event.path);
  });

  // Hook into responses
  nitroApp.hooks.hook("afterResponse", (event) => {
    console.log("[nitro] Response sent for:", event.path);
  });
});
