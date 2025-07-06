<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';
	import { getLocale, getLocaleFromUrl, t } from '@lib/i18n/index.js';
	import { getBlockLabel } from '@lib/index.ts';
	import PhoneInput from '@lib/PhoneInput/index.svelte';

	// Props
	let { 
		blocks = [], 
		onUpdate = (idx: number, value: unknown) => {},
		onPhoneSendCode = null,
		onPhoneVerifyCode = null
	} = $props();

	// Get the current locale from the URL
	let currLocale;
	
	// Initialize the locale when component mounts
	onMount(() => {
		const url = new URL(window.location.href);
		currLocale = getLocaleFromUrl(url);
	});

	function update(idx: number, v: unknown) {
		onUpdate(idx, v);
	}

	// Helper function to get the string value from a block value
	function getBlockValue(block: any): string {
		if (!block.value || !block.value[0]) return '';
		const val = block.value[0];
		if (typeof val === 'string') return val;
		if (typeof val === 'object' && val.en !== undefined) return val.en || '';
		return '';
	}

	// Helper function to update block value properly - always use { en: value } format
	function updateBlockValue(idx: number, value: string) {
		update(idx, { en: value });
	}
</script>

{#if blocks?.length > 0}
	{#each blocks as block, idx (block.id)}
		<div class="space-y-2 mb-4">
			{#if getBlockLabel(block, currLocale)}
				<label class="mb-1 block font-medium text-foreground">
					{getBlockLabel(block, currLocale)}
				</label>
			{/if}

			{#if block.type === 'text' || block.type === 'email'}
				{#if block.properties?.variant === 'phone_number'}
					<!-- Phone number input with verification -->
					{#if onPhoneSendCode && onPhoneVerifyCode}
						<PhoneInput
							blockId={block.id}
							value={getBlockValue(block)}
							onChange={(value) => updateBlockValue(idx, value)}
							onSendCode={onPhoneSendCode}
							onVerifyCode={onPhoneVerifyCode}
						/>
					{:else}
						<!-- Fallback for when no verification callbacks provided -->
						<input
							type="tel"
							value={getBlockValue(block)}
							placeholder="Phone number"
							on:input={(e)=>updateBlockValue(idx, e.target.value)}
							class="w-full rounded-lg border-0 bg-muted px-3 py-2 text-foreground focus:bg-background placeholder-gray-500 {block.properties?.isRequired && !getBlockValue(block) ? 'bg-red-100' : ''}"
						/>
					{/if}
				{:else if block.properties?.variant === 'note'}
					<!-- Textarea for notes -->
					<textarea
						value={getBlockValue(block)}
						placeholder={block.properties?.placeholder || ''}
						on:input={(e)=>updateBlockValue(idx, e.target.value)}
						rows="3"
						class="w-full rounded-lg border-0 bg-muted px-3 py-2 text-foreground focus:bg-background placeholder-gray-500 resize-none {block.properties?.isRequired && !getBlockValue(block) ? 'bg-red-100' : ''}"
					></textarea>
				{:else if block.properties?.options && block.properties.options.length > 0}
					<!-- Dropdown for fields with options -->
					<div class="relative">
						<select
							class="w-full appearance-none rounded-lg border-0 bg-muted px-3 py-2 pr-10 text-foreground focus:bg-background {block.properties?.isRequired && !getBlockValue(block) ? 'bg-red-100' : ''}"
							value={getBlockValue(block)}
							on:change={(e)=>updateBlockValue(idx, e.target.value)}>
							<option value="" disabled>{t('form.select', 'Select…')}</option>
							{#each block.properties.options as opt}
								<option value={opt}>{typeof opt === 'object' ? opt[currLocale] || opt.en : opt}</option>
							{/each}
						</select>
						<Icon icon="mdi:chevron-down" class="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 pointer-events-none text-muted-foreground" />
					</div>
				{:else}
					<!-- Text or Email input -->
					<input
						type={block.type === 'email' ? 'email' : 'text'}
						value={getBlockValue(block)}
						placeholder={block.properties?.placeholder || (block.type === 'email' ? 'Enter email address' : '')}
						on:input={(e)=>updateBlockValue(idx, e.target.value)}
						class="w-full rounded-lg border-0 bg-muted px-3 py-2 text-foreground focus:bg-background placeholder-gray-500 {block.properties?.isRequired && !getBlockValue(block) ? 'bg-red-100' : ''}"
					/>
				{/if}
				{#if block.properties?.isRequired && !getBlockValue(block)}
					<div class="mt-1 text-xs text-destructive">{t('form.fieldRequired', 'This field is required')}</div>
				{/if}

			{:else if block.type === 'boolean'}
				<label class="group flex items-center gap-3 cursor-pointer">
					<div class="relative">
						<input type="checkbox" class="sr-only"
							checked={block.value?.[0] ?? false}
							on:change={(e)=>update(idx, e.target.checked)}/>
						<div class="h-6 w-11 rounded-full transition-colors {block.value?.[0] ? 'bg-primary' : 'bg-muted'}"></div>
						<div class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform
		            {block.value?.[0] ? 'translate-x-5' : ''}"></div>
					</div>
					<span class="text-foreground">{getBlockLabel(block, currLocale)}</span>
				</label>

			{:else if block.type === 'number'}
				<div class="space-y-2">
					<div class="flex items-center justify-between text-sm text-muted-foreground">
						<span>{block.properties.range.min}</span>
						<span class="rounded-full bg-accent px-3 py-1 font-mono text-foreground">
							{block.value?.[0] ?? block.properties.range.min}
						</span>
						<span>{block.properties.range.max}</span>
					</div>
					<input	type="range"
							min={block.properties.range.min}
							max={block.properties.range.max}
							value={block.value?.[0] ?? block.properties.range.min}
							on:input={(e)=>update(idx, Number(e.target.value))}
							class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"/>
				</div>
			{/if}

			{#if block.properties?.description}
				<p class="mt-1 text-sm italic text-muted-foreground">
					{typeof block.properties.description === 'object' 
						? block.properties.description[currLocale] || block.properties.description.en 
						: block.properties.description}
				</p>
			{/if}
		</div>
	{/each}
{/if}