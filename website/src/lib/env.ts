// src/lib/env.js
const getEnvVar = (name) => {
	return import.meta.env[name];
};

export const API_URL = getEnvVar("PUBLIC_API_URL");
export const BUSINESS_ID = getEnvVar("PUBLIC_BUSINESS_ID");
export const CLIENT_DOMAIN = getEnvVar("PUBLIC_CLIENT_DOMAIN");
export const STORAGE_URL = getEnvVar("PUBLIC_STORAGE_URL");
