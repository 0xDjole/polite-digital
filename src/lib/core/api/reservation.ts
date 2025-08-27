import { API_URL } from '../config';
import type { ApiResponse } from '../types';
import httpClient from '../services/http';

export const reservationApi = {
    // Get available slots for a service
    async getAvailableSlots({
        businessId,
        serviceId,
        from,
        to,
        limit = 1000,
        providerId = null,
    }: {
        businessId: string;
        serviceId: string;
        from: number;
        to: number;
        limit?: number;
        providerId?: string | null;
    }) {
        const url = `${API_URL}/v1/businesses/${businessId}/services/${serviceId}/available-slots`;
        
        const response = await httpClient.get(url, {
            params: {
                from,
                to,
                limit,
                providerId
            }
        });

        if (response.success) {
            const json = response.value;
            return {
                success: true,
                data: json.data?.items || json.items || [],
            };
        } else {
            console.error("Error fetching available slots:", response.error);
            return {
                success: false,
                error: response.error,
                data: [],
            };
        }
    },

    // Get all providers for a service
    async getProviders({ businessId, serviceId, limit = 50 }: { businessId: string; serviceId: string; limit?: number }) {
        const url = `${API_URL}/v1/businesses/${businessId}/providers`;
        
        const response = await httpClient.get(url, {
            params: {
                serviceId,
                limit
            }
        });

        if (response.success) {
            const json = response.value;
            return {
                success: true,
                data: json.items || [],
            };
        } else {
            console.error("Error loading providers:", response.error);
            return {
                success: false,
                error: response.error,
                data: [],
            };
        }
    },

    // Get guest token or create a new one
    async getGuestToken(): Promise<ApiResponse<{ token: string }>> {
        try {
            const res = await fetch(`${API_URL}/v1/users/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ provider: "GUEST" }),
            });

            if (!res.ok) throw new Error("Guest login failed");

            const json = await res.json();

            return {
                success: true,
                data: { token: json.accessToken },
            };
        } catch (e: any) {
            return {
                success: false,
                error: e.message,
            };
        }
    },

    // Update user's phone number
    async updateProfilePhone({ token, phoneNumber }: { token: string; phoneNumber: string }) {
        try {
            const res = await fetch(`${API_URL}/v1/users/update`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    phoneNumber,
                    phoneNumbers: [],
                    addresses: [],
                }),
            });

            if (!res.ok) {
                const error = (await res.text()) || res.statusText;
                return {
                    success: false,
                    error,
                };
            }

            return {
                success: true,
            };
        } catch (e: any) {
            return {
                success: false,
                error: e.message,
            };
        }
    },

    // Verify phone number with code
    async verifyPhoneCode({ token, phoneNumber, code }: { token: string; phoneNumber: string; code: string }) {
        try {
            const res = await fetch(`${API_URL}/v1/users/confirm/phone-number`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    phoneNumber,
                    code,
                }),
            });

            if (!res.ok) {
                const error = (await res.text()) || res.statusText;
                return {
                    success: false,
                    error,
                };
            }

            return {
                success: true,
            };
        } catch (e: any) {
            return {
                success: false,
                error: e.message,
            };
        }
    },

    // Complete reservation checkout
    async checkout({ 
        token, 
        businessId, 
        parts, 
        paymentMethod = "CASH", 
        blocks = [] 
    }: {
        token: string;
        businessId: string;
        parts: any[];
        paymentMethod?: string;
        blocks?: any[];
    }) {
        try {
            const payload: any = {
                businessId,
                blocks: blocks,
                parts: parts.map((p) => ({
                    serviceId: p.serviceId,
                    from: p.from,
                    to: p.to,
                    blocks: p.blocks,
                    reservationMethod: p.reservationMethod,
                    providerId: p.providerId,
                })),
            };

            // Only add payment method if it's defined (not for inquiry-only reservations)
            if (paymentMethod !== undefined) {
                payload.paymentMethod = paymentMethod;
            }

            const res = await fetch(`${API_URL}/v1/reservations`, {
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
                data: json, // Should include reservationId and clientSecret for payments
            };
        } catch (e: any) {
            return {
                success: false,
                error: e.message,
            };
        }
    },
};