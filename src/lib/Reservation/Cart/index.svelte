<script lang="ts">
	import Icon from '@iconify/svelte';
	import PhoneInput from '../PhoneInput/index.svelte';
	import { store, actions, initReservationStore, cartParts } from '../reservationStore.js';
	import { onMount } from 'svelte';
	import { t } from '../../../lib/i18n/index';

	onMount(() => {
		initReservationStore();
	});

	const requiresPhoneVerification = $derived($store.parts?.some(part => {
		// Check if any part has a phone_number block with min_length > 0 (required)
		return part.blocks?.some(block => 
			block.properties?.variant === 'phone_number' &&
			block.properties?.min_length && 
			block.properties.min_length > 0
		);
	}) ?? false);
</script>

<div class="bg-tertiary mx-auto mt-20 max-w-xl space-y-4 rounded-xl p-4 shadow-lg">
	<h2 class="text-2xl font-bold text-primary">{t('cart.title')}</h2>

	{#if requiresPhoneVerification}
		<PhoneInput />
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

		<button
			class="bg-primary-600 hover:bg-primary-500 mt-4 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
			disabled={$store?.loading || (requiresPhoneVerification && !$store?.isPhoneVerified)}
			onclick={()=> actions.checkout()}>
			{#if !$store?.loading}
				<Icon icon="mdi:check-circle" class="h-5 w-5" />
				{t('reservation.confirm')}
			{:else}
				<svg class="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
					<path class="opacity-75" fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
				</svg>
				{t('cart.processing')}
			{/if}
		</button>

		{#if requiresPhoneVerification && !$store?.isPhoneVerified}
			<div class="bg-warning border-warning text-warning rounded-lg border p-3 text-sm">
				<div class="flex items-start gap-2">
					<Icon icon="mdi:alert" class="mt-0.5 h-5 w-5 flex-shrink-0" />
					<p>{t('phone.verifyToast')}</p>
				</div>
			</div>
		{/if}
	{/if}
</div>
