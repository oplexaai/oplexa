const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const http = require("http");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.disableHierarchicalLookup = true;

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      if (req.url && req.url.startsWith("/api/")) {
        const proxyOpts = {
          hostname: "localhost",
          port: 8080,
          path: req.url,
          method: req.method,
          headers: { ...req.headers, host: "localhost:8080" },
        };

        const proxyReq = http.request(proxyOpts, (proxyRes) => {
          const headers = Object.assign({}, proxyRes.headers, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          });
          res.writeHead(proxyRes.statusCode || 200, headers);
          proxyRes.pipe(res, { end: true });
        });

        proxyReq.on("error", (err) => {
          console.error("[API Proxy]", err.message);
          if (!res.headersSent) {
            res.writeHead(502, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ message: "API server unavailable" }));
          }
        });

        if (req.method !== "GET" && req.method !== "HEAD") {
          req.pipe(proxyReq, { end: true });
        } else {
          proxyReq.end();
        }
      } else if (req.method === "OPTIONS") {
        res.writeHead(204, {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        });
        res.end();
      } else {
        return middleware(req, res, next);
      }
    };
  },
};

module.exports = config;
