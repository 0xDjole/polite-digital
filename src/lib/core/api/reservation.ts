import { API_URL } from '../config';
import type { ApiResponse } from '../types';

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
        let url = `${API_URL}/v1/businesses/${businessId}/services/${serviceId}/available-slots?from=${from}&to=${to}&limit=${limit}`;

        if (providerId) {
            url += `&providerId=${providerId}`;
        }

        try {
            const res = await fetch(url);
            const json = await res.json();
            return {
                success: true,
                data: json.data?.items || json.items || [],
            };
        } catch (e: any) {
            console.error("Error fetching available slots:", e);
            return {
                success: false,
                error: e.message,
                data: [],
            };
        }
    },

    // Get all providers for a service
    async getProviders({ businessId, serviceId, limit = 50 }: { businessId: string; serviceId: string; limit?: number }) {
        try {
            const url = `${API_URL}/v1/businesses/${businessId}/providers?serviceId=${serviceId}&limit=${limit}`;
            const res = await fetch(url);
            const json = await res.json();
            return {
                success: true,
                data: json.items || [],
            };
        } catch (e: any) {
            console.error("Error loading providers:", e);
            return {
                success: false,
                error: e.message,
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