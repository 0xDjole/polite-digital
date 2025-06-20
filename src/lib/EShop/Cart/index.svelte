<script>
	import { onMount, tick } from 'svelte';
	import { eshopApi, reservationApi, getImageUrl, BUSINESS_ID } from '@lib/index';
	import { showToast } from '@lib/toast.js';
	import { cartParts } from '@lib/Reservation/reservationStore.js';
	import Cart from '@lib/Reservation/Cart/index.svelte';
	import { store as reservationStore } from '@lib/Reservation/reservationStore.js';
	import { cartItems, cartTotal, cartItemCount, store, actions, initEshopCartStore } from '../eshopCartStore.js';
	import { createEventDispatcher } from 'svelte';
	import QuantitySelector from '../QuantitySelector/index.svelte';
	import AttributeBlocks from '../AttributeBlocks/index.svelte';
	import Icon from '@iconify/svelte';
	import { loadStripe } from '@stripe/stripe-js';
	import { hasEshopItems, hasReservationItems, isCartEmpty } from '../../unifiedCartStore.js';

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
		return `${priceOption.basePrice} ${priceOption.currency}`;
	}

	function getProductImage(item) {
		return null;
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
		initEshopCartStore();
		
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
		
		const style = {
			base: {
				color: '#000000',
				fontFamily: 'Inter, system-ui, sans-serif',
				fontSmoothing: 'antialiased',
				fontSize: '16px',
				'::placeholder': {
					color: '#9ca3af'
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

	let totalEshopItems = $derived($cartItemCount);
	let totalReservationItems = $derived($cartParts?.length || 0);
	
	// Smart display logic using unified store
	let showEshopSection = $derived($hasEshopItems || $isCartEmpty);
	let showReservationSection = $derived($hasReservationItems || $isCartEmpty);
	let showBothSections = $derived($hasEshopItems && $hasReservationItems);
</script>

<div class="bg-card mx-auto mt-20 max-w-4xl space-y-6 rounded-xl p-6 shadow-lg border">
	<h1 class="text-3xl font-bold text-card-foreground mb-6">Shopping Cart</h1>

	<!-- Show empty cart message only if both carts are empty -->
	{#if $isCartEmpty}
		<div class="bg-accent rounded-lg p-12 text-center">
			<div class="text-muted-foreground bg-card mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full">
				<Icon icon="mdi:cart-outline" class="h-12 w-12" />
			</div>
			<h2 class="text-xl font-semibold text-card-foreground mb-4">Your cart is empty</h2>
			<p class="text-muted-foreground mb-6">Start shopping or browse our services to add items to your cart.</p>
			<div class="flex gap-4 justify-center">
				<a href="/products" class="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 font-medium transition-colors">
					Browse Products
				</a>
				<a href="/services" class="border border-primary text-primary px-6 py-3 rounded-lg hover:bg-primary/10 font-medium transition-colors">
					Browse Services
				</a>
			</div>
		</div>
	{:else}
		<!-- E-shop Cart Section -->
		{#if showEshopSection}
			<div class="space-y-4">
				{#if showBothSections}
					<h2 class="text-2xl font-semibold text-card-foreground flex items-center gap-2">
						<Icon icon="mdi:shopping" class="w-6 h-6" />
						Products ({totalEshopItems})
					</h2>
				{/if}

				{#if $store.loading}
					<div class="flex justify-center items-center py-8">
						<Icon icon="mdi:loading" class="w-8 h-8 animate-spin text-primary" />
					</div>
				{:else if $store.error}
					<div class="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-center">
						<div class="text-destructive text-lg mb-2">Error</div>
						<div class="text-destructive/80 mb-4">{$store.error}</div>
					</div>
				{:else if !$hasEshopItems}
					<div class="bg-accent rounded-lg p-6 text-center">
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
							<div class="bg-accent rounded-lg border p-4">
								<div class="flex items-center justify-between">
									<div class="flex-1">
										<h3 class="font-medium text-card-foreground">{item.productName}</h3>
										
										{#if item.variantAttributes && item.variantAttributes.length > 0}
											<div class="mt-1">
												<AttributeBlocks 
													blocks={item.variantAttributes} 
													variant="badges" 
												/>
											</div>
										{/if}
										
										<div class="mt-2 text-lg font-semibold text-primary">
											{formatPrice(item.price)} each
										</div>
									</div>

									<div class="flex items-center gap-3">
										<QuantitySelector 
											quantity={item.quantity}
											min={1}
											max={99}
											on:change={(e) => handleQuantityUpdate(item.id, e.detail)}
										/>

										<div class="text-lg font-bold text-card-foreground min-w-[80px] text-right">
											{formatPrice({
												...item.price,
												basePrice: item.price.basePrice * item.quantity
											})}
										</div>

										<button
											class="hover:bg-destructive/10 flex h-8 w-8 items-center justify-center rounded-full text-destructive hover:text-destructive/80 transition"
											on:click={() => handleRemoveItem(item.id)}
											aria-label="Remove item"
										>
											<Icon icon="mdi:delete" class="h-5 w-5" />
										</button>
									</div>
								</div>
							</div>
						{/each}
					</div>

					<!-- E-shop Cart Total and Checkout -->
					{#if $cartTotal.basePrice > 0}
						<div class="border-t pt-4">
							<div class="flex justify-between items-center mb-4">
								<span class="text-xl font-semibold text-card-foreground">Total Products:</span>
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
												class="w-full p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring transition-colors text-foreground placeholder:text-muted-foreground"
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
												class="w-full p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring transition-colors text-foreground placeholder:text-muted-foreground"
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
												class="w-full p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring transition-colors text-foreground placeholder:text-muted-foreground"
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
												class="w-full p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring transition-colors text-foreground placeholder:text-muted-foreground"
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
												class="w-full p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring transition-colors text-foreground placeholder:text-muted-foreground"
											/>
										</div>

										<!-- Payment Method -->
										<div>
											<label class="block text-sm font-medium text-card-foreground mb-3">
												Payment Method <span class="text-destructive">*</span>
											</label>
											<div class="grid gap-3" class:grid-cols-2={$store.stripeConfig.enabled} class:grid-cols-1={!$store.stripeConfig.enabled}>
												{#if $store.allowedPaymentMethods.includes('CASH')}
													<label class="flex items-center p-3 rounded-lg cursor-pointer transition-all" 
														   class:border-2={selectedPaymentMethod === 'Cash'}
														   class:border-primary={selectedPaymentMethod === 'Cash'} 
														   class:bg-accent={selectedPaymentMethod === 'Cash'}
														   class:bg-muted={selectedPaymentMethod !== 'Cash'}>
														<input 
															type="radio" 
															name="paymentMethod" 
															value="Cash"
															bind:group={selectedPaymentMethod}
															class="mr-3 text-primary focus:ring-primary"
														/>
														<div class="flex items-center gap-3">
															<Icon icon="mdi:cash" class="w-5 h-5 text-primary" />
															<div>
																<div class="font-medium text-card-foreground text-sm">Cash</div>
																<div class="text-xs text-muted-foreground">Pay on delivery</div>
															</div>
														</div>
													</label>
												{/if}
												
												{#if $store.allowedPaymentMethods.includes('CREDIT_CARD') && $store.stripeConfig.enabled}
													<label class="flex items-center p-3 rounded-lg cursor-pointer transition-all" 
														   class:border-2={selectedPaymentMethod === 'CreditCard'}
														   class:border-primary={selectedPaymentMethod === 'CreditCard'} 
														   class:bg-accent={selectedPaymentMethod === 'CreditCard'}
														   class:bg-muted={selectedPaymentMethod !== 'CreditCard'}>
														<input 
															type="radio" 
															name="paymentMethod" 
															value="CreditCard"
															bind:group={selectedPaymentMethod}
															class="mr-3 text-primary focus:ring-primary"
														/>
														<div class="flex items-center gap-3">
															<Icon icon="mdi:credit-card" class="w-5 h-5 text-primary" />
															<div>
																<div class="font-medium text-card-foreground text-sm">Card</div>
																<div class="text-xs text-muted-foreground">Pay with card</div>
															</div>
														</div>
													</label>
												{/if}
											</div>
										</div>

										<!-- Credit Card Details -->
										{#if selectedPaymentMethod === 'CreditCard'}
											<div class="bg-accent rounded-lg border p-6">
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
															class="p-3 bg-background border border-border rounded-lg min-h-[48px]"
															style="background-color: white; color: black;"
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
																class="p-3 bg-background border border-border rounded-lg min-h-[48px]"
																style="background-color: white; color: black;"
															>
															</div>
														</div>

														<div>
															<label class="block text-sm font-medium text-card-foreground mb-2">
																CVC
															</label>
															<div 
																id="card-cvc-element" 
																class="p-3 bg-background border border-border rounded-lg min-h-[48px]"
																style="background-color: white; color: black;"
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
												class="flex-1 px-4 py-2 text-sm border border-border text-card-foreground rounded-lg hover:bg-accent transition-colors"
											>
												Cancel
											</button>
											<button 
												type="submit"
												disabled={$store.processingCheckout || paymentProcessing}
												class="flex-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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
			</div>
		{/if}

		<!-- Reservations Section -->
		{#if showReservationSection}
			<div class="border-t pt-6">
				{#if showBothSections}
					<h2 class="text-2xl font-semibold text-card-foreground flex items-center gap-2 mb-4">
						<Icon icon="mdi:calendar" class="w-6 h-6" />
						Reservations ({totalReservationItems})
					</h2>
				{/if}
				
				{#if $hasReservationItems}
					<Cart />
				{:else}
					<div class="bg-accent rounded-lg p-6 text-center">
						<div class="text-muted-foreground bg-card mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
							<Icon icon="mdi:calendar-outline" class="h-8 w-8" />
						</div>
						<p class="text-muted-foreground mb-4">No reservations in cart</p>
						<a href="/services" class="text-primary hover:text-primary/80 font-medium">
							Browse Services →
						</a>
					</div>
				{/if}
			</div>
		{/if}
	{/if}
</div>