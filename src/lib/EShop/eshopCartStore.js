// src/lib/EShop/eshopCartStore.js - Frontend-only e-shop cart store
import { computed, deepMap } from "nanostores";
import { persistentAtom } from "@nanostores/persistent";
import { BUSINESS_ID } from "../env";
import { eshopApi, reservationApi } from "../index";
import { showToast } from "../toast.js";

// Frontend cart items
export const cartItems = persistentAtom("eshopCart", [], {
	encode: JSON.stringify,
	decode: JSON.parse,
});

// Store for business config and checkout state
export const store = deepMap({
	businessId: BUSINESS_ID,
	checkoutBlocks: [], // Business checkout form blocks
	userToken: null,
	processingCheckout: false,
	loading: false,
	error: null,
});

// Computed values
export const cartTotal = computed(cartItems, (items) => {
	if (!items || items.length === 0) return { basePrice: 0, currency: "USD" };
	
	const total = items.reduce((sum, item) => {
		const itemTotal = item.price.basePrice * item.quantity;
		return sum + itemTotal;
	}, 0);
	
	// Use currency from first item (assuming all items use same currency)
	const currency = items[0]?.price?.currency || "USD";
	
	return { basePrice: total, currency };
});

export const cartItemCount = computed(cartItems, (items) => {
	return items.reduce((sum, item) => sum + item.quantity, 0);
});

// Actions
export const actions = {
	// Add item to cart
	addItem(product, variant, quantity = 1) {
		const items = cartItems.get();
		
		// Check if item already exists in cart
		const existingItemIndex = items.findIndex(
			item => item.productId === product.id && item.variantId === variant.id
		);
		
		if (existingItemIndex !== -1) {
			// Update existing item quantity
			const updatedItems = [...items];
			updatedItems[existingItemIndex].quantity += quantity;
			cartItems.set(updatedItems);
		} else {
			// Add new item
			const newItem = {
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
		
		showToast(`${product.name} added to cart!`, 'success', 3000);
	},
	
	// Update item quantity
	updateQuantity(itemId, newQuantity) {
		const items = cartItems.get();
		const updatedItems = items.map(item => 
			item.id === itemId 
				? { ...item, quantity: Math.max(1, newQuantity) }
				: item
		);
		cartItems.set(updatedItems);
	},
	
	// Remove item from cart
	removeItem(itemId) {
		const items = cartItems.get();
		const updatedItems = items.filter(item => item.id !== itemId);
		cartItems.set(updatedItems);
		showToast('Item removed from cart!', 'success', 2000);
	},
	
	// Clear entire cart
	clearCart() {
		cartItems.set([]);
	},
	
	// Get guest token
	async getGuestToken() {
		const state = store.get();
		if (state.userToken) return state.userToken;
		
		const response = await reservationApi.getGuestToken();
		if (response.success) {
			store.setKey('userToken', response.token);
			return response.token;
		}
		throw new Error('Failed to get guest token');
	},
	
	// Load business checkout blocks
	async loadCheckoutBlocks() {
		try {
			store.setKey('loading', true);
			store.setKey('error', null);
			
			// Get business details to fetch checkout blocks
			// We'll use the collection API to get business configs
			const response = await fetch(`/api/businesses/${BUSINESS_ID}`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				},
			});
			
			if (response.ok) {
				const business = await response.json();
				const checkoutBlocks = business.configs?.checkoutBlocks || [];
				store.setKey('checkoutBlocks', checkoutBlocks);
			} else {
				// Fallback to default checkout blocks if API fails
				const defaultBlocks = [
					{
						id: crypto.randomUUID(),
						key: 'email',
						type: 'text',
						properties: {
							label: { en: 'Email Address' },
							isRequired: true,
							placeholder: 'your@email.com'
						},
						value: null
					},
					{
						id: crypto.randomUUID(),
						key: 'fullName',
						type: 'text',
						properties: {
							label: { en: 'Full Name' },
							isRequired: true,
							placeholder: 'John Doe'
						},
						value: null
					}
				];
				store.setKey('checkoutBlocks', defaultBlocks);
			}
		} catch (err) {
			console.error('Error loading checkout blocks:', err);
			store.setKey('error', 'Failed to load checkout configuration');
		} finally {
			store.setKey('loading', false);
		}
	},
	
	// Prepare order items for checkout API
	prepareOrderItems() {
		const items = cartItems.get();
		return items.map(item => ({
			productId: item.productId,
			variantId: item.variantId,
			quantity: item.quantity,
		}));
	},
	
	// Prepare order info blocks from form data
	prepareOrderInfoBlocks(formData) {
		const blocks = store.get().checkoutBlocks;
		
		return blocks.map(block => ({
			id: block.id,
			key: block.key,
			type: block.type,
			value: [formData[block.key] || ''],
			properties: block.properties
		}));
	},
	
	// Process checkout
	async checkout(formData, paymentMethod = 'Cash') {
		const items = cartItems.get();
		if (!items.length) {
			showToast('Cart is empty', 'error', 3000);
			return false;
		}
		
		try {
			store.setKey('processingCheckout', true);
			store.setKey('error', null);
			
			const token = await this.getGuestToken();
			const orderItems = this.prepareOrderItems();
			const orderInfoBlocks = this.prepareOrderInfoBlocks(formData);
			
			const response = await eshopApi.checkout({
				token,
				businessId: BUSINESS_ID,
				items: orderItems,
				paymentMethod,
				orderInfoBlocks,
			});
			
			if (response.success) {
				showToast('Order placed successfully!', 'success', 6000);
				this.clearCart();
				return true;
			} else {
				throw new Error(response.error || 'Failed to place order');
			}
		} catch (err) {
			const errorMessage = `Checkout failed: ${err.message}`;
			showToast(errorMessage, 'error', 8000);
			store.setKey('error', errorMessage);
			console.error('Checkout error:', err);
			return false;
		} finally {
			store.setKey('processingCheckout', false);
		}
	},
	
	// Format price for display
	formatPrice(priceOption) {
		if (!priceOption) return '';
		return `${priceOption.basePrice} ${priceOption.currency}`;
	},
	
	// Get block label (similar to reservation store)
	getBlockLabel(block, locale = 'en') {
		if (!block) return '';
		
		if (block.properties?.label) {
			if (typeof block.properties.label === 'object') {
				return (
					block.properties.label[locale] ||
					block.properties.label.en ||
					Object.values(block.properties.label)[0] ||
					''
				);
			}
			if (typeof block.properties.label === 'string') {
				return block.properties.label;
			}
		}
		return block.key || '';
	},
};

// Initialize the store
export function initEshopCartStore() {
	// Load checkout blocks on initialization
	actions.loadCheckoutBlocks();
}

export default { store, actions, cartItems, cartTotal, cartItemCount, initEshopCartStore };