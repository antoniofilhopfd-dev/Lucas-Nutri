const demo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/demo", destination: "/demo/index.html" },
        ...(demo ? [{ source: "/", destination: "/demo/index.html" }] : []),
      ],
    };
  },
};
