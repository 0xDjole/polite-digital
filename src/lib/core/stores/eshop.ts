// E-shop store with TypeScript
import { computed, deepMap } from "nanostores";
import { persistentAtom } from "@nanostores/persistent";
import { BUSINESS_ID } from "../config";
import { eshopApi } from "../api/eshop";
import { formatPrice } from "../utils/price";
import * as authService from "../services/auth";
import type { EshopCartItem, EshopStoreState, Block, Price } from "../types";
// Toast notifications should be handled by UI layer

// Frontend cart items
export const cartItems = persistentAtom<EshopCartItem[]>("eshopCart", [], {
    encode: JSON.stringify,
    decode: JSON.parse,
});

// Store for business config and checkout state
export const store = deepMap<EshopStoreState>({
    businessId: BUSINESS_ID,
    currency: "USD", // Business currency
    orderBlocks: [], // Business order form blocks
    service: {
        // Mock service object for DynamicForm compatibility
        reservationBlocks: [],
    },
    userToken: null,
    processingCheckout: false,
    loading: false,
    error: null,
    // Phone verification
    phoneNumber: "",
    phoneError: null,
    verificationCode: "",
    verifyError: null,
    // Payment configuration
    paymentConfig: {
        provider: null,
        enabled: false,
    },
    // Allowed payment methods from business config
    allowedPaymentMethods: ["CASH"], // Default to cash only
});

// Computed values
export const cartTotal = computed([cartItems, store], (items, storeData) => {
    if (!items || items.length === 0) return { basePrice: 0, currency: storeData.currency };

    const total = items.reduce((sum, item) => {
        const itemTotal = item.price.basePrice * item.quantity;
        return sum + itemTotal;
    }, 0);

    return { basePrice: total, currency: storeData.currency };
});

export const cartItemCount = computed(cartItems, (items) => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
});

