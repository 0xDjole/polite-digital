<script>
	import { onMount, tick } from 'svelte';
	import { eshopApi, getImageUrl, BUSINESS_ID } from '@lib/index';
	import { showToast } from '@lib/toast.js';
	import { cartItems, cartTotal, cartItemCount, store, actions, initEshopStore } from '@lib/EShop/eshopStore.js';
	import QuantitySelector from '@lib/EShop/QuantitySelector/index.svelte';
	import AttributeBlocks from '@lib/EShop/AttributeBlocks/index.svelte';
	import Icon from '@iconify/svelte';
	import { loadStripe } from '@stripe/stripe-js';

	let showCheckoutSection = $state(false);
	let checkoutFormData = $state({});
	let selectedPaymentMethod = $state('Cash');
	let stripe = $state(null);
	let elements = $state(null);
	let cardNumberElement = $state(null);
	let cardExpiryElement = $state(null);
	let cardCvcElement = $state(null);
	let individualElementsMounted = $state(false);
	let paymentProcessing = $state(false);
	let paymentError = $state(null);
	let orderBlocks = $state([]);
	let businessObject = $state(null);
	
	// Form data variables
	let email = $state('');
	let fullName = $state('');
	let phoneNumber = $state('');
	let shippingAddress = $state('');
	let specialInstructions = $state('');

	function formatPrice(priceOption) {
		if (!priceOption) return '';
		const roundedPrice = Number(priceOption.basePrice).toFixed(2);
		
		// Format based on currency
		if (priceOption.currency === 'USD') {
			return `$${roundedPrice}`;
		} else if (priceOption.currency === 'EUR') {
			return `€${roundedPrice}`;
		} else if (priceOption.currency === 'GBP') {
			return `£${roundedPrice}`;
		} else {
			return `${roundedPrice} ${priceOption.currency}`;
		}
	}

	function handleQuantityUpdate(itemId, newQuantity) {
		actions.updateQuantity(itemId, newQuantity);
	}

	function handleRemoveItem(itemId) {
		actions.removeItem(itemId);
	}

	function handleProceedToCheckout() {
		if ($cartItems.length === 0) {
			showToast('Cart is empty', 'error', 3000);
			return;
		}
		showCheckoutSection = true;
	}

	// Auto-show checkout when items are in cart
	$effect(() => {
		if ($cartItems.length > 0 && !showCheckoutSection) {
			showCheckoutSection = true;
		}
	});

	function handleCheckoutCancel() {
		showCheckoutSection = false;
		checkoutFormData = {};
		selectedPaymentMethod = 'Cash';
		paymentError = null;
	}

	async function handleCheckoutComplete() {
		paymentProcessing = true;
		paymentError = null;

		try {
			// 1. First, create order (for both cash and credit card)
			const checkoutData = {
				email,
				fullName,
				phoneNumber,
				shippingAddress,
				specialInstructions
			};

			console.log('Creating order...');
			const checkoutResponse = await actions.checkout(checkoutData, selectedPaymentMethod);
			
			if (!checkoutResponse.success) {
				throw new Error(checkoutResponse.error || 'Failed to create order');
			}

			const { orderId, clientSecret } = checkoutResponse.data;

			// 2. For cash payments, we're done
			if (selectedPaymentMethod === 'Cash') {
				showToast('Order placed successfully! Pay on delivery.', 'success', 6000);
				showCheckoutSection = false;
				actions.clearCart();
				return;
			}

			// 3. For credit card, confirm payment
			if (selectedPaymentMethod === 'CreditCard') {
				if (!stripe || !cardNumberElement) {
					throw new Error('Payment system not initialized');
				}

				if (!clientSecret) {
					throw new Error('No payment client secret received');
				}

				console.log('Confirming payment...');
				const { error, paymentIntent } = await stripe.confirmCardPayment(
					clientSecret,
					{
						payment_method: {
							card: cardNumberElement,
							billing_details: {
								name: fullName || ''
							}
						}
					}
				);

				if (error) {
					throw new Error(`Payment failed: ${error.message}`);
				}

				if (paymentIntent.status === 'succeeded') {
					showToast('Payment successful! Order confirmed.', 'success', 6000);
				} else {
					throw new Error('Payment was not completed successfully');
				}
			}

			// Success - clean up and reset
			showCheckoutSection = false;
			checkoutFormData = {};
			selectedPaymentMethod = 'Cash';
			actions.clearCart();
			
			if (individualElementsMounted) {
				if (cardNumberElement) cardNumberElement.destroy();
				if (cardExpiryElement) cardExpiryElement.destroy();
				if (cardCvcElement) cardCvcElement.destroy();
				cardNumberElement = null;
				cardExpiryElement = null;
				cardCvcElement = null;
				individualElementsMounted = false;
			}

		} catch (error) {
			console.error('Checkout error:', error);
			paymentError = error.message || 'Checkout failed. Please try again.';
		} finally {
			paymentProcessing = false;
		}
	}

	onMount(async () => {
		// Wait for store to load business configuration
		const unsubscribe = store.subscribe(async (storeValue) => {
			if (storeValue.loading) return; // Still loading
			
			// Load Stripe if business has it configured
			if (storeValue.stripeConfig.enabled && storeValue.stripeConfig.publicKey && !stripe) {
				try {
					stripe = await loadStripe(storeValue.stripeConfig.publicKey);
					console.log('Stripe loaded with business public key');
				} catch (error) {
					console.error('Failed to load Stripe:', error);
				}
			}
			
			// Initialize order blocks and business object
			if (storeValue.checkoutBlocks) {
				orderBlocks = storeValue.checkoutBlocks.map(block => ({
					...block,
					value: block.value && block.value.length > 0 ? block.value : 
						(block.type === 'text' ? [{ en: '' }] : 
						 block.type === 'boolean' ? [false] : 
						 block.type === 'number' ? [0] : [''])
				}));
			}

			// Create business object for BlockManager
			businessObject = {
				id: BUSINESS_ID,
				configs: {
					checkoutBlocks: storeValue.checkoutBlocks || []
				}
			};
		});
		
		return () => {
			unsubscribe();
		};
	});

	// Update order blocks when checkout blocks change
	$effect(() => {
		if ($store.checkoutBlocks) {
			orderBlocks = $store.checkoutBlocks.map(block => ({
				...block,
				value: block.value && block.value.length > 0 ? block.value : 
					(block.type === 'text' ? [{ en: '' }] : 
					 block.type === 'boolean' ? [false] : 
					 block.type === 'number' ? [0] : [''])
			}));
			if (businessObject) {
				businessObject.configs.checkoutBlocks = $store.checkoutBlocks;
			}
		}
	});

	async function setupCardElement() {
		if (!stripe || individualElementsMounted) return;

		await tick();
		
		const cardNumberContainer = document.getElementById('card-number-element');
		const cardExpiryContainer = document.getElementById('card-expiry-element');
		const cardCvcContainer = document.getElementById('card-cvc-element');
		
		if (!cardNumberContainer || !cardExpiryContainer || !cardCvcContainer) {
			console.error('Card element containers not found');
			return;
		}

		// Clear any existing content
		cardNumberContainer.innerHTML = '';
		cardExpiryContainer.innerHTML = '';
		cardCvcContainer.innerHTML = '';

		elements = stripe.elements();
		
		// Get theme-aware colors
		const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
		
		const style = {
			base: {
				color: isDark ? '#ffffff' : '#000000',
				fontFamily: 'Inter, system-ui, sans-serif',
				fontSmoothing: 'antialiased',
				fontSize: '16px',
				'::placeholder': {
					color: isDark ? '#6b7280' : '#9ca3af'
				}
			},
			invalid: {
				color: '#ef4444',
				iconColor: '#ef4444'
			}
		};

		cardNumberElement = elements.create('cardNumber', { style });
		cardExpiryElement = elements.create('cardExpiry', { style });
		cardCvcElement = elements.create('cardCvc', { style });
		
		try {
			cardNumberElement.mount('#card-number-element');
			cardExpiryElement.mount('#card-expiry-element');
			cardCvcElement.mount('#card-cvc-element');
			
			individualElementsMounted = true;
			console.log('Stripe card elements mounted successfully');
		} catch (error) {
			console.error('Failed to mount Stripe card elements:', error);
		}
	}

	$effect(() => {
		if (selectedPaymentMethod !== 'CreditCard' && individualElementsMounted) {
			if (cardNumberElement) cardNumberElement.destroy();
			if (cardExpiryElement) cardExpiryElement.destroy();
			if (cardCvcElement) cardCvcElement.destroy();
			cardNumberElement = null;
			cardExpiryElement = null;
			cardCvcElement = null;
			individualElementsMounted = false;
		}
	});

	$effect(() => {
		if (showCheckoutSection && selectedPaymentMethod === 'CreditCard' && stripe && !individualElementsMounted) {
			setupCardElement();
		}
	});

	// Auto-select first available payment method and validate selection
	$effect(() => {
		const allowedMethods = $store.allowedPaymentMethods || ['CASH'];
		
		// If current selection is not allowed, pick the first allowed method
		if (selectedPaymentMethod === 'Cash' && !allowedMethods.includes('CASH')) {
			if (allowedMethods.includes('CREDIT_CARD') && $store.stripeConfig.enabled) {
				selectedPaymentMethod = 'CreditCard';
			}
		} else if (selectedPaymentMethod === 'CreditCard' && (!allowedMethods.includes('CREDIT_CARD') || !$store.stripeConfig.enabled)) {
			if (allowedMethods.includes('CASH')) {
				selectedPaymentMethod = 'Cash';
			}
		}
		
		// If no selection or invalid selection, default to first available
		if (!selectedPaymentMethod || 
			(selectedPaymentMethod === 'Cash' && !allowedMethods.includes('CASH')) ||
			(selectedPaymentMethod === 'CreditCard' && (!allowedMethods.includes('CREDIT_CARD') || !$store.stripeConfig.enabled))) {
			if (allowedMethods.includes('CASH')) {
				selectedPaymentMethod = 'Cash';
			} else if (allowedMethods.includes('CREDIT_CARD') && $store.stripeConfig.enabled) {
				selectedPaymentMethod = 'CreditCard';
			}
		}
	});
