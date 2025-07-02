<script lang="ts">
	import Icon from '@iconify/svelte';
	import DynamicForm from '@lib/DynamicForm/index.svelte';
	import { store, actions, initReservationStore, cartParts } from '../reservationStore.js';
	import { onMount, tick } from 'svelte';
	import { t } from '../../../lib/i18n/index';
	import { loadStripe } from '@stripe/stripe-js';
	import { showToast } from '@lib/toast.js';

	let selectedPaymentMethod = $state('CASH');
	let stripe = $state(null);
	let elements = $state(null);
	let cardNumberElement = $state(null);
	let cardExpiryElement = $state(null);
	let cardCvcElement = $state(null);
	let elementsReady = $state(false);
	let paymentProcessing = $state(false);
	let paymentError = $state(null);

	onMount(() => {
		initReservationStore();
		
		// Watch for Stripe config changes
		const unsubscribe = store.subscribe(async (storeValue) => {
			// Auto-select first available payment method
			const allowedMethods = storeValue.allowedPaymentMethods || ['CASH'];
			
			if (selectedPaymentMethod === 'CASH' && !allowedMethods.includes('CASH')) {
				if (allowedMethods.includes('CREDIT_CARD') && storeValue.stripeConfig.enabled) {
					selectedPaymentMethod = 'CREDIT_CARD';
				}
			} else if (selectedPaymentMethod === 'CREDIT_CARD' && (!allowedMethods.includes('CREDIT_CARD') || !storeValue.stripeConfig.enabled)) {
				if (allowedMethods.includes('CASH')) {
					selectedPaymentMethod = 'CASH';
				}
			}

			// Initialize Stripe if enabled and not already loaded
			if (storeValue.stripeConfig.enabled && storeValue.stripeConfig.publicKey && !stripe) {
				try {
					stripe = await loadStripe(storeValue.stripeConfig.publicKey);
					console.log('Stripe loaded for reservations');
				} catch (error) {
					console.error('Failed to load Stripe for reservations:', error);
				}
			}
		});
		
		return () => {
			unsubscribe();
		};
	});

	function update(idx, v) {
		const blocks = [...$store.reservationBlocks];
		blocks[idx] = { ...blocks[idx], value: Array.isArray(v) ? v : [v] };
		store.setKey('reservationBlocks', blocks);
	}

	async function handlePhoneSendCode(blockId, phone) {
		store.setKey('phoneNumber', phone);
		return await actions.updateProfilePhone();
	}

	async function handlePhoneVerifyCode(blockId, code) {
		store.setKey('verificationCode', code);
		return await actions.verifyPhoneCode();
	}

	async function setupStripeElements() {
		if (!stripe || elementsReady || selectedPaymentMethod !== 'CREDIT_CARD') return;

		await tick();
		
		const cardNumberContainer = document.getElementById('reservation-card-number');
		const cardExpiryContainer = document.getElementById('reservation-card-expiry');
		const cardCvcContainer = document.getElementById('reservation-card-cvc');
		
		if (!cardNumberContainer || !cardExpiryContainer || !cardCvcContainer) {
			console.error('Reservation card element containers not found');
			return;
		}

		// Clear existing content
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
			cardNumberElement.mount('#reservation-card-number');
			cardExpiryElement.mount('#reservation-card-expiry');
			cardCvcElement.mount('#reservation-card-cvc');
			
			elementsReady = true;
			console.log('Stripe card elements mounted for reservations');
		} catch (error) {
			console.error('Failed to mount Stripe card elements for reservations:', error);
			paymentError = 'Failed to setup payment form';
		}
	}

	function destroyStripeElements() {
		if (cardNumberElement) cardNumberElement.destroy();
		if (cardExpiryElement) cardExpiryElement.destroy();
		if (cardCvcElement) cardCvcElement.destroy();
		cardNumberElement = null;
		cardExpiryElement = null;
		cardCvcElement = null;
		elementsReady = false;
	}

	async function handleCheckout() {
		paymentProcessing = true;
		paymentError = null;

		try {
			// Create reservation first (for both cash and credit card)
			const checkoutResponse = await actions.checkout(selectedPaymentMethod);
			
			if (!checkoutResponse.success) {
				throw new Error(checkoutResponse.error || 'Failed to create reservation');
			}

			const { reservationId, clientSecret } = checkoutResponse.data;

			// For cash payments, we're done
			if (selectedPaymentMethod === 'CASH') {
				showToast('Reservation created successfully!', 'success', 6000);
				
				// Clear cart
				const emptyCart = [];
				store.setKey("parts", emptyCart);
				cartParts.set(emptyCart);
				return;
			}

			// For credit card, confirm payment
			if (selectedPaymentMethod === 'CREDIT_CARD') {
				if (!stripe || !cardNumberElement) {
					throw new Error('Payment system not initialized');
				}

				if (!clientSecret) {
					throw new Error('No payment client secret received');
				}

				console.log('Confirming reservation payment...');
				const { error, paymentIntent } = await stripe.confirmCardPayment(
					clientSecret,
					{
						payment_method: {
							card: cardNumberElement,
							billing_details: {
								name: ''
							}
						}
					}
				);

				if (error) {
					throw new Error(`Payment failed: ${error.message}`);
				}

				if (paymentIntent.status === 'succeeded') {
					showToast('Payment successful! Reservation confirmed.', 'success', 6000);
				} else {
					throw new Error('Payment was not completed successfully');
				}

				// Clear cart
				const emptyCart = [];
				store.setKey("parts", emptyCart);
				cartParts.set(emptyCart);
				
				// Clean up Stripe elements
				destroyStripeElements();
			}

		} catch (error) {
			console.error('Reservation checkout error:', error);
			paymentError = error.message || 'Checkout failed. Please try again.';
		} finally {
			paymentProcessing = false;
		}
	}

	// Setup Stripe elements when payment method changes to credit card
	$effect(() => {
		if (selectedPaymentMethod === 'CREDIT_CARD' && stripe && !elementsReady) {
			setupStripeElements();
		} else if (selectedPaymentMethod !== 'CREDIT_CARD' && elementsReady) {
			destroyStripeElements();
		}
	});
