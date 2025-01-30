/// <reference path="./.sst/platform/config.d.ts" />
export default $config({
  app(input) {
    return {
      name: "rent-vs-buy",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
      providers: { "@pulumiverse/vercel": "1.14.3" },
    };
  },
  async run() {
    new sst.aws.StaticSite("RentVsBuy", {
      domain: {
        name: "rentvsbuy.io",
        dns: sst.vercel.dns({
          domain: "rentvsbuy.io",
        }),
      },
      build: {
        command: "npm run build",
        output: "dist",
      },
    });
  },
});
