import devConfig from "../config/dev.json";
import prodConfig from "../config/prod.json";

const environment = import.meta.env.PUBLIC_ENVIRONMENT || process.env?.PUBLIC_ENVIRONMENT || "dev";

export const appConfig = environment === "prod" ? prodConfig : devConfig;

export default appConfig;
