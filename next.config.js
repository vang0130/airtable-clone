/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import("./src/env.js");

/** @type {import("next").NextConfig} */
const config = {
  // Disable webpack cache
  webpack: (config) => {
    config.cache = false;
    return config;
  },
  
  async headers() {
    return [
      {
        // Setting the SameSite and Secure attributes for __vercel_live_token
        source: "/(.*)",
        headers: [
          {
            key: "Set-Cookie",
            value: "__vercel_live_token=value; SameSite=None; Secure",
          }
        ]
      },
      {
        // Applying CORS headers to all API routes
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
          }
        ]
      }
    ];
  }
};

export default config;
