<script lang="ts">
	import Icon from '@iconify/svelte';
	import { store, actions } from '../reservationStore.js';
	import { t } from '../../../lib/i18n/index';
</script>

<div class="bg-secondary border-secondary mt-4 overflow-hidden rounded-2xl border shadow-lg">
	<div class="border-secondary bg-card border-b px-6 py-4">
		<h2 class="text-primary text-xl font-bold">{t('phone.verification')}</h2>
		<p class="text-muted mt-1 text-sm">{t('phone.verify')}</p>
	</div>

	<div class="space-y-6 p-6">
		<!-- Phone input -->
		<div class="space-y-2">
			<label class="text-secondary mb-1 block font-medium">{t('form.phone')}</label>

			<div class="relative">
				<input
					type="tel"
					placeholder="+1-555-1234"
					value={$store.phoneNumber}
					on:input={(e) => store.setKey('phoneNumber', e.target.value)}
					class="form__input"/>
				<Icon icon="mdi:phone" class="text-muted pointer-events-none absolute inset-y-0 right-0 my-auto mr-3 h-5 w-5"/>
			</div>

			{#if $store.phoneError}
				<p class="text-error text-sm">{$store.phoneError}</p>
			{/if}

			<button
				on:click={() => actions.updateProfilePhone()}
				disabled={$store.isSendingCode}
				class="bg-primary-600 hover:bg-primary-700 mt-2 w-full rounded-xl px-4 py-3 font-medium text-white flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transition">
				{#if !$store.isSendingCode}
					{t('reservation.sendCode')}
				{:else}
					<svg class="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
						<path class="opacity-75" fill="currentColor"
							  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
					</svg>
					{t('phone.processing')}
				{/if}
			</button>
		</div>

		<!-- Verification code section -->
		{#if !$store.isPhoneVerified}
			<div class="border-secondary space-y-2 border-t pt-6">
				<label class="text-secondary mb-1 block font-medium">{t('reservation.verificationCode', 'Verification Code')}</label>

				<div class="relative">
					<input
						type="text"
						maxlength="6"
						placeholder={t('reservation.enterCode')}
						value={$store.verificationCode}
						on:input={(e) => store.setKey('verificationCode', e.target.value)}
						class="form__input text-center font-mono tracking-wider"/>
					<Icon icon="mdi:shield-check" class="text-muted pointer-events-none absolute inset-y-0 right-0 my-auto mr-3 h-5 w-5"/>
				</div>

				{#if $store.verifyError}
					<p class="text-error text-sm">{$store.verifyError}</p>
				{/if}

				<button
					on:click={() => actions.verifyPhoneCode()}
					disabled={$store.isVerifying}
					class="mt-2 w-full rounded-xl bg-green-600 px-4 py-3 font-medium text-white flex items-center justify-center gap-2 hover:bg-green-700 disabled:opacity-70 disabled:cursor-not-allowed transition">
					{#if !$store.isVerifying}
						<Icon icon="mdi:check-circle" class="h-5 w-5"/> {t('reservation.verifyCode')}
					{:else}
						<svg class="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
							<path class="opacity-75" fill="currentColor"
								   d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
						</svg>
						{t('phone.verifying')}
					{/if}
				</button>
			</div>
		{/if}

		<!-- Success state -->
		{#if $store.isPhoneVerified}
			<div class="bg-success border-success mt-4 flex items-center gap-3 rounded-xl border p-4">
				<div class="rounded-full bg-green-500 p-1">
					<Icon icon="mdi:check" class="h-5 w-5 text-white"/>
				</div>
				<div>
					<p class="text-success font-medium">{t('reservation.phoneVerified')}</p>
					<p class="text-success text-sm opacity-80">{$store.phoneNumber}</p>
				</div>
			</div>
		{/if}
	</div>
</div>