</script>

{#if $store.loading}
	<div class="flex justify-center items-center py-8">
		<Icon icon="mdi:loading" class="w-8 h-8 animate-spin text-primary" />
	</div>
{:else if $store.error}
	<div class="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-center">
		<div class="text-destructive text-lg mb-2">Error</div>
		<div class="text-destructive/80 mb-4">{$store.error}</div>
	</div>
{:else if $cartItems.length === 0}
	<div class="bg-muted rounded-lg p-6 text-center">
		<div class="text-muted-foreground bg-card mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
			<Icon icon="mdi:shopping-outline" class="h-8 w-8" />
		</div>
		<p class="text-muted-foreground mb-4">No products in cart</p>
		<a href="/products" class="text-primary hover:text-primary/80 font-medium">
			Browse Products →
		</a>
	</div>
{:else}
	<div class="space-y-3">
		{#each $cartItems as item (item.id)}
			<div class="cart-item">
				<div class="cart-item-content">
					<div class="cart-item-info">
						<h3 class="cart-item-title">{item.productName}</h3>
						
						{#if item.variantAttributes && item.variantAttributes.length > 0}
							<div class="mt-1">
								<AttributeBlocks 
									blocks={item.variantAttributes} 
									variant="badges" 
								/>
							</div>
						{/if}
						
					</div>

					<div class="cart-item-actions">
						<div class="cart-item-controls">
							<div class="cart-item-quantity">
								<QuantitySelector 
									quantity={item.quantity}
									min={1}
									max={99}
									on:change={(e) => handleQuantityUpdate(item.id, e.detail)}
								/>
							</div>

							<div class="cart-item-total">
								{formatPrice({
									...item.price,
									basePrice: item.price.basePrice * item.quantity
								})}
							</div>

							<div class="cart-item-remove">
								<button
									class="remove-button"
									on:click={() => handleRemoveItem(item.id)}
									aria-label="Remove item"
								>
									<Icon icon="mdi:delete" class="h-5 w-5" />
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		{/each}
	</div>

	<!-- E-shop Cart Total and Checkout -->
	{#if $cartTotal.basePrice > 0}
		<div class="border-t pt-4">
			<div class="flex justify-between items-center mb-4">
				<span class="text-xl font-semibold text-card-foreground">Total:</span>
				<span class="text-2xl font-bold text-primary">
					{formatPrice($cartTotal)}
				</span>
			</div>

			<!-- Checkout Section -->
			{#if showCheckoutSection}
				<div class="border-t pt-6 mt-4">
					<div class="mb-6 flex items-center justify-between">
						<h3 class="text-xl font-semibold text-card-foreground">Checkout</h3>
						<button 
							on:click={handleCheckoutCancel}
							class="text-muted-foreground hover:text-card-foreground transition-colors"
						>
							<Icon icon="mdi:close" class="w-6 h-6" />
						</button>
					</div>

					<form on:submit|preventDefault={() => {
						handleCheckoutComplete();
					}} class="space-y-6">
						
						<!-- Customer Information -->
						<div>
							<label class="block text-sm font-medium text-card-foreground mb-2">
								Email Address <span class="text-destructive">*</span>
							</label>
							<input 
								type="email" 
								bind:value={email}
								placeholder="your@email.com"
								required
								class="w-full p-3 bg-muted border-0 rounded-lg focus:bg-background transition-colors text-foreground placeholder-gray-500"
							/>
						</div>
						
						<div>
							<label class="block text-sm font-medium text-card-foreground mb-2">
								Full Name <span class="text-destructive">*</span>
							</label>
							<input 
								type="text" 
								bind:value={fullName}
								placeholder="John Doe"
								required
								class="w-full p-3 bg-muted border-0 rounded-lg focus:bg-background transition-colors text-foreground placeholder-gray-500"
							/>
						</div>
						
						<div>
							<label class="block text-sm font-medium text-card-foreground mb-2">
								Phone Number <span class="text-destructive">*</span>
							</label>
							<input 
								type="text" 
								bind:value={phoneNumber}
								placeholder="+387 XX XXX XXX"
								required
								class="w-full p-3 bg-muted border-0 rounded-lg focus:bg-background transition-colors text-foreground placeholder-gray-500"
							/>
						</div>
						
						<div>
							<label class="block text-sm font-medium text-card-foreground mb-2">
								Shipping Address <span class="text-destructive">*</span>
							</label>
							<input 
								type="text" 
								bind:value={shippingAddress}
								placeholder="Street, City, Postal Code"
								required
								class="w-full p-3 bg-muted border-0 rounded-lg focus:bg-background transition-colors text-foreground placeholder-gray-500"
							/>
						</div>
						
						<div>
							<label class="block text-sm font-medium text-card-foreground mb-2">
								Special Instructions
							</label>
							<input 
								type="text" 
								bind:value={specialInstructions}
								placeholder="Any special delivery instructions..."
								class="w-full p-3 bg-muted border-0 rounded-lg focus:bg-background transition-colors text-foreground placeholder-gray-500"
							/>
						</div>

						<!-- Payment Method -->
						<div>
							<label class="block text-sm font-medium text-card-foreground mb-3">
								Payment Method <span class="text-destructive">*</span>
							</label>
							<div class="grid gap-3" class:grid-cols-2={$store.allowedPaymentMethods.length > 1} class:grid-cols-1={$store.allowedPaymentMethods.length === 1}>
								{#if $store.allowedPaymentMethods.includes('CASH')}
									<button 
										type="button"
										class="relative flex items-center p-4 rounded-lg cursor-pointer transition-all border-2"
										class:border-primary={selectedPaymentMethod === 'Cash'}
										class:bg-primary={selectedPaymentMethod === 'Cash'}
										class:shadow-sm={selectedPaymentMethod === 'Cash'}
										class:border-transparent={selectedPaymentMethod !== 'Cash'}
										class:bg-muted={selectedPaymentMethod !== 'Cash'}
										class:hover:bg-muted={selectedPaymentMethod !== 'Cash'}
										on:click={() => selectedPaymentMethod = 'Cash'}
									>
										{#if selectedPaymentMethod === 'Cash'}
											<div class="absolute top-2 right-2">
												<Icon icon="mdi:check-circle" class="w-5 h-5 text-primary" />
											</div>
										{/if}
										<div class="flex items-center gap-3">
											<div class="flex items-center justify-center w-12 h-12 rounded-full bg-background">
												<Icon icon="mdi:cash" class="w-6 h-6 text-primary" />
											</div>
											<div class="text-left">
												<div class="font-semibold" class:text-primary-foreground={selectedPaymentMethod === 'Cash'} class:text-card-foreground={selectedPaymentMethod !== 'Cash'}>Cash Payment</div>
												<div class="text-sm" class:text-primary-foreground={selectedPaymentMethod === 'Cash'} class:text-muted-foreground={selectedPaymentMethod !== 'Cash'}>Pay when you receive</div>
											</div>
										</div>
									</button>
								{/if}
								
								{#if $store.allowedPaymentMethods.includes('CREDIT_CARD') && $store.stripeConfig.enabled}
									<button 
										type="button"
										class="relative flex items-center p-4 rounded-lg cursor-pointer transition-all border-2"
										class:border-primary={selectedPaymentMethod === 'CreditCard'}
										class:bg-primary={selectedPaymentMethod === 'CreditCard'}
										class:shadow-sm={selectedPaymentMethod === 'CreditCard'}
										class:border-transparent={selectedPaymentMethod !== 'CreditCard'}
										class:bg-muted={selectedPaymentMethod !== 'CreditCard'}
										class:hover:bg-muted={selectedPaymentMethod !== 'CreditCard'}
										on:click={() => selectedPaymentMethod = 'CreditCard'}
									>
										{#if selectedPaymentMethod === 'CreditCard'}
											<div class="absolute top-2 right-2">
												<Icon icon="mdi:check-circle" class="w-5 h-5 text-primary" />
											</div>
										{/if}
										<div class="flex items-center gap-3">
											<div class="flex items-center justify-center w-12 h-12 rounded-full bg-background">
												<Icon icon="mdi:credit-card" class="w-6 h-6 text-primary" />
											</div>
											<div class="text-left">
												<div class="font-semibold" class:text-primary-foreground={selectedPaymentMethod === 'CreditCard'} class:text-card-foreground={selectedPaymentMethod !== 'CreditCard'}>Card Payment</div>
												<div class="text-sm" class:text-primary-foreground={selectedPaymentMethod === 'CreditCard'} class:text-muted-foreground={selectedPaymentMethod !== 'CreditCard'}>Secure online payment</div>
											</div>
										</div>
									</button>
								{/if}
							</div>
						</div>

						<!-- Credit Card Details -->
						{#if selectedPaymentMethod === 'CreditCard'}
							<div class="bg-muted rounded-lg border p-6">
								<div class="flex items-center gap-2 mb-4">
									<Icon icon="mdi:credit-card" class="w-5 h-5 text-primary" />
									<h4 class="font-medium text-card-foreground">Card Details</h4>
								</div>
								
								<div class="space-y-4">
									<div>
										<label class="block text-sm font-medium text-card-foreground mb-2">
											Card Number
										</label>
										<div 
											id="card-number-element" 
											class="card-input"
										>
										</div>
									</div>

									<div class="grid grid-cols-2 gap-4">
										<div>
											<label class="block text-sm font-medium text-card-foreground mb-2">
												Expiry Date
											</label>
											<div 
												id="card-expiry-element" 
												class="card-input"
											>
											</div>
										</div>

										<div>
											<label class="block text-sm font-medium text-card-foreground mb-2">
												CVC
											</label>
											<div 
												id="card-cvc-element" 
												class="card-input"
											>
											</div>
										</div>
									</div>
									
									<div class="flex items-center gap-2 text-sm text-muted-foreground">
										<Icon icon="mdi:shield-check" class="w-4 h-4 text-green-600" />
										<span>Your payment information is encrypted and secure</span>
									</div>
								</div>
							</div>
						{/if}

						<!-- Error Message -->
						{#if paymentError}
							<div class="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
								<div class="flex items-center gap-2 text-destructive">
									<Icon icon="mdi:alert-circle" class="w-5 h-5" />
									<span class="font-medium">Payment Error</span>
								</div>
								<p class="text-destructive/80 mt-1">{paymentError}</p>
							</div>
						{/if}

						<!-- Action Buttons -->
						<div class="flex gap-3 pt-4">
							<button 
								type="button"
								on:click={handleCheckoutCancel}
								class="flex-1 px-4 py-2 text-sm bg-muted text-muted-foreground rounded-lg hover:bg-accent hover:text-foreground transition-colors"
							>
								Cancel
							</button>
							<button 
								type="submit"
								disabled={$store.processingCheckout || paymentProcessing}
								class="flex-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
							>
								{#if $store.processingCheckout || paymentProcessing}
									<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
									Processing...
								{:else}
									<Icon icon={selectedPaymentMethod === 'CreditCard' ? 'mdi:credit-card' : 'mdi:cash'} class="h-4 w-4" />
									Place Order • {formatPrice($cartTotal)}
								{/if}
							</button>
						</div>
					</form>
				</div>
			{/if}
		</div>
	{/if}
{/if}

<style>
	@import "tailwindcss/theme" theme(reference);
	@import "@/styles/tailwind-theme.css" theme(reference);

	/* Loading and error states */
	.loading-container {
		@apply flex justify-center items-center py-8;
	}

	.loading-icon {
		@apply w-8 h-8 animate-spin text-primary;
	}

	.error-container {
		@apply bg-red-50 border border-red-200 rounded-lg p-4 text-center;
	}

	.error-title {
		@apply text-red-600 text-lg mb-2;
	}

	.error-message {
		@apply text-red-500 mb-4;
	}

	/* Empty cart state */
	.empty-cart {
		@apply bg-muted rounded-lg p-6 text-center;
	}

	.empty-cart-icon {
		@apply text-muted-foreground bg-card mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full;
	}

	.empty-cart-text {
		@apply text-muted-foreground mb-4;
	}

	.empty-cart-link {
		@apply text-primary font-medium;
	}

	/* Cart items */
	.cart-items {
		@apply space-y-3;
	}

	.cart-item {
		@apply bg-primary rounded-lg border p-4;
	}

	.cart-item-content {
		@apply flex flex-col gap-4;
	}

	.cart-item-info {
		@apply flex-1 min-w-0;
	}

	.cart-item-title {
		@apply font-medium text-primary-foreground text-base leading-tight;
	}

	.cart-item-price {
		@apply mt-2 text-sm font-semibold text-primary-foreground;
	}

	.cart-item-actions {
		@apply flex flex-col gap-4 w-full;
	}

	.cart-item-controls {
		@apply flex items-center justify-between gap-3 w-full;
	}

	.cart-item-quantity {
		@apply flex-shrink-0;
	}

	.cart-item-total {
		@apply text-base font-bold text-primary-foreground flex-1 text-right;
	}

	.cart-item-remove {
		@apply flex-shrink-0;
	}

	/* Desktop layout */
	@media (min-width: 768px) {
		.cart-item-content {
			@apply flex-row items-center justify-between;
		}

		.cart-item-actions {
			@apply flex-row items-center gap-3 w-auto;
		}

		.cart-item-controls {
			@apply w-auto;
		}

		.cart-item-total {
			@apply min-w-[80px] flex-none;
		}
	}

	.remove-button {
		@apply flex h-10 w-10 items-center justify-center rounded-full text-red-500 transition md:h-8 md:w-8;
	}

	/* Cart total */
	.cart-total-section {
		@apply border-t pt-4;
	}

	.cart-total-row {
		@apply flex justify-between items-center mb-4;
	}

	.cart-total-label {
		@apply text-xl font-semibold text-card-foreground;
	}

	.cart-total-amount {
		@apply text-2xl font-bold text-primary;
	}

	/* Checkout section */
	.checkout-section {
		@apply border-t pt-6 mt-4;
	}

	.checkout-header {
		@apply mb-6 flex items-center justify-between;
	}

	.checkout-title {
		@apply text-xl font-semibold text-card-foreground;
	}

	.checkout-close {
		@apply text-muted-foreground hover:text-card-foreground transition-colors p-2 md:p-0;
	}

	.checkout-form {
		@apply space-y-6;
	}

	/* Form elements */
	.form-group {
		@apply space-y-2;
	}

	.form-label {
		@apply block text-sm font-medium text-card-foreground;
	}

	.form-input {
		@apply w-full p-4 bg-muted border-0 rounded-lg focus:bg-background transition-colors text-foreground placeholder-gray-500 text-base md:p-3 md:text-sm;
	}

	/* Payment methods */
	.payment-methods {
		@apply grid gap-3 grid-cols-1 md:grid-cols-2;
	}

	.payment-method {
		@apply relative flex items-center p-4 rounded-lg cursor-pointer transition-all border-2;
	}

	.payment-method.selected {
		@apply border-primary bg-primary shadow-sm;
	}

	.payment-method.unselected {
		@apply border-transparent bg-muted hover:bg-muted;
	}

	.payment-method-check {
		@apply absolute top-2 right-2;
	}

	.payment-method-content {
		@apply flex items-center gap-3 w-full;
	}

	.payment-method-icon {
		@apply flex items-center justify-center w-12 h-12 rounded-full bg-background;
	}

	.payment-method-text {
		@apply text-left flex-1;
	}

	.payment-method-title {
		@apply font-semibold;
	}

	.payment-method-subtitle {
		@apply text-sm;
	}

	/* Credit card form */
	.card-details {
		@apply bg-muted rounded-lg border p-6;
	}

	.card-details-header {
		@apply flex items-center gap-2 mb-4;
	}

	.card-details-title {
		@apply font-medium text-card-foreground;
	}

	.card-form {
		@apply space-y-4;
	}

	.card-input-group {
		@apply grid grid-cols-1 gap-4 md:grid-cols-2;
	}

	.card-input {
		@apply p-4 border border-border rounded-lg min-h-[56px] md:p-3 md:min-h-[48px];
		background-color: var(--bg-background);
		color: var(--text-foreground);
	}

	.security-notice {
		@apply flex items-center gap-2 text-sm text-muted-foreground;
	}

	/* Error message */
	.error-box {
		@apply p-4 bg-destructive/10 border border-destructive/20 rounded-lg;
	}

	.error-header {
		@apply flex items-center gap-2 text-destructive;
	}

	.error-content {
		@apply text-destructive/80 mt-1;
	}

	/* Action buttons */
	.action-buttons {
		@apply flex flex-col gap-3 pt-4 md:flex-row;
	}

	.cancel-button {
		@apply w-full px-4 py-3 text-base bg-muted text-muted-foreground rounded-lg hover:bg-accent hover:text-foreground transition-colors md:flex-1 md:py-2 md:text-sm;
	}

	.submit-button {
		@apply w-full px-4 py-3 text-base bg-primary text-primary-foreground rounded-lg hover:bg-primary font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 md:flex-2 md:py-2 md:text-sm;
	}

	/* Mobile adjustments */
	@media (max-width: 768px) {
		.payment-methods {
			@apply grid-cols-1;
		}

		.card-input-group {
			@apply grid-cols-1;
		}
	}
</style>