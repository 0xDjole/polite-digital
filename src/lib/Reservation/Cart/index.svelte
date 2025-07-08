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


	$inspect('sss ',selectedPaymentMethod);

	onMount(() => {
		initReservationStore();
	});

	// Auto-select appropriate payment method
	$effect(() => {
		const isInquiryOnly = ($store.parts || []).every(part => part.reservationMethod?.includes('INQUIRY'));
		
		if (isInquiryOnly) {
			// For inquiry-only, always use FREE
			selectedPaymentMethod = 'FREE';
		} else {
			// For non-inquiry, use business's allowed payment methods
			const allowedMethods = $store.allowedPaymentMethods || ['CASH'];
			if (allowedMethods.length > 0 && !allowedMethods.includes(selectedPaymentMethod)) {
				selectedPaymentMethod = allowedMethods[0];
			}
		}
	});

	function update(idx, v) {
		const blocks = [...$store.reservationBlocks];
		blocks[idx] = { ...blocks[idx], value: Array.isArray(v) ? v : [v] };
		store.setKey('reservationBlocks', blocks);
	}

	function handleValidationChange(isValid, errors) {
		console.log('is valid ',isValid,errors);
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
			// Always send payment method (including FREE for inquiry-only)
			const checkoutResponse = await actions.checkout(selectedPaymentMethod);
			
			if (!checkoutResponse.success) {
				throw new Error(checkoutResponse.error || 'Failed to create reservation');
			}

			const { reservationId, clientSecret } = checkoutResponse.data;

			// For cash payments or free inquiries, we're done
			if (selectedPaymentMethod === 'CASH' || selectedPaymentMethod === 'FREE') {
				const message = selectedPaymentMethod === 'FREE' ? 'Inquiry submitted successfully!' : 'Reservation created successfully!';
				showToast(message, 'success', 6000);
				
				// Clear cart
				const emptyCart = [];
				store.setKey("parts", emptyCart);
				cartParts.set(emptyCart);
				return;
			}

			// For credit card, confirm payment
			if (selectedPaymentMethod === 'CREDIT_CARD') {
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
		{@const debugParts = ($store.parts || []).map(p => ({ id: p.id, reservationMethod: p.reservationMethod }))}
		{@const hasNonInquiryParts = ($store.parts || []).some(part => !part.reservationMethod?.includes('INQUIRY'))}
		{console.log('RESERVATION PAYMENT DEBUG:', { selectedPaymentMethod, parts: debugParts, hasNonInquiryParts, allowedPaymentMethods: $store.allowedPaymentMethods })}
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
		{:else}
			<!-- Payment method selection only -->
			<div class="space-y-4">
				<div>
					<label class="block text-sm font-medium mb-3 text-primary">
						Payment Method <span class="text-red-500">*</span>
					</label>
					{#each [($store.parts || []).every(part => part.reservationMethod?.includes('INQUIRY'))] as isInquiryOnly}
						{@const availableMethods = isInquiryOnly ? ['FREE'] : ($store.allowedPaymentMethods || ['CASH'])}
						<div class="grid gap-3" class:grid-cols-2={availableMethods.length > 1} class:grid-cols-1={availableMethods.length === 1}>
						{#if availableMethods.includes('FREE')}
							<button 
								type="button"
								class="relative flex items-center p-4 rounded-lg cursor-pointer transition-all border-2"
								class:border-primary={selectedPaymentMethod === 'FREE'}
								class:bg-primary={selectedPaymentMethod === 'FREE'}
								class:shadow-sm={selectedPaymentMethod === 'FREE'}
								class:border-transparent={selectedPaymentMethod !== 'FREE'}
								class:bg-secondary={selectedPaymentMethod !== 'FREE'}
								class:hover:bg-tertiary={selectedPaymentMethod !== 'FREE'}
								onclick={() => selectedPaymentMethod = 'FREE'}
							>
								{#if selectedPaymentMethod === 'FREE'}
									<div class="absolute top-2 right-2">
										<Icon icon="mdi:check-circle" class="w-5 h-5 text-primary" />
									</div>
								{/if}
								<div class="flex items-center gap-3">
									<div class="flex items-center justify-center w-12 h-12 rounded-full bg-background">
										<Icon icon="mdi:gift" class="w-6 h-6 text-primary" />
									</div>
									<div class="text-left">
										<div class="font-semibold" 
											class:text-primary-foreground={selectedPaymentMethod === 'FREE'}
											class:text-primary={selectedPaymentMethod !== 'FREE'}
										>Free Inquiry</div>
										<div class="text-sm" 
											class:text-primary-foreground={selectedPaymentMethod === 'FREE'}
											class:text-secondary={selectedPaymentMethod !== 'FREE'}
										>No payment required</div>
									</div>
								</div>
							</button>
						{/if}
						
						{#if availableMethods.includes('CASH')}
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
						
						{#if availableMethods.includes('CREDIT_CARD') && $store.stripeConfig?.publicKey}
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
					{/each}
				</div>
			</div>
		{/if}

		<!-- Form validation errors summary removed -->

		<button
			class="bg-primary-600 hover:bg-primary-500 mt-4 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
			disabled={$store?.loading || paymentProcessing || !formValid || (selectedPaymentMethod === 'CREDIT_CARD' && !confirmPayment)}
			onclick={handleCheckout}>
			{#if !$store?.loading && !paymentProcessing}
				<Icon icon={selectedPaymentMethod === 'CREDIT_CARD' ? 'mdi:credit-card' : (selectedPaymentMethod === 'FREE' ? 'mdi:send' : 'mdi:check-circle')} class="h-5 w-5" />
				{#if selectedPaymentMethod === 'FREE'}
					Submit Inquiry
				{:else if selectedPaymentMethod === 'CREDIT_CARD'}
					Pay & Confirm
				{:else}
					{t('reservation.confirm')}
				{/if}
			{:else}
				<Icon icon="mdi:loading" class="h-5 w-5 animate-spin" />
				{paymentProcessing ? 'Processing...' : t('cart.processing')}
			{/if}
		</button>

	{/if}
</div>
