import vikeReact from "vike-react/config";
import type { Config } from "vike/types";
import favicon from "../favicon.ico";
import Layout from "../layout";
import image from "../logo.webp";
// Default config (can be overridden by pages)
// https://vike.dev/config

export default {
  // https://vike.dev/Layout
  Layout,
  // https://vike.dev/head-tags
  title: "Rent vs Buy",
  description:
    "Free calculator to help you decide whether to rent or buy a home. Compare costs of renting vs buying with customizable parameters for your specific situation.",
  extends: vikeReact,
  stream: "web",
  favicon,
  image,
  prerender: true,
} satisfies Config;
