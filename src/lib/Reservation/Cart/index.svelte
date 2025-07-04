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

	onMount(() => {
		initReservationStore();
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

		<!-- Payment -->
		<PaymentForm
			allowedMethods={$store.allowedPaymentMethods || ['CASH']}
			stripePublicKey={$store.stripeConfig?.publicKey}
			{selectedPaymentMethod}
			onPaymentMethodChange={(method) => selectedPaymentMethod = method}
			onStripeReady={(confirmFn) => confirmPayment = confirmFn}
			error={paymentError}
			variant="reservation"
		/>

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
