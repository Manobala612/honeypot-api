import { ENV } from "./env.js";

export const runtimeConfig = {
  port: ENV.PORT || 3000,
  isProduction: ENV.NODE_ENV === "production"
};
