import express from "express";
import cors from "cors";
import routes from "./routes.js";
import { healthCheck } from "./health.js";
import { runtimeConfig } from "../config/runtime.js";

const app = express();

app.use(cors());
app.use(express.json());

// Malformed JSON protection
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "Bad Request", message: "Malformed JSON payload" });
  }
  next();
});

/* Health check is public */
app.get("/health", healthCheck);

/* All routes are now in the router which handles its own security */
app.use("/", routes);

/* Global 404 */
app.use((req, res) => res.status(404).json({ error: "Route not found" }));

app.listen(runtimeConfig.port, () => {
  console.log(`🚀 Honeypot Server active on port ${runtimeConfig.port}`);
});