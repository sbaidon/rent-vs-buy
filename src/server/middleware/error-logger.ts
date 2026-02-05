// Note: This middleware is for Nitro/H3 server which is not currently used
// Keeping as placeholder for future server-side error handling

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function errorLogger(event: any): Promise<void> {
  console.log("[middleware] Incoming request:", event.method, event.path);
}
