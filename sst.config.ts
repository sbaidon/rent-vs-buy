import type {} from "./.sst/platform/config";

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
    // Upload the image to the `public` folder

    const site = new sst.aws.StaticSite("RentVsBuy", {
      build: {
        command: "npm run build",
        output: "dist/client",
      },
    });

    const server = new sst.aws.Function("ServerApp", {
      architecture: "arm64",
      handler: "entry_aws_lambda.handler",
      url: true,
      copyFiles: [
        {
          from: "public/locales",
          to: "public/locales",
        },
      ],
      runtime: "nodejs22.x",
      environment: {
        NODE_ENV: "production",
      },
    });

    new sst.aws.Router("MyRouter", {
      domain: {
        name: "rentvsbuy.io",
        dns: sst.vercel.dns({
          domain: "rentvsbuy.io",
        }),
      },
      routes: {
        "/assets/*": site.url,
        "/locales/*": site.url,
        "/robots.txt": site.url,
        "/sitemap.xml": site.url,
        "/": server.url,
      },
    });
  },
});
