// Price formatting utilities

interface PriceOption {
    basePrice?: number;
    type?: 'standard' | 'custom' | 'complex';
    customValue?: Record<string, string>;
}

interface SimplePrice {
    basePrice: number;
    currency?: string;
}

// format price - handles both complex price options and simple price objects
export function getPrice(priceOption: PriceOption, currency: string, locale: string = 'en'): string {
    if (!priceOption) return "";
    
    // Handle simple price objects (from eshop) - now currency comes from business
    if (priceOption.basePrice && !priceOption.type) {
        return `${priceOption.basePrice} ${currency}`;
    }
    
    // Handle complex price options (from services) - now currency comes from business
    switch (priceOption.type) {
        case "standard":
            return `${priceOption.basePrice} ${currency}`;
        case "custom":
            return priceOption.customValue?.[locale] || priceOption.customValue?.en || '';
        case "complex":
            const val = priceOption.customValue?.[locale] || priceOption.customValue?.en || '';
            return `${priceOption.basePrice} ${currency} + ${val}`;
        default:
            return "";
    }
}

// Enhanced price formatter with currency symbols and rounding
export function formatPrice(priceOption: SimplePrice, currency: string, options: {
    showSymbols?: boolean;
    decimalPlaces?: number;
    locale?: string;
} = {}): string {
    if (!priceOption) return '';
    
    const { 
        showSymbols = true, 
        decimalPlaces = 2,
        locale = 'en' 
    } = options;
    
    let price: number;
    
    // Handle simple price objects (from eshop)
    if (priceOption.basePrice) {
        price = Number(priceOption.basePrice);
    } else {
        return '';
    }
    
    const roundedPrice = price.toFixed(decimalPlaces);
    
    if (!showSymbols) {
        return `${roundedPrice} ${currency}`;
    }
    
    // Format with currency symbols
    switch (currency) {
        case 'USD':
            return `$${roundedPrice}`;
        case 'EUR':
            return `€${roundedPrice}`;
        case 'GBP':
            return `£${roundedPrice}`;
        default:
            return `${roundedPrice} ${currency}`;
    }
}