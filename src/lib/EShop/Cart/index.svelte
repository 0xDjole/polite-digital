<script>
	import { onMount, tick } from 'svelte';
	import { eshopApi, getImageUrl, BUSINESS_ID, formatPrice as sharedFormatPrice } from '@lib/index';
	import { showToast } from '@lib/toast.js';
	import { cartItems, cartTotal, cartItemCount, store, actions, initEshopStore } from '@lib/core/stores/eshop';
	import QuantitySelector from '@lib/EShop/QuantitySelector/index.svelte';
	import AttributeBlocks from '@lib/EShop/AttributeBlocks/index.svelte';
	import DynamicForm from '@lib/DynamicForm/index.svelte';
	import Icon from '@iconify/svelte';
	import { loadStripe } from '@stripe/stripe-js';
	import PaymentForm from '@lib/payment/PaymentForm.svelte';

	let showCheckoutSection = $state(false);
	let checkoutFormData = $state({});
	let selectedPaymentMethod = $state('CASH');
	let paymentProcessing = $state(false);
	let paymentError = $state(null);
	let orderBlocks = $state([]);
	let businessObject = $state(null);
	let confirmPayment = null;
	let formValid = $state(false);
	let formErrors = $state([]);
	let paymentFormValid = $state(false);

	function handleValidationChange(isValid, errors) {
		formValid = isValid;
		formErrors = errors;
	}

	function handlePaymentValidationChange(isValid) {
		paymentFormValid = isValid;
	}

	// Combined validation - form must be valid, payment form only for credit card
	const isCompletelyValid = $derived(formValid && (selectedPaymentMethod === 'CASH' || paymentFormValid));

	async function handlePhoneSendCode(blockId, phone) {
		store.setKey('phoneNumber', phone);
		return await actions.updateProfilePhone();
	}

	async function handlePhoneVerifyCode(blockId, code) {
		store.setKey('verificationCode', code);
		return await actions.verifyPhoneCode();
	}

	// Use shared formatPrice function
	function formatPrice(priceOption) {
		return sharedFormatPrice(priceOption, $store.currency);
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
		selectedPaymentMethod = 'CASH';
		paymentError = null;
	}

	async function handleCheckoutComplete() {
		// Block submission if form is invalid
		if (!isCompletelyValid) {
			if (!formValid) {
				showToast('Please fix the form errors before placing order', 'error', 4000);
			} else if (selectedPaymentMethod === 'CREDIT_CARD' && !paymentFormValid) {
				showToast('Please complete payment information before placing order', 'error', 4000);
			}
			return;
		}

		paymentProcessing = true;
		paymentError = null;

		try {
			// 1. First, create order (for both cash and credit card)
			const checkoutResponse = await actions.checkout(selectedPaymentMethod);
			
			if (!checkoutResponse.success) {
				throw new Error(checkoutResponse.error || 'Failed to create order');
			}

			const { orderId, clientSecret } = checkoutResponse.data;

			// 2. For cash payments, we're done
			if (selectedPaymentMethod === 'CASH') {
				showToast('Order placed successfully! Pay on delivery.', 'success', 6000);
				showCheckoutSection = false;
				actions.clearCart();
				return;
			}

			// 3. For credit card, confirm payment
			if (selectedPaymentMethod === 'CREDIT_CARD') {
				if (!confirmPayment) {
					throw new Error('Payment system not ready');
				}

				if (!clientSecret) {
					throw new Error('No payment client secret received');
				}

				const { error, paymentIntent } = await confirmPayment(clientSecret);

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
			selectedPaymentMethod = 'CASH';
			actions.clearCart();

		} catch (error) {
			paymentError = error.message || 'Checkout failed. Please try again.';
		} finally {
			paymentProcessing = false;
		}
	}

	onMount(async () => {
		// Initialize the eshop store to load order blocks
		initEshopStore();
		
		// Wait for store to load business configuration
		const unsubscribe = store.subscribe(async (storeValue) => {
			if (storeValue.loading) return; // Still loading
			
			
			// Initialize order blocks and business object
			if (storeValue.orderBlocks) {
				orderBlocks = storeValue.orderBlocks.map(block => ({
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
					orderBlocks: storeValue.orderBlocks || []
				}
			};
		});
		
		return () => {
			unsubscribe();
		};
	});

	// Update order blocks when order blocks change
	$effect(() => {
		if ($store.orderBlocks) {
			orderBlocks = $store.orderBlocks.map(block => ({
				...block,
				value: block.value && block.value.length > 0 ? block.value : 
					(block.type === 'text' ? [{ en: '' }] : 
					 block.type === 'boolean' ? [false] : 
					 block.type === 'number' ? [0] : [''])
			}));
			if (businessObject) {
				businessObject.configs.orderBlocks = $store.orderBlocks;
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
						
						<!-- Dynamic Customer Information Form -->
						<DynamicForm 
							blocks={$store.orderBlocks} 
							onUpdate={(idx, value) => {
								const updatedBlocks = [...$store.orderBlocks];
								updatedBlocks[idx] = { ...updatedBlocks[idx], value: Array.isArray(value) ? value : [value] };
								store.setKey('orderBlocks', updatedBlocks);
							}}
							onPhoneSendCode={handlePhoneSendCode}
							onPhoneVerifyCode={handlePhoneVerifyCode}
							onValidationChange={handleValidationChange}
						/>

						<!-- Payment -->
						<PaymentForm
							allowedMethods={$store.allowedPaymentMethods}
							paymentProvider={$store.paymentConfig?.provider}
							{selectedPaymentMethod}
							onPaymentMethodChange={(method) => selectedPaymentMethod = method}
							onStripeReady={(confirmFn) => confirmPayment = confirmFn}
							onValidationChange={handlePaymentValidationChange}
							error={paymentError}
							variant="eshop"
						/>

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
								disabled={$store.processingCheckout || paymentProcessing || !isCompletelyValid || (selectedPaymentMethod === 'CREDIT_CARD' && !confirmPayment)}
								class="flex-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
							>
								{#if $store.processingCheckout || paymentProcessing}
									<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
									Processing...
								{:else}
									<Icon icon={selectedPaymentMethod === 'CREDIT_CARD' ? 'mdi:credit-card' : 'mdi:cash'} class="h-4 w-4" />
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