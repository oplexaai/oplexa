import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

const DEPLOY_SCRIPT = "/home/runner/workspace/deploy_oplexa.py";
app.get("/dl/deploy_oplexa.py", (_req, res) => {
  if (fs.existsSync(DEPLOY_SCRIPT)) {
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Content-Disposition", "attachment; filename=deploy_oplexa.py");
    res.sendFile(DEPLOY_SCRIPT);
  } else {
    res.status(404).send("not found");
  }
});
app.get("/api-server/dl/deploy_oplexa.py", (_req, res) => {
  if (fs.existsSync(DEPLOY_SCRIPT)) {
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Content-Disposition", "attachment; filename=deploy_oplexa.py");
    res.sendFile(DEPLOY_SCRIPT);
  } else {
    res.status(404).send("not found");
  }
});

if (process.env.NODE_ENV === "production") {
  const publicDir = path.resolve(__dirname, "public");
  app.use(express.static(publicDir));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });
}

export default app;
