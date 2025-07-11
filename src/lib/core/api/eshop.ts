import { API_URL } from '../config';
import type { ApiResponse } from '../types';
import { reservationApi } from './reservation';
import httpClient from '../services/http';

export const eshopApi = {
    // Get products
    async getProducts({ 
        businessId, 
        categoryIds = null, 
        status = "Published", 
        limit = 20, 
        cursor = null 
    }: {
        businessId: string;
        categoryIds?: string[] | null;
        status?: string;
        limit?: number;
        cursor?: string | null;
    }) {
        const url = `${API_URL}/v1/businesses/${encodeURIComponent(businessId)}/products`;
        
        const response = await httpClient.get(url, {
            params: {
                categoryIds: categoryIds && categoryIds.length > 0 ? categoryIds : undefined,
                status,
                limit,
                cursor
            }
        });

        if (response.success) {
            const json = response.value;
            return {
                success: true,
                data: json.items || [],
                cursor: json.cursor,
                total: json.total || 0,
            };
        } else {
            console.error("Error fetching products:", response.error);
            return {
                success: false,
                error: response.error,
                data: [],
            };
        }
    },

    // Get product by slug
    async getProductBySlug({ businessId, slug }: { businessId: string; slug: string }) {
        try {
            const url = `${API_URL}/v1/businesses/${encodeURIComponent(businessId)}/products/slug/${encodeURIComponent(businessId)}/${encodeURIComponent(slug)}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error("Product not found");
            const json = await res.json();
            return {
                success: true,
                data: json,
            };
        } catch (e: any) {
            console.error("Error fetching product:", e);
            return {
                success: false,
                error: e.message,
                data: null,
            };
        }
    },

    // Checkout (direct from cart items, no backend cart)
    async checkout({ 
        token, 
        businessId, 
        items, 
        paymentMethod, 
        blocks, 
        paymentIntentId = null 
    }: {
        token: string;
        businessId: string;
        items: any[];
        paymentMethod: string;
        blocks: any[];
        paymentIntentId?: string | null;
    }) {
        try {
            const payload: any = {
                businessId,
                items,
                paymentMethod,
                blocks,
                ...(paymentIntentId && { paymentIntentId }),
            };

            const res = await fetch(`${API_URL}/v1/businesses/${encodeURIComponent(businessId)}/orders/checkout`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const error = (await res.text()) || res.statusText;
                throw new Error(error);
            }

            const json = await res.json();
            return {
                success: true,
                data: json,
            };
        } catch (e: any) {
            return {
                success: false,
                error: e.message,
            };
        }
    },

    // Create payment intent for Stripe
    async createPaymentIntent({ amount, currency, businessId }: { amount: number; currency: string; businessId: string }) {
        try {
            const tokenResponse = await reservationApi.getGuestToken();
            if (!tokenResponse.success || !tokenResponse.data) {
                throw new Error('Failed to get guest token');
            }
            const token = tokenResponse.data.token;
            
            const res = await fetch(`${API_URL}/v1/businesses/${encodeURIComponent(businessId)}/payment/create-intent`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    amount,
                    currency,
                    businessId,
                }),
            });

            if (!res.ok) {
                const error = (await res.text()) || res.statusText;
                throw new Error(error);
            }

            const json = await res.json();
            return {
                success: true,
                data: json,
            };
        } catch (e: any) {
            console.error('Payment intent creation failed:', e);
            return {
                success: false,
                error: e.message,
            };
        }
    },
};