// Actions
export const actions = {
    // Add item to cart
    addItem(product: any, variant: any, quantity: number = 1) {
        const items = cartItems.get();

        // Check if item already exists in cart
        const existingItemIndex = items.findIndex(
            (item) => item.productId === product.id && item.variantId === variant.id,
        );

        if (existingItemIndex !== -1) {
            // Update existing item quantity
            const updatedItems = [...items];
            updatedItems[existingItemIndex].quantity += quantity;
            cartItems.set(updatedItems);
        } else {
            // Add new item
            const newItem: EshopCartItem = {
                id: crypto.randomUUID(),
                productId: product.id,
                variantId: variant.id,
                productName: product.name,
                productSlug: product.slug,
                variantAttributes: variant.attributes || {},
                price: variant.price,
                quantity,
                addedAt: Date.now(),
            };

            cartItems.set([...items, newItem]);
        }

        // Toast notification should be handled by UI layer
        // showToast(`${product.name} added to cart!`, "success", 3000);
    },

    // Update item quantity
    updateQuantity(itemId: string, newQuantity: number) {
        const items = cartItems.get();
        const updatedItems = items.map((item) =>
            item.id === itemId ? { ...item, quantity: Math.max(1, newQuantity) } : item,
        );
        cartItems.set(updatedItems);
    },

    // Remove item from cart
    removeItem(itemId: string) {
        const items = cartItems.get();
        const updatedItems = items.filter((item) => item.id !== itemId);
        cartItems.set(updatedItems);
        // Toast notification should be handled by UI layer
        // showToast("Item removed from cart!", "success", 2000);
    },

    // Clear entire cart
    clearCart() {
        cartItems.set([]);
    },

    // Get guest token
    async getGuestToken(): Promise<string> {
        const state = store.get();
        const token = await authService.getGuestToken(state.userToken);
        if (token !== state.userToken) {
            store.setKey("userToken", token);
        }
        return token;
    },

    // Load business order blocks and configuration
    async loadOrderBlocks() {
        try {
            store.setKey("loading", true);
            store.setKey("error", null);

            const result = await authService.getBusinessConfig(BUSINESS_ID);

            if (result.success) {
                const business = result.data;
                const orderBlocks = business.configs?.orderBlocks || [];
                store.setKey("orderBlocks", orderBlocks);
                // Set for DynamicForm compatibility
                store.setKey("service", { reservationBlocks: orderBlocks });

                // Load allowed payment methods
                const allowedPaymentMethods = business.configs?.allowedPaymentMethods || ["CASH"];
                store.setKey("allowedPaymentMethods", allowedPaymentMethods);

                // Load business currency
                const currency = business.configs?.currency || "USD";
                store.setKey("currency", currency);

                // Load payment provider configuration
                const paymentConfig = {
                    provider: business.configs?.paymentProvider || null,
                    enabled: allowedPaymentMethods.includes("CREDIT_CARD") && !!business.configs?.paymentProvider,
                };
                store.setKey("paymentConfig", paymentConfig);
            } else {
                // Fallback to default checkout blocks if API fails
                const defaultBlocks: Block[] = [
                    {
                        id: crypto.randomUUID(),
                        key: "email",
                        type: "text",
                        properties: {
                            label: { en: "Email Address" },
                            isRequired: true,
                            placeholder: "your@email.com",
                        },
                        value: null,
                    },
                    {
                        id: crypto.randomUUID(),
                        key: "fullName",
                        type: "text",
                        properties: {
                            label: { en: "Full Name" },
                            isRequired: true,
                            placeholder: "John Doe",
                        },
                        value: null,
                    },
                ];
                store.setKey("orderBlocks", defaultBlocks);
                // Set for DynamicForm compatibility
                store.setKey("service", { reservationBlocks: defaultBlocks });
            }
        } catch (err) {
            console.error("Error loading order blocks:", err);
            store.setKey("error", "Failed to load order configuration");
        } finally {
            store.setKey("loading", false);
        }
    },

    // Prepare order items for checkout API
    prepareOrderItems() {
        const items = cartItems.get();
        return items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
        }));
    },

    // Get order info blocks (they already have values from DynamicForm)
    getOrderInfoBlocks(): Block[] {
        return store.get().orderBlocks || [];
    },

    // Process checkout
    async checkout(paymentMethod: string = "CASH") {
        const items = cartItems.get();
        if (!items.length) {
            // Toast should be handled by UI layer
            // showToast("Cart is empty", "error", 3000);
            return { success: false, error: "Cart is empty" };
        }

        try {
            store.setKey("processingCheckout", true);
            store.setKey("error", null);

            const token = await this.getGuestToken();
            const orderItems = this.prepareOrderItems();
            const blocks = this.getOrderInfoBlocks();

            const response = await eshopApi.checkout({
                token,
                businessId: BUSINESS_ID,
                items: orderItems,
                paymentMethod,
                blocks,
            });

            if (response.success) {
                // Don't clear cart yet - let the calling code decide when to clear
                return {
                    success: true,
                    data: {
                        orderId: response.data.orderId,
                        orderNumber: response.data.orderNumber,
                        clientSecret: response.data.clientSecret,
                    },
                };
            } else {
                throw new Error(response.error || "Failed to place order");
            }
        } catch (err: any) {
            const errorMessage = `Checkout failed: ${err.message}`;
            store.setKey("error", errorMessage);
            console.error("Checkout error:", err);
            return { success: false, error: errorMessage };
        } finally {
            store.setKey("processingCheckout", false);
        }
    },

    // Phone verification for eshop
    async updateProfilePhone(): Promise<boolean> {
        try {
            const token = await this.getGuestToken();
            const phoneNumber = store.get().phoneNumber;

            await authService.updateProfilePhone(token, phoneNumber);
            store.setKey("phoneError", null);
            return true;
        } catch (error: any) {
            console.error("Phone update error:", error);
            store.setKey("phoneError", error.message);
            return false;
        }
    },

    async verifyPhoneCode(): Promise<boolean> {
        try {
            const token = await this.getGuestToken();
            const phoneNumber = store.get().phoneNumber;
            const verificationCode = store.get().verificationCode;

            await authService.verifyPhoneCode(token, phoneNumber, verificationCode);
            store.setKey("verifyError", null);
            return true;
        } catch (error: any) {
            console.error("Phone verification error:", error);
            store.setKey("verifyError", error.message);
            return false;
        }
    },

    // Format price for display (using shared utility)
    formatPrice(priceOption: Price): string {
        const currency = store.get().currency;
        return formatPrice(priceOption, currency);
    },
};

// Initialize the store
export function initEshopStore() {
    // Load order blocks on initialization
    actions.loadOrderBlocks();
}

export default { store, actions, cartItems, cartTotal, cartItemCount, initEshopStore };