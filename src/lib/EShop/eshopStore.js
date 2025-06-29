// src/lib/EShop/eshopStore.js - Frontend-only e-shop store
import { computed, deepMap } from "nanostores";
import { persistentAtom } from "@nanostores/persistent";
import { BUSINESS_ID, API_URL } from "../env";
import { eshopApi, reservationApi } from "../index";
import { showToast } from "../toast.js";
import * as authService from "../authService.js";

// Frontend cart items
export const cartItems = persistentAtom("eshopCart", [], {
	encode: JSON.stringify,
	decode: JSON.parse,
});

// Store for business config and checkout state
export const store = deepMap({
	businessId: BUSINESS_ID,
	orderBlocks: [], // Business order form blocks
	service: { // Mock service object for DynamicForm compatibility
		reservationBlocks: []
	},
	userToken: null,
	processingCheckout: false,
	loading: false,
	error: null,
	// Phone verification
	phoneNumber: '',
	phoneError: null,
	verificationCode: '',
	verifyError: null,
	// Stripe configuration
	stripeConfig: {
		publicKey: null,
		enabled: false
	},
	// Allowed payment methods from business config
	allowedPaymentMethods: ['Cash'] // Default to cash only
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
		const token = await authService.getGuestToken(state.userToken);
		if (token !== state.userToken) {
			store.setKey('userToken', token);
		}
		return token;
	},
	
	// Load business order blocks and configuration
	async loadOrderBlocks() {
		try {
			store.setKey('loading', true);
			store.setKey('error', null);
			
			// Get business details to fetch checkout blocks and Stripe config
			const response = await fetch(`${API_URL}/v1/businesses/${BUSINESS_ID}`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				},
			});
			
			if (response.ok) {
				const business = await response.json();
				const orderBlocks = business.configs?.orderBlocks || [];
				store.setKey('orderBlocks', orderBlocks);
				// Set for DynamicForm compatibility
				store.setKey('service', { reservationBlocks: orderBlocks });
				
				// Load allowed payment methods
				const allowedPaymentMethods = business.configs?.allowedPaymentMethods || ['Cash'];
				store.setKey('allowedPaymentMethods', allowedPaymentMethods);
				
				// Load Stripe configuration
				const stripeConfig = {
					publicKey: business.configs?.stripePublicKey || null,
					enabled: allowedPaymentMethods.includes('CREDIT_CARD') || false
				};
				store.setKey('stripeConfig', stripeConfig);
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
				store.setKey('orderBlocks', defaultBlocks);
				// Set for DynamicForm compatibility
				store.setKey('service', { reservationBlocks: defaultBlocks });
			}
		} catch (err) {
			console.error('Error loading order blocks:', err);
			store.setKey('error', 'Failed to load order configuration');
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
	
	// Get order info blocks (they already have values from DynamicForm)
	getOrderInfoBlocks() {
		return store.get().orderBlocks || [];
	},
	
	// Process checkout
	async checkout(paymentMethod = 'Cash') {
		const items = cartItems.get();
		if (!items.length) {
			showToast('Cart is empty', 'error', 3000);
			return { success: false, error: 'Cart is empty' };
		}
		
		try {
			store.setKey('processingCheckout', true);
			store.setKey('error', null);
			
			const token = await this.getGuestToken();
			const orderItems = this.prepareOrderItems();
			const blocks = this.getOrderInfoBlocks();
			
			console.log('Checkout payload:', {
				token,
				businessId: BUSINESS_ID,
				items: orderItems,
				paymentMethod,
				blocks,
			});
			
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
						clientSecret: response.data.clientSecret
					}
				};
			} else {
				throw new Error(response.error || 'Failed to place order');
			}
		} catch (err) {
			const errorMessage = `Checkout failed: ${err.message}`;
			store.setKey('error', errorMessage);
			console.error('Checkout error:', err);
			return { success: false, error: errorMessage };
		} finally {
			store.setKey('processingCheckout', false);
		}
	},
	
	// Phone verification for eshop
	async updateProfilePhone() {
		try {
			const token = await this.getGuestToken();
			const phoneNumber = store.get().phoneNumber;
			
			await authService.updateProfilePhone(token, phoneNumber);
			store.setKey('phoneError', null);
			return true;
		} catch (error) {
			console.error('Phone update error:', error);
			store.setKey('phoneError', error.message);
			return false;
		}
	},
	
	async verifyPhoneCode() {
		try {
			const token = await this.getGuestToken();
			const phoneNumber = store.get().phoneNumber;
			const verificationCode = store.get().verificationCode;
			
			await authService.verifyPhoneCode(token, phoneNumber, verificationCode);
			store.setKey('verifyError', null);
			return true;
		} catch (error) {
			console.error('Phone verification error:', error);
			store.setKey('verifyError', error.message);
			return false;
		}
	},
	
	// Format price for display
	formatPrice(priceOption) {
		if (!priceOption) return '';
		return `${priceOption.basePrice} ${priceOption.currency}`;
	},
	
};

// Initialize the store
export function initEshopStore() {
	// Load order blocks on initialization
	actions.loadOrderBlocks();
}

export default { store, actions, cartItems, cartTotal, cartItemCount, initEshopStore };