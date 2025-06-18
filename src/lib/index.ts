import { API_URL, BUSINESS_ID } from "@lib/env";
import { z } from "zod";
import httpClient from "@lib/httpClient";

export { BUSINESS_ID };

export const typeIcons = {
	text: "mdi:text",
	number: "mdi:numeric",
	html: "mdi:code-tags",
	select: "mdi:select",
	range: "mdi:arrow-left-right",
	date: "mdi:calendar",
	boolean: "mdi:checkbox-marked-outline",
	geo_location: "mdi:map-marker",
	block: "mdi:asterisk",
	media: "mdi:upload",
};

export interface Block {
	id: string;
	key: Record<string, string>;
	type: string;
	properties: any;
	value: any;
}

export interface Collection {
	id: string;
	blocks: Block[];
}

export interface CollectionEntry {
	id: string;
	collection_id: string;
	blocks: Block[];
}

export interface ApiResponse<T> {
	items: T[];
	cursor?: string;
	total: number;
}

export const blockTypes = {
	text: {
		label: "Text",
		properties: {
			isRequired: false,
			placeholder: "",
			helpText: "",
		},
	},
	number: {
		label: "Number",
		properties: {
			isRequired: false,
			min: null,
			max: null,
			helpText: "",
		},
	},
	select: {
		label: "Select",
		properties: {
			isRequired: false,
			options: [],
			isMultiSelect: false,
			helpText: "",
		},
	},
	date: {
		label: "Date",
		properties: {
			isRequired: false,
			helpText: "",
		},
	},
	boolean: {
		label: "Boolean",
		properties: {
			checkboxLabel: "",
			helpText: "",
		},
	},
	html: {
		label: "Rich Text",
		properties: {
			isRequired: false,
			helpText: "",
		},
	},
	media: {
		label: "Media Upload",
		properties: {
			isRequired: false,
			acceptedTypes: "image/*",
			helpText: "",
		},
	},
};

const collectionSchema = z.object({});

const getCollection = async (id) => {
	const url = `${API_URL}/v1/businesses/${BUSINESS_ID}/collections/${id}`;
	const { value } = await httpClient.get(url);
	return value;
};

const getCollections = async ({ name = null, ids = null }) => {
	let url = `${API_URL}/v1/businesses/${BUSINESS_ID}/collections`;

	const queryParams = [];

	if (name) {
		queryParams.push(`name=${encodeURIComponent(name)}`);
	}

	if (ids) {
		const idsJson = JSON.stringify(ids);
		queryParams.push(`ids=${encodeURIComponent(idsJson)}`);
	}

	if (queryParams.length > 0) {
		url += `?${queryParams.join("&")}`;
	}

	const response = await httpClient.get(url);
	return response.value;
};

const getCollectionEntries = async ({ collectionId, limit, cursor, ids = null }) => {
	let url = `${API_URL}/v1/businesses/${BUSINESS_ID}/collections/${collectionId}/entries`;

	const queryParams = [];

	if (limit) {
		queryParams.push(`limit=${limit}`);
	}

	if (cursor) {
		queryParams.push(`cursor=${cursor}`);
	}

	if (ids) {
		const idsJson = JSON.stringify(ids);
		queryParams.push(`ids=${encodeURIComponent(idsJson)}`);
	}

	if (queryParams.length > 0) {
		url += `?${queryParams.join("&")}`;
	}

	const response = await httpClient.get(url);
	return response.value;
};

const createCollectionEntry = async (collectionEntryData) => {
	const url = `${API_URL}/v1/businesses/${BUSINESS_ID}/collections/${collectionEntryData.collectionId}/entries`;

	const result = await httpClient.post(url, collectionEntryData, {
		successMessage: "Created successfully",
		errorMessage: "Failed to create collection",
		schema: collectionSchema,
	});

	return result;
};

const getCollectionEntry = async ({ collectionId, id }) => {
	const url = `${API_URL}/v1/businesses/${BUSINESS_ID}/collections/${collectionId}/entries/${id}`;

	const response = await httpClient.get(url);

	return response;
};

export function getBlockLabel(block: any): string {
	if (!block) return "";

	if (block.properties?.label) {
		return block.properties.label;
	}

	return block.key || "";
}

export function createBlock(type: string, key: string, label?: string): any {
	if (!blockTypes[type]) {
		throw new Error(`Unknown block type: ${type}`);
	}

	return {
		key,
		type,
		properties: {
			...blockTypes[type].properties,
			label: label || key,
		},
		value: null,
	};
}

export function formatBlockValue(block: any): string {
	if (!block || block.value === null || block.value === undefined) {
		return "";
	}

	switch (block.type) {
		case "boolean":
			return block.value ? "Yes" : "No";
		case "date":
			try {
				return new Date(block.value).toLocaleDateString();
			} catch (e) {
				return String(block.value);
			}
		case "media":
			if (typeof block.value === "object" && block.value.url) {
				return block.value.url;
			}
			return String(block.value);
		default:
			return String(block.value);
	}
}

