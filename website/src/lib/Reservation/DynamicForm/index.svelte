<script lang="ts">
	import Icon from '@iconify/svelte';
	import { store, actions } from '../reservationStore.js';
	import { onMount } from 'svelte';
	import { getLocale, getLocaleFromUrl, t } from '@lib/i18n/index.js';

	// Get the current locale from the URL
	let currLocale;
	
	// Initialize the locale when component mounts
	onMount(() => {
		const url = new URL(window.location.href);
		currLocale = getLocaleFromUrl(url);
	});

	function update(idx: number, v: unknown) {
		const svc = { ...$store.service };
		const list = [...svc.reservationBlocks];
		list[idx] = { ...list[idx], value: Array.isArray(v) ? v : [v] };
		svc.reservationBlocks = list;
		store.setKey('service', svc);
	}
	
	function getBlockLabel(block) {
		return actions.getLabel(block, currLocale);
	}
</script>

{#if $store.service}
	{#each $store.service.reservationBlocks as block, idx (block.id)}
		<div class="space-y-2 mb-4">
			<label class="text-secondary mb-1 block font-medium">
				{getBlockLabel(block)}
			</label>

			{#if block.type === 'text'}
				<div class="relative">
					<select
						class="border-secondary bg-secondary focus:border-primary-500 focus:ring-primary-500 w-full appearance-none rounded-xl border p-3 pr-10 text-primary shadow-sm focus:ring-2 focus:outline-none {block.properties?.isRequired && !block.value?.[0] ? 'border-red-500' : ''}"
						value={block.value?.[0] ?? ''}
						on:change={(e)=>update(idx, e.target.value)}>
						<option value="" disabled>{t('form.select', 'Select…')}</option>
						{#each block.properties.options as opt}
							<option value={opt}>{typeof opt === 'object' ? opt[currLocale] || opt.en : opt}</option>
						{/each}
					</select>
					<Icon icon="mdi:chevron-down" class="text-muted absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 pointer-events-none" />
				</div>
				{#if block.properties?.isRequired && !block.value?.[0]}
					<div class="mt-1 text-xs text-red-400">{t('form.fieldRequired', 'This field is required')}</div>
				{/if}

			{:else if block.type === 'boolean'}
				<label class="group flex items-center gap-3 cursor-pointer">
					<div class="relative">
						<input type="checkbox" class="sr-only"
							checked={block.value?.[0] ?? false}
							on:change={(e)=>update(idx, e.target.checked)}/>
						<div class="bg-tertiary h-8 w-14 rounded-full group-hover:bg-secondary"></div>
						<div class="dot absolute top-1 left-1 h-6 w-6 rounded-full transition
						            {block.value?.[0] ? 'translate-x-6 bg-primary-500' : 'bg-white'}"></div>
					</div>
					<span class="text-secondary">{getBlockLabel(block)}</span>
				</label>

			{:else if block.type === 'number'}
				<div class="space-y-2">
					<div class="flex items-center justify-between text-muted text-sm">
						<span>{block.properties.range.min}</span>
						<span class="bg-primary-900/30 text-secondary rounded-full px-3 py-1 font-mono">
							{block.value?.[0] ?? block.properties.range.min}
						</span>
						<span>{block.properties.range.max}</span>
					</div>
					<input	type="range"
							min={block.properties.range.min}
							max={block.properties.range.max}
							value={block.value?.[0] ?? block.properties.range.min}
							on:input={(e)=>update(idx, Number(e.target.value))}
							class="bg-tertiary accent-primary-600 h-2 w-full appearance-none rounded-lg focus:ring-primary-500/30 focus:outline-none"/>
				</div>
			{/if}

			{#if block.properties?.description}
				<p class="text-muted mt-1 text-sm italic">
					{typeof block.properties.description === 'object' 
						? block.properties.description[currLocale] || block.properties.description.en 
						: block.properties.description}
				</p>
			{/if}
		</div>
	{/each}
{/if}