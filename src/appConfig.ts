// Simple config loader - imports are resolved at build time
// The environment is determined by .env file or process.env
import devConfig from "../config/dev.json";
import prodConfig from "../config/prod.json";

// Check both process.env (build time) and import.meta.env (runtime)
// Cloudflare Pages sets this as process.env during build
const environment = typeof process !== 'undefined' 
  ? (process.env.ENVIRONMENT || import.meta.env.ENVIRONMENT || "dev")
  : (import.meta.env.ENVIRONMENT || "dev");

// Pick the right config
export const appConfig = environment === "prod" ? prodConfig : devConfig;

export default appConfig;