</script>

<div class="bg-tertiary mx-auto mt-20 max-w-xl space-y-4 rounded-xl p-4 shadow-lg">
	<h2 class="text-2xl font-bold text-primary">{t('cart.title')}</h2>

	<!-- Business-level reservation form (cart checkout) -->
	{#if $store.reservationBlocks?.length > 0}
		<DynamicForm 
			blocks={$store.reservationBlocks} 
			onUpdate={update}
			onPhoneSendCode={handlePhoneSendCode}
			onPhoneVerifyCode={handlePhoneVerifyCode}
		/>
	{/if}

	{#if !$store.parts?.length}
		<div class="bg-secondary rounded-lg p-6 text-center">
			<div class="text-muted bg-tertiary mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
				<Icon icon="mdi:cart-outline" class="h-8 w-8" />
			</div>
			<p class="text-muted">{t('cart.empty')}</p>
		</div>
	{:else}
		<div class="space-y-2">
			{#each $store.parts || [] as part (part.id)}
				<div class="bg-secondary border-secondary rounded-lg border p-4">
					<div class="flex items-center justify-between">
						<div>
							<h3 class="font-medium text-primary">{part.serviceName}</h3>

							{#if part.isMultiDay}
								<div class="mt-1 flex items-center gap-1.5">
									<Icon icon="mdi:calendar-range" class="text-secondary h-4 w-4" />
									<div class="text-secondary text-sm">{part.date}</div>
								</div>
							{:else}
								<div class="mt-1 flex items-center gap-1.5">
									<Icon icon="mdi:calendar" class="text-secondary h-4 w-4" />
									<div class="text-secondary text-sm">{part.date}</div>
								</div>
							{/if}

							<div class="mt-1 flex items-center gap-1.5">
								<Icon icon="mdi:clock-outline" class="text-secondary h-4 w-4" />
								<div class="text-secondary text-sm">{part.timeText}</div>
							</div>

							{#if part.providerId}
								<div class="mt-1 flex items-center gap-1.5">
									<Icon icon="mdi:account" class="text-secondary h-4 w-4" />
									<div class="text-secondary text-sm">{t('reservation.specificProvider')}</div>
								</div>
							{/if}
						</div>

						<button
							class="hover:bg-tertiary flex h-8 w-8 items-center justify-center rounded-full text-red-500 hover:text-red-600 transition"
							onclick={() => actions.removePart(part.id)}
							aria-label={t('cart.remove')}>
							<Icon icon="mdi:trash-can-outline" class="h-5 w-5" />
						</button>
					</div>
				</div>
			{/each}
		</div>

		<!-- Payment Method Selection -->
		<div class="space-y-4">
			<div>
				<label class="block text-sm font-medium text-primary mb-3">
					Payment Method <span class="text-red-500">*</span>
				</label>
				<div class="grid gap-3" class:grid-cols-2={$store.allowedPaymentMethods?.length > 1} class:grid-cols-1={$store.allowedPaymentMethods?.length === 1}>
					{#if $store.allowedPaymentMethods?.includes('CASH')}
						<button 
							type="button"
							class="relative flex items-center p-4 rounded-lg cursor-pointer transition-all border-2"
							class:border-primary={selectedPaymentMethod === 'CASH'}
							class:bg-primary={selectedPaymentMethod === 'CASH'}
							class:shadow-sm={selectedPaymentMethod === 'CASH'}
							class:border-transparent={selectedPaymentMethod !== 'CASH'}
							class:bg-secondary={selectedPaymentMethod !== 'CASH'}
							class:hover:bg-tertiary={selectedPaymentMethod !== 'CASH'}
							onclick={() => selectedPaymentMethod = 'CASH'}
						>
							{#if selectedPaymentMethod === 'CASH'}
								<div class="absolute top-2 right-2">
									<Icon icon="mdi:check-circle" class="w-5 h-5 text-primary" />
								</div>
							{/if}
							<div class="flex items-center gap-3">
								<div class="flex items-center justify-center w-12 h-12 rounded-full bg-background">
									<Icon icon="mdi:cash" class="w-6 h-6 text-primary" />
								</div>
								<div class="text-left">
									<div class="font-semibold" class:text-primary-foreground={selectedPaymentMethod === 'CASH'} class:text-primary={selectedPaymentMethod !== 'CASH'}>Cash Payment</div>
									<div class="text-sm" class:text-primary-foreground={selectedPaymentMethod === 'CASH'} class:text-secondary={selectedPaymentMethod !== 'CASH'}>Pay at appointment</div>
								</div>
							</div>
						</button>
					{/if}
					
					{#if $store.allowedPaymentMethods?.includes('CREDIT_CARD') && $store.stripeConfig?.enabled}
						<button 
							type="button"
							class="relative flex items-center p-4 rounded-lg cursor-pointer transition-all border-2"
							class:border-primary={selectedPaymentMethod === 'CREDIT_CARD'}
							class:bg-primary={selectedPaymentMethod === 'CREDIT_CARD'}
							class:shadow-sm={selectedPaymentMethod === 'CREDIT_CARD'}
							class:border-transparent={selectedPaymentMethod !== 'CREDIT_CARD'}
							class:bg-secondary={selectedPaymentMethod !== 'CREDIT_CARD'}
							class:hover:bg-tertiary={selectedPaymentMethod !== 'CREDIT_CARD'}
							onclick={() => selectedPaymentMethod = 'CREDIT_CARD'}
						>
							{#if selectedPaymentMethod === 'CREDIT_CARD'}
								<div class="absolute top-2 right-2">
									<Icon icon="mdi:check-circle" class="w-5 h-5 text-primary" />
								</div>
							{/if}
							<div class="flex items-center gap-3">
								<div class="flex items-center justify-center w-12 h-12 rounded-full bg-background">
									<Icon icon="mdi:credit-card" class="w-6 h-6 text-primary" />
								</div>
								<div class="text-left">
									<div class="font-semibold" class:text-primary-foreground={selectedPaymentMethod === 'CREDIT_CARD'} class:text-primary={selectedPaymentMethod !== 'CREDIT_CARD'}>Card Payment</div>
									<div class="text-sm" class:text-primary-foreground={selectedPaymentMethod === 'CREDIT_CARD'} class:text-secondary={selectedPaymentMethod !== 'CREDIT_CARD'}>Secure online payment</div>
								</div>
							</div>
						</button>
					{/if}
				</div>
			</div>

			<!-- Credit Card Details -->
			{#if selectedPaymentMethod === 'CREDIT_CARD'}
				<div class="bg-secondary rounded-lg border p-6">
					<div class="flex items-center gap-2 mb-4">
						<Icon icon="mdi:credit-card" class="w-5 h-5 text-primary" />
						<h4 class="font-medium text-primary">Card Details</h4>
					</div>
					
					<div class="space-y-4">
						<div>
							<label class="block text-sm font-medium text-primary mb-2">
								Card Number
							</label>
							<div 
								id="reservation-card-number" 
								class="p-4 border border-border rounded-lg min-h-[56px] bg-background"
							>
							</div>
						</div>

						<div class="grid grid-cols-2 gap-4">
							<div>
								<label class="block text-sm font-medium text-primary mb-2">
									Expiry Date
								</label>
								<div 
									id="reservation-card-expiry" 
									class="p-4 border border-border rounded-lg min-h-[56px] bg-background"
								>
								</div>
							</div>

							<div>
								<label class="block text-sm font-medium text-primary mb-2">
									CVC
								</label>
								<div 
									id="reservation-card-cvc" 
									class="p-4 border border-border rounded-lg min-h-[56px] bg-background"
								>
								</div>
							</div>
						</div>
						
						<div class="flex items-center gap-2 text-sm text-secondary">
							<Icon icon="mdi:shield-check" class="w-4 h-4 text-green-600" />
							<span>Your payment information is encrypted and secure</span>
						</div>
					</div>
				</div>
			{/if}

			<!-- Error Message -->
			{#if paymentError}
				<div class="p-4 bg-red-50 border border-red-200 rounded-lg">
					<div class="flex items-center gap-2 text-red-600">
						<Icon icon="mdi:alert-circle" class="w-5 h-5" />
						<span class="font-medium">Payment Error</span>
					</div>
					<p class="text-red-500 mt-1">{paymentError}</p>
				</div>
			{/if}
		</div>

		<button
			class="bg-primary-600 hover:bg-primary-500 mt-4 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
			disabled={$store?.loading || paymentProcessing}
			onclick={handleCheckout}>
			{#if !$store?.loading && !paymentProcessing}
				<Icon icon={selectedPaymentMethod === 'CREDIT_CARD' ? 'mdi:credit-card' : 'mdi:check-circle'} class="h-5 w-5" />
				{selectedPaymentMethod === 'CREDIT_CARD' ? 'Pay & Confirm' : t('reservation.confirm')}
			{:else}
				<svg class="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
					<path class="opacity-75" fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
				</svg>
				{paymentProcessing ? 'Processing Payment...' : t('cart.processing')}
			{/if}
		</button>

	{/if}
</div>
