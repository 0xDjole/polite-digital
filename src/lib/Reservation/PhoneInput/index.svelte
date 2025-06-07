<script lang="ts">
	import Icon from '@iconify/svelte';
	import { store, actions } from '../reservationStore.js';
	import { t } from '../../../lib/i18n/index';
	import { countries } from './countries.js';
	import { onMount } from 'svelte';

	let selectedCountry = countries.find(c => c.iso === 'BA') || countries[0];
	let nationalNumber = '';
	let showDropdown = false;
	let searchTerm = '';

	$: fullPhoneNumber = selectedCountry.code + ' ' + nationalNumber;
	$: store.setKey('phoneNumber', fullPhoneNumber.trim());

	$: filteredCountries = countries.filter(c => 
		c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
		c.code.includes(searchTerm)
	).slice(0, 50);

	onMount(() => {
		// Auto-detect country from browser locale
		try {
			const locale = navigator.language || 'en-US';
			if (locale.includes('ba') || locale.includes('bs')) {
				selectedCountry = countries.find(c => c.iso === 'BA') || selectedCountry;
			} else if (locale.includes('rs') || locale.includes('sr')) {
				selectedCountry = countries.find(c => c.iso === 'RS') || selectedCountry;
			} else if (locale.includes('hr')) {
				selectedCountry = countries.find(c => c.iso === 'HR') || selectedCountry;
			} else if (locale.includes('us')) {
				selectedCountry = countries.find(c => c.iso === 'US') || selectedCountry;
			} else if (locale.includes('de')) {
				selectedCountry = countries.find(c => c.iso === 'DE') || selectedCountry;
			}
		} catch (e) {
			// Keep default
		}
	});

	function handleNationalInput(e) {
		nationalNumber = e.target.value.replace(/[^\d\s()-]/g, '');
		if ($store.phoneError) store.setKey('phoneError', null);
	}

	function selectCountry(country) {
		selectedCountry = country;
		showDropdown = false;
		searchTerm = '';
	}
</script>

<div class="bg-secondary border-secondary mt-4 overflow-hidden rounded-2xl border shadow-lg">
	<div class="border-secondary bg-card border-b px-6 py-4">
		<h2 class="text-primary text-xl font-bold">{t('phone.verification')}</h2>
		<p class="text-muted mt-1 text-sm">{t('phone.verify')}</p>
	</div>

	<div class="space-y-6 p-6">
		<div class="space-y-3">
			<label class="text-secondary mb-1 block font-medium">{t('form.phone')}</label>

			<div class="flex gap-3 items-start">
				<!-- Country dropdown -->
				<div class="relative flex-shrink-0">
					<button
						type="button"
						on:click={() => showDropdown = !showDropdown}
						class="form__input w-36 flex items-center justify-between px-4 h-12"
						disabled={$store.isPhoneVerified}
					>
						<span class="flex items-center gap-2">
							<span class="text-lg">{selectedCountry.flag}</span>
							<span class="font-mono text-sm">{selectedCountry.code}</span>
						</span>
						<Icon icon="mdi:chevron-down" class="h-4 w-4 text-muted"/>
					</button>

					{#if showDropdown}
						<div class="absolute top-full left-0 w-96 z-50 bg-popover border-secondary border rounded-xl shadow-lg mt-2 overflow-hidden">
							<div class="p-4 border-secondary border-b bg-muted">
								<input
									type="text"
									placeholder="Search countries..."
									bind:value={searchTerm}
									class="form__input w-full text-sm"
								/>
							</div>
							<div class="overflow-y-auto bg-popover" style="max-height: 400px;">
								{#each filteredCountries as country}
									<button
										type="button"
										on:click={() => selectCountry(country)}
										class="w-full p-4 text-left hover:bg-accent text-popover flex items-center gap-3 transition-colors border-b border-secondary last:border-b-0"
									>
										<span class="text-xl">{country.flag}</span>
										<span class="font-mono text-sm text-muted w-16">{country.code}</span>
										<span class="truncate text-sm">{country.name}</span>
									</button>
								{/each}
								{#if filteredCountries.length === 0}
									<div class="p-4 text-center text-muted text-sm">
										No countries found
									</div>
								{/if}
							</div>
						</div>
					{/if}
				</div>

				<!-- Phone input -->
				<div class="relative flex-1">
					<input
						type="tel"
						placeholder="61 234 567"
						value={nationalNumber}
						on:input={handleNationalInput}
						class="form__input w-full pr-12 h-12"
						disabled={$store.isPhoneVerified}
					/>
					<Icon icon="mdi:phone" class="text-muted pointer-events-none absolute inset-y-0 right-0 my-auto mr-4 h-5 w-5"/>
				</div>
			</div>

			<p class="text-muted text-xs">
				Full number: <span class="font-mono">{fullPhoneNumber || selectedCountry.code + ' ...'}</span>
			</p>

			{#if $store.phoneError}
				<p class="text-error text-sm">{$store.phoneError}</p>
			{/if}

			{#if $store.phoneSuccess}
				<p class="text-success text-sm">{$store.phoneSuccess}</p>
			{/if}

			{#if !$store.isPhoneVerified}
				<button
					on:click={() => actions.updateProfilePhone()}
					disabled={$store.isSendingCode || !nationalNumber}
					class="bg-primary-600 hover:bg-primary-700 mt-2 w-full rounded-xl px-4 py-3 font-medium text-white flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transition">
					{#if $store.isSendingCode}
						<svg class="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
						</svg>
						{t('phone.processing')}
					{:else}
						{t('reservation.sendCode')}
					{/if}
				</button>
			{/if}
		</div>

		<!-- Verification code -->
		{#if $store.phoneSuccess && !$store.isPhoneVerified}
			<div class="border-secondary space-y-3 border-t pt-6">
				<label class="text-secondary mb-1 block font-medium">Verification Code</label>
				<input
					type="text"
					maxlength="4"
					placeholder="1234"
					value={$store.verificationCode}
					on:input={(e) => {
						const cleaned = e.target.value.replace(/\D/g, '');
						store.setKey('verificationCode', cleaned);
						if ($store.verifyError) store.setKey('verifyError', null);
						if (cleaned.length === 4) actions.verifyPhoneCode();
					}}
					class="form__input text-center font-mono text-2xl tracking-wider w-full py-4"
				/>

				{#if $store.verifyError}
					<p class="text-error text-sm">{$store.verifyError}</p>
				{/if}

				<button
					on:click={() => actions.verifyPhoneCode()}
					disabled={$store.isVerifying || $store.verificationCode.length !== 4}
					class="mt-2 w-full rounded-xl bg-green-600 px-4 py-3 font-medium text-white flex items-center justify-center gap-2 hover:bg-green-700 disabled:opacity-70 disabled:cursor-not-allowed transition">
					{#if $store.isVerifying}
						<svg class="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
						</svg>
						{t('phone.verifying')}
					{:else}
						{t('reservation.verifyCode')}
					{/if}
				</button>
			</div>
		{/if}

		<!-- Success -->
		{#if $store.isPhoneVerified}
			<div class="bg-success border-success mt-4 flex items-center gap-3 rounded-xl border p-4">
				<Icon icon="mdi:check" class="h-5 w-5 text-white bg-green-500 rounded-full p-1"/>
				<div>
					<p class="text-success font-medium">{t('reservation.phoneVerified')}</p>
					<p class="text-success text-sm opacity-80">{$store.phoneNumber}</p>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Click outside to close dropdown -->
{#if showDropdown}
	<div class="fixed inset-0 z-40" on:click={() => showDropdown = false}></div>
{/if}