// Core type definitions
// All types are exported individually for better tree-shaking

// Price types
export interface Price {
    basePrice: number;
    currency: string;
}

export interface PriceOption extends Price {
    type?: 'standard' | 'custom' | 'complex';
    customValue?: Record<string, string>;
}

// Cart types
export interface EshopCartItem {
    id: string;
    productId: string;
    variantId: string;
    productName: string;
    productSlug: string;
    variantAttributes: Record<string, any>;
    price: Price;
    quantity: number;
    addedAt: number;
}

export interface ReservationCartPart {
    id: string;
    serviceId: string;
    serviceName: string;
    date: string;
    from: number;
    to: number;
    timeText: string;
    isMultiDay: boolean;
    reservationMethod: string;
    providerId?: string;
    blocks: any[];
}

// Business types
export interface BusinessConfig {
    orderBlocks?: any[];
    reservationBlocks?: any[];
    allowedPaymentMethods?: string[];
    currency?: string;
    stripePublicKey?: string;
}

export interface Business {
    id: string;
    name: string;
    configs?: BusinessConfig;
}

// API Response types
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    cursor?: string;
    total?: number;
}

// Block types
export interface Block {
    id: string;
    key: string;
    type: string;
    properties: any;
    value: any;
}

// Store state types
export interface EshopStoreState {
    businessId: string;
    currency: string;
    orderBlocks: Block[];
    service: {
        reservationBlocks: Block[];
    };
    userToken: string | null;
    processingCheckout: boolean;
    loading: boolean;
    error: string | null;
    phoneNumber: string;
    phoneError: string | null;
    verificationCode: string;
    verifyError: string | null;
    stripeConfig: {
        publicKey: string | null;
        enabled: boolean;
    };
    allowedPaymentMethods: string[];
}

export interface ReservationStoreState {
    currentStep: number;
    totalSteps: number;
    steps: Record<number, { name: string; labelKey: string }>;
    
    // Calendar data
    weekdays: string[];
    monthYear: string;
    days: any[];
    current: Date;
    
    // Selection state
    selectedDate: string | null;
    slots: any[];
    selectedSlot: any | null;
    selectedMethod: string | null;
    selectedProvider: any | null;
    providers: any[];
    
    // Status flags
    loading: boolean;
    startDate: string | null;
    endDate: string | null;
    isMultiDay: boolean;
    
    // Phone verification
    phoneNumber: string;
    phoneError: string | null;
    phoneSuccess: string | null;
    verificationCode: string;
    verifyError: string | null;
    isPhoneVerified: boolean;
    isSendingCode: boolean;
    isVerifying: boolean;
    codeSentAt: number | null;
    canResendAt: number | null;
    
    // Service & config
    guestToken: string | null;
    service: any | null;
    business: Business | null;
    currency: string;
    reservationBlocks: Block[];
    apiUrl: string;
    businessId: string;
    storageUrl: string;
    timezone: string;
    tzGroups: any;
    parts: ReservationCartPart[];
    
    // Payment configuration
    allowedPaymentMethods: string[];
    stripeConfig: {
        publicKey: string | null;
        enabled: boolean;
    };
}