// Note: This plugin is for Nitro server which is not currently used
// Keeping as placeholder for future server-side error handling

interface NitroError extends Error {
  message: string;
  stack?: string;
}

interface NitroEvent {
  path?: string;
  method?: string;
}

interface NitroApp {
  hooks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hook: (event: string, handler: (...args: any[]) => void) => void;
  };
}

export default function errorHandlerPlugin(nitroApp: NitroApp): void {
  // Log when the server starts
  console.log("[nitro] Server plugin initialized");

  // Hook into errors
  nitroApp.hooks.hook("error", (error: NitroError, { event }: { event?: NitroEvent }) => {
    console.error("[nitro] Unhandled error:", {
      message: error.message,
      stack: error.stack,
      url: event?.path,
      method: event?.method,
    });
  });

  // Hook into requests for debugging
  nitroApp.hooks.hook("request", (event: NitroEvent) => {
    console.log("[nitro] Request:", event.method, event.path);
  });

  // Hook into responses
  nitroApp.hooks.hook("afterResponse", (event: NitroEvent) => {
    console.log("[nitro] Response sent for:", event.path);
  });
}