export function prepareBlocksForSubmission(formData: any): any[] {
	const preparedBlocks = [];

	Object.keys(formData).forEach((key) => {
		if (formData[key] !== null && formData[key] !== undefined) {
			preparedBlocks.push({
				key,
				value: [formData[key]],
			});
		}
	});

	return preparedBlocks;
}

export function extractBlockValues(blocks: any[]): Record<string, any> {
	const values: Record<string, any> = {};

	blocks.forEach((block) => {
		if (block.value && block.value.length > 0) {
			values[block.key] = block.value[0];
		} else {
			values[block.key] = null;
		}
	});

	return values;
}

export const getBlockValue = (entry, blockKey) => {
	if (!entry || !entry.blocks) return null;

	const block = entry.blocks.find((f) => f.key === blockKey);

	if (!block || !block.value || block.value.length === 0) return null;

	return block.value[0];
};

export const getBlockValues = (entry, blockKey) => {
	if (!entry || !entry.blocks) return null;

	const block = entry.blocks.find((f) => f.key === blockKey);

	if (!block || !block.value || block.value.length === 0) return null;

	return block.value;
};

function unwrapBlock(block: any, locale: string) {
	if (!block?.type || block.value === undefined) return block;

	// Nested objects / lists → recurse for every child
	if (block.type === "block") {
		return block.value.map((obj: Record<string, any>) => {
			const parsed: Record<string, any> = {};
			for (const [k, v] of Object.entries(obj)) {
				parsed[k] = unwrapBlock(v, locale);
			}
			return parsed;
		});
	}

	// Primitive leaves (text/number/boolean/media …)
	const isLocalized = block.type === "text";
	const isList =
		block.properties?.ui === "list" ||
		(block.properties?.maxValues ?? 1) > 1 ||
		block.value.length > 1;

	if (isList) {
		return isLocalized
			? block.value.map((v: Record<string, any>) => v[locale] || v["en"])
			: [...block.value];
	}

	return isLocalized ? block.value[0][locale] || block.value[0]["en"] : block.value[0];
}

export const getBlockObjectValues = (entry: any, blockKey: string, locale = "en") => {
	if (!entry) {
		return [];
	}

	const values = getBlockValues(entry, blockKey); // top‑level list

	const parsed = values.map((obj: Record<string, any>) => {
		const res = obj.value.reduce((acc, current) => {
			acc[current.key] = unwrapBlock(current, locale);

			return acc;
		}, {});

		return res;
	});

	return parsed;
};

export const getBlockFromArray = (entry: any, blockKey: string, locale = "en") => {
	if (!entry) {
		return [];
	}

	const values = getBlockValues(entry, blockKey); // top‑level list

	return values.reduce((acc, current) => {
		acc[current.key] = unwrapBlock(current, locale);
		return acc;
	});
};

export const getImageUrl = (imageBlock, isBlock = true) => {
	if (!imageBlock) return null;

	const storageUrl = import.meta.env.PUBLIC_STORAGE_URL || "";

	if (isBlock) {
		if (typeof imageBlock === "string") {
			return `${storageUrl}/${imageBlock}`;
		}

		if (imageBlock.url) {
			return `${storageUrl}/${imageBlock.url}`;
		}
	}

	if (
		imageBlock.resolutions &&
		imageBlock.resolutions.original &&
		imageBlock.resolutions.original.url
	) {
		return `${storageUrl}/${imageBlock.resolutions.original.url}`;
	}

	return null;
};

export function getGalleryThumbnail(gallery) {
	if (!gallery?.length) return null;
	const item = gallery.find((g) => g.settings.isThumbnail) || gallery[0];
	const res = item.media.resolutions.thumbnail || item.media.resolutions.original;
	return res?.url || null;
}

// full URL or null
export function thumbnailUrl(service) {
	const storageUrl = import.meta.env.PUBLIC_STORAGE_URL || "";
	const path = getGalleryThumbnail(service.gallery);
	return path ? `${storageUrl}/${path}` : null;
}

// format price
export function getPrice(priceOption, locale) {
	if (!priceOption) return "";
	switch (priceOption.type) {
		case "standard":
			return `${priceOption.basePrice}${priceOption.currency}`;
		case "custom":
			return priceOption.customValue[locale] || priceOption.customValue.en;
		case "complex":
			const val = priceOption.customValue[locale] || priceOption.customValue.en;
			return `${priceOption.basePrice}${priceOption.currency} + ${val}`;
		default:
			return "";
	}
}

