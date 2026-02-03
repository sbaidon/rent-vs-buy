import { defineEventHandler } from "nitro/h3";

export default defineEventHandler(async (event) => {
  console.log("[middleware] Incoming request:", event.method, event.path);
});
