// Core configuration
const getEnvVar = (name: string): string => {
    return import.meta.env[name] || '';
};

export const API_URL = getEnvVar("PUBLIC_API_URL");
export const BUSINESS_ID = getEnvVar("PUBLIC_BUSINESS_ID");
export const STORAGE_URL = getEnvVar("PUBLIC_STORAGE_URL");