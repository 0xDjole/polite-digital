// Simple config loader - imports are resolved at build time
// The environment is determined by .env file
import devConfig from "../config/dev.json";
import prodConfig from "../config/prod.json";

// Astro passes this from the .env file
const environment = import.meta.env.ENVIRONMENT || "dev";

// Pick the right config
export const appConfig = environment === "prod" ? prodConfig : devConfig;

export default appConfig;
