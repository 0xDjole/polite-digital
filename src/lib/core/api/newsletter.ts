// Use direct fetch instead of httpClient to avoid module issues
// import httpClient from '../services/http';
import type { Newsletter, PaginatedResponse } from '../types';

export interface NewsletterFindPayload {
	business_id: string;
}

export interface NewsletterResponse {
	data: Newsletter[];
	meta?: {
		total: number;
		page: number;
		per_page: number;
	};
}

export const newsletterApi = {
	async find(payload: NewsletterFindPayload): Promise<PaginatedResponse<Newsletter>> {
		const params = new URLSearchParams({
			businessId: payload.business_id,
		});

		// Get the backend API URL from environment
		const backendUrl = import.meta.env.PUBLIC_SERVER_URL || 'http://localhost:8000';
		const url = `${backendUrl}/v1/newsletters?${params.toString()}`;

		const response = await fetch(url);
		
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const backendResponse = await response.json();
		
		// Backend returns {items: [], cursor: null}, we need {data: [], meta: {...}}
		return {
			data: backendResponse.items || [],
			meta: {
				total: backendResponse.items?.length || 0,
				page: 1,
				per_page: backendResponse.items?.length || 0,
			}
		};
	},

	async get(id: string): Promise<Newsletter> {
		// Get the backend API URL from environment
		const backendUrl = import.meta.env.PUBLIC_SERVER_URL || 'http://localhost:8000';
		const url = `${backendUrl}/v1/newsletters/${id}`;

		const response = await fetch(url);
		
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		return await response.json();
	},

	async createCheckoutSession({
		newsletterId,
		businessId,
		successUrl,
		cancelUrl
	}: {
		newsletterId: string;
		businessId: string;
		successUrl: string;
		cancelUrl: string;
	}) {
		try {
			// Get the backend API URL from environment
			const backendUrl = import.meta.env.PUBLIC_SERVER_URL || 'http://localhost:8000';
			const url = `${backendUrl}/v1/payments/create-checkout-session`;

			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					newsletterId,
					businessId,
					successUrl,
					cancelUrl,
				}),
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			return {
				success: true,
				data,
			};
		} catch (error) {
			console.error('Checkout session creation error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to create checkout session',
			};
		}
	},
};