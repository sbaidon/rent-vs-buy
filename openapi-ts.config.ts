import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "./src/api/realtor-api.yaml",
  output: {
    path: "./src/api/generated",
    format: "prettier",
  },
  plugins: [
    "@hey-api/typescript",
    "@hey-api/sdk",
    {
      name: "zod",
      exportFromIndex: true,
    },
  ],
});
