import express from "express";
import cors from "cors";
import routes from "./routes.js";
import { healthCheck } from "./health.js";
import { runtimeConfig } from "../config/runtime.js";
import { errorHandler, notFoundHandler } from "../utils/errorHandler.js";

const app = express();

app.use(cors());

/* JSON parser with malformed JSON protection */
app.use(express.json());
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      error: "Bad Request",
      message: "Malformed JSON payload"
    });
  }
  next(err);
});

/* Health endpoint */
app.get("/health", healthCheck);

/* API routes */
app.use("/", routes);

/* 404 handler */
app.use(notFoundHandler);

/* Global error handler */
app.use(errorHandler);

/* Start server */
app.listen(runtimeConfig.port, () => {
  console.log(`Server running on port ${runtimeConfig.port}`);
});
