<script lang="ts">
	import Icon from '@iconify/svelte';
	import DynamicForm from '@lib/DynamicForm/index.svelte';
	import { store, actions, initReservationStore, cartParts } from '../reservationStore.js';
	import { onMount } from 'svelte';
	import { t } from '../../../lib/i18n/index';
	import { showToast } from '@lib/toast.js';
	import PaymentForm from '@lib/payment/PaymentForm.svelte';

	let selectedPaymentMethod = $state('CASH');
	let paymentProcessing = $state(false);
	let paymentError = $state(null);
	let confirmPayment = null;
	let formValid = $state(true);
	let formErrors = $state([]);

	onMount(() => {
		initReservationStore();
	});

	function update(idx, v) {
		const blocks = [...$store.reservationBlocks];
		blocks[idx] = { ...blocks[idx], value: Array.isArray(v) ? v : [v] };
		store.setKey('reservationBlocks', blocks);
	}

	function handleValidationChange(isValid, errors) {
		formValid = isValid;
		formErrors = errors;
		console.log('Cart validation updated:', { isValid, errors });
	}

	async function handlePhoneSendCode(blockId, phone) {
		store.setKey('phoneNumber', phone);
		return await actions.updateProfilePhone();
	}

	async function handlePhoneVerifyCode(blockId, code) {
		store.setKey('verificationCode', code);
		return await actions.verifyPhoneCode();
	}


	async function handleCheckout() {
		// Block submission if form is invalid
		if (!formValid) {
			showToast('Please fix the form errors before submitting', 'error', 4000);
			return;
		}

		paymentProcessing = true;
		paymentError = null;

		try {
			// For inquiry-only reservations, don't send payment method
			const isInquiryOnly = ($store.parts || []).every(part => part.reservationMethod?.includes('INQUIRY'));
			const paymentMethod = isInquiryOnly ? undefined : selectedPaymentMethod;
			
			// Create reservation first (for both cash and credit card)
			const checkoutResponse = await actions.checkout(paymentMethod);
			
			if (!checkoutResponse.success) {
				throw new Error(checkoutResponse.error || 'Failed to create reservation');
			}

			const { reservationId, clientSecret } = checkoutResponse.data;

			// For cash payments or inquiry-only reservations, we're done
			if (paymentMethod === 'CASH' || paymentMethod === undefined) {
				const message = isInquiryOnly ? 'Inquiry submitted successfully!' : 'Reservation created successfully!';
				showToast(message, 'success', 6000);
				
				// Clear cart
				const emptyCart = [];
				store.setKey("parts", emptyCart);
				cartParts.set(emptyCart);
				return;
			}

			// For credit card, confirm payment
			if (paymentMethod === 'CREDIT_CARD') {
				if (!confirmPayment) {
					throw new Error('Payment system not ready');
				}

				if (!clientSecret) {
					throw new Error('No payment client secret received');
				}

				console.log('Confirming reservation payment...');
				const { error, paymentIntent } = await confirmPayment(clientSecret);

				if (error) {
					throw new Error(`Payment failed: ${error.message}`);
				}

				if (paymentIntent.status === 'succeeded') {
					showToast('Payment successful! Reservation confirmed.', 'success', 6000);
				} else {
					throw new Error('Payment was not completed successfully');
				}
			}

			// Clear cart on success
			const emptyCart = [];
			store.setKey("parts", emptyCart);
			cartParts.set(emptyCart);

		} catch (error) {
			console.error('Reservation checkout error:', error);
			paymentError = error.message || 'Checkout failed. Please try again.';
		} finally {
			paymentProcessing = false;
		}
	}

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
			onValidationChange={handleValidationChange}
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

		<!-- Payment - only show if credit card selected AND there are non-inquiry parts -->
		{#if selectedPaymentMethod === 'CREDIT_CARD' && ($store.parts || []).some(part => !part.reservationMethod?.includes('INQUIRY'))}
			<PaymentForm
				allowedMethods={$store.allowedPaymentMethods || ['CASH']}
				stripePublicKey={$store.stripeConfig?.publicKey}
				{selectedPaymentMethod}
				onPaymentMethodChange={(method) => selectedPaymentMethod = method}
				onStripeReady={(confirmFn) => confirmPayment = confirmFn}
				error={paymentError}
				variant="reservation"
			/>
		{:else if ($store.allowedPaymentMethods || ['CASH']).length > 1}
			<!-- Payment method selection only -->
			<div class="space-y-4">
				<div>
					<label class="block text-sm font-medium mb-3 text-primary">
						Payment Method <span class="text-red-500">*</span>
					</label>
					<div class="grid gap-3" class:grid-cols-2={($store.allowedPaymentMethods || ['CASH']).length > 1} class:grid-cols-1={($store.allowedPaymentMethods || ['CASH']).length === 1}>
						{#if ($store.allowedPaymentMethods || ['CASH']).includes('CASH')}
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
										<div class="font-semibold" 
											class:text-primary-foreground={selectedPaymentMethod === 'CASH'}
											class:text-primary={selectedPaymentMethod !== 'CASH'}
										>Cash Payment</div>
										<div class="text-sm" 
											class:text-primary-foreground={selectedPaymentMethod === 'CASH'}
											class:text-secondary={selectedPaymentMethod !== 'CASH'}
										>Pay at appointment</div>
									</div>
								</div>
							</button>
						{/if}
						
						{#if ($store.allowedPaymentMethods || ['CASH']).includes('CREDIT_CARD') && $store.stripeConfig?.publicKey}
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
								disabled={($store.parts || []).every(part => part.reservationMethod?.includes('INQUIRY'))}
								class:opacity-50={($store.parts || []).every(part => part.reservationMethod?.includes('INQUIRY'))}
								class:cursor-not-allowed={($store.parts || []).every(part => part.reservationMethod?.includes('INQUIRY'))}
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
										<div class="font-semibold" 
											class:text-primary-foreground={selectedPaymentMethod === 'CREDIT_CARD'}
											class:text-primary={selectedPaymentMethod !== 'CREDIT_CARD'}
										>Card Payment</div>
										<div class="text-sm" 
											class:text-primary-foreground={selectedPaymentMethod === 'CREDIT_CARD'}
											class:text-secondary={selectedPaymentMethod !== 'CREDIT_CARD'}
										>
											{#if ($store.parts || []).every(part => part.reservationMethod?.includes('INQUIRY'))}
												Not available for inquiries
											{:else}
												Secure online payment
											{/if}
										</div>
									</div>
								</div>
							</button>
						{/if}
					</div>
				</div>
				
				{#if ($store.parts || []).every(part => part.reservationMethod?.includes('INQUIRY'))}
					<div class="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
						<div class="flex items-center gap-2 text-yellow-800">
							<Icon icon="mdi:information" class="w-5 h-5" />
							<span class="font-medium">Inquiry Only</span>
						</div>
						<p class="mt-1 text-yellow-700 text-sm">Credit card payment is not required for inquiry reservations. Prices shown are for reference only.</p>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Form validation errors summary removed -->

		<button
			class="bg-primary-600 hover:bg-primary-500 mt-4 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
			disabled={$store?.loading || paymentProcessing || !formValid}
			onclick={handleCheckout}>
			{#if !$store?.loading && !paymentProcessing}
				{@const isInquiryOnly = ($store.parts || []).every(part => part.reservationMethod?.includes('INQUIRY'))}
				{@const effectivePaymentMethod = isInquiryOnly ? 'CASH' : selectedPaymentMethod}
				<Icon icon={effectivePaymentMethod === 'CREDIT_CARD' ? 'mdi:credit-card' : (isInquiryOnly ? 'mdi:send' : 'mdi:check-circle')} class="h-5 w-5" />
				{#if isInquiryOnly}
					Submit Inquiry
				{:else if effectivePaymentMethod === 'CREDIT_CARD'}
					Pay & Confirm
				{:else}
					{t('reservation.confirm')}
				{/if}
			{:else}
				<svg class="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
					<path class="opacity-75" fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
				</svg>
				{paymentProcessing ? 'Processing...' : t('cart.processing')}
			{/if}
		</button>

	{/if}
</div>
