import { createFileRoute } from "@tanstack/react-router";
import { debugApi } from "../server/functions/debug";

export const Route = createFileRoute("/debug")({
  loader: async () => {
    return debugApi();
  },
  component: DebugPage,
});

function DebugPage() {
  const data = Route.useLoaderData();
  
  return (
    <div style={{ padding: "2rem", fontFamily: "monospace" }}>
      <h1>API Debug</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
