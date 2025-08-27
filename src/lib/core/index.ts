// Main export file for the polite-digital core library

// Configuration
export * from './config';

// Types
export * from './types';
export type { 
    ApiResponse, 
    EshopCartItem, 
    EshopStoreState, 
    ReservationStoreState, 
    ReservationCartPart, 
    Business, 
    Block, 
    Price, 
    PriceOption 
} from './types';

// APIs
export * from './api';

// Services
export * from './services/auth';
export { default as httpClient } from './services/http';

// Stores
export * from './stores/cart';
export * from './stores/eshop';
export * from './stores/reservation';

// Utilities
export * from './utils/blocks';
export * from './utils/errors';
export * from './utils/price';
export * from './utils/svg';
export * from './utils/text';
export * from './utils/timezone';
export * from './utils/validation';

// Re-export commonly used functions for convenience
export { 
    // Price utilities
    getPrice, 
    formatPrice
} from './utils/price';

export { 
    // Validation utilities
    validatePhoneNumber,
    validateEmail,
    validateVerificationCode,
    validateRequired
} from './utils/validation';

export { 
    // Block utilities
    getBlockLabel,
    getBlockTextValue,
    getBlockValue,
    getBlockValues,
    getImageUrl,
    thumbnailUrl
} from './utils/blocks';

export { 
    // Auth utilities
    getGuestToken,
    updateProfilePhone,
    verifyPhoneCode,
    getBusinessConfig
} from './services/auth';

export { 
    // SVG utilities
    fetchSvgContent,
    getSvgContentForAstro,
    injectSvgIntoElement
} from './utils/svg';

export { 
    // Text utilities
    slugify,
    humanize,
    categorify,
    formatDate
} from './utils/text';

export { 
    // Timezone utilities
    findTimeZone,
    tzGroups
} from './utils/timezone';

export { 
    // Error utilities
    getErrorMessage,
    isErrorCode,
    ERROR_CODES,
    ERROR_CONSTANTS
} from './utils/errors';

// Default configuration values
export const CORE_VERSION = '1.0.0';
export const SUPPORTED_FRAMEWORKS = ['astro', 'react', 'vue', 'svelte', 'vanilla'] as const;

// Core initialization function
export function initPoliteDigitalCore(config?: {
    businessId?: string;
    apiUrl?: string;
    storageUrl?: string;
}) {
    console.log(`Polite Digital Core v${CORE_VERSION} initialized`);
    if (config) {
        console.log('Custom configuration provided:', config);
    }
}