export const translateMap = (labels, lang, fallback = "unknown") => {
	let parsedLang = "en";

	if (lang === "sr") {
		parsedLang = "bih";
	}

	if (!labels) {
		return fallback;
	}

	const label = labels[parsedLang];
	if (!label) {
		return fallback;
	}

	return label;
};

export const cmsApi = () => ({
	getBlockObjectValues,
	getBlockFromArray,
	getBlockValues,
	getCollection,
	getCollections,
	getCollectionEntries,
	getCollectionEntry,
	createCollectionEntry,
	getImageUrl,
	getBlockValue,
	extractBlockValues,
	prepareBlocksForSubmission,
	formatBlockValue,
	createBlock,
	getPrice,
	getGalleryThumbnail,
	thumbnailUrl,
	translateMap,
});

export const eshopApi = {
	// Get products
	getProducts: async ({ businessId, categoryIds = null, status = "Published", limit = 20, cursor = null }) => {
		let url = `${API_URL}/v1/businesses/${encodeURIComponent(businessId)}/products`;
		
		const params = [];
		
		if (categoryIds && categoryIds.length > 0) {
			params.push(`categoryIds=${encodeURIComponent(JSON.stringify(categoryIds))}`);
		}
		
		if (status) {
			params.push(`status=${encodeURIComponent(status)}`);
		}
		
		if (limit) {
			params.push(`limit=${limit}`);
		}
		
		if (cursor) {
			params.push(`cursor=${encodeURIComponent(cursor)}`);
		}

		if (params.length > 0) {
			url += `?${params.join('&')}`;
		}

		try {
			const res = await fetch(url);
			const json = await res.json();
			return {
				success: true,
				data: json.items || [],
				cursor: json.cursor,
				total: json.total || 0,
			};
		} catch (e) {
			console.error("Error fetching products:", e);
			return {
				success: false,
				error: e.message,
				data: [],
			};
		}
	},

	// Get product by slug
	getProductBySlug: async ({ businessId, slug }) => {
		try {
			const url = `${API_URL}/v1/businesses/${encodeURIComponent(businessId)}/products/slug/${encodeURIComponent(businessId)}/${encodeURIComponent(slug)}`;
			const res = await fetch(url);
			if (!res.ok) throw new Error("Product not found");
			const json = await res.json();
			return {
				success: true,
				data: json,
			};
		} catch (e) {
			console.error("Error fetching product:", e);
			return {
				success: false,
				error: e.message,
				data: null,
			};
		}
	},

	// Checkout (direct from cart items, no backend cart)
	checkout: async ({ token, businessId, items, paymentMethod, orderInfoBlocks, paymentIntentId = null }) => {
		try {
			const payload = {
				businessId,
				items,
				paymentMethod,
				orderInfoBlocks,
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
		} catch (e) {
			return {
				success: false,
				error: e.message,
			};
		}
	},
};

export const reservationApi = {
	// Get available slots for a service
	getAvailableSlots: async ({
		businessId,
		serviceId,
		from,
		to,
		limit = 1000,
		providerId = null,
	}) => {
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
		} catch (e) {
			console.error("Error fetching available slots:", e);
			return {
				success: false,
				error: e.message,
				data: [],
			};
		}
	},

	// Get all providers for a service
	getProviders: async ({ businessId, serviceId, limit = 50 }) => {
		try {
			const url = `${API_URL}/v1/businesses/${businessId}/providers?serviceId=${serviceId}&limit=${limit}`;
			const res = await fetch(url);
			const json = await res.json();
			return {
				success: true,
				data: json.items || [],
			};
		} catch (e) {
			console.error("Error loading providers:", e);
			return {
				success: false,
				error: e.message,
				data: [],
			};
		}
	},

	// Get guest token or create a new one
	getGuestToken: async () => {
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
				token: json.accessToken,
			};
		} catch (e) {
			return {
				success: false,
				error: e.message,
				token: null,
			};
		}
	},

	// Update user's phone number
	updateProfilePhone: async ({ token, phoneNumber }) => {
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
		} catch (e) {
			return {
				success: false,
				error: e.message,
			};
		}
	},

	// Verify phone number with code
	verifyPhoneCode: async ({ token, phoneNumber, code }) => {
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
		} catch (e) {
			return {
				success: false,
				error: e.message,
			};
		}
	},

	// Complete reservation checkout
	checkout: async ({ token, businessId, parts }) => {
		try {
			const payload = {
				businessId,
				info: [],
				parts: parts.map((p) => ({
					serviceId: p.serviceId,
					from: p.from,
					to: p.to,
					blocks: p.blocks,
					reservationMethod: p.reservationMethod,
					providerId: p.providerId,
				})),
			};

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

			return {
				success: true,
			};
		} catch (e) {
			return {
				success: false,
				error: e.message,
			};
		}
	},
};
