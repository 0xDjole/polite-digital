<script>
	import { getBlockLabel } from '@lib/index.ts';
	
	export let blocks = [];
	export let variant = 'badges'; // 'badges' | 'inline' | 'list'
	export let label = '';

	// Extract text value from block, preferring 'en' language
	function getBlockValue(block) {
		if (!block.value || block.value.length === 0) return '';
		
		const firstValue = block.value[0];
		
		// Handle multilingual object
		if (typeof firstValue === 'object' && firstValue !== null) {
			// Try 'en' first, then fallback to first available language
			if (firstValue.en) return firstValue.en;
			const values = Object.values(firstValue);
			return values[0] || '';
		}
		
		// Handle simple string
		return String(firstValue);
	}

</script>

{#if blocks && blocks.length > 0}
	<div class="attribute-blocks">
		{#if label}
			<div class="attribute-label">{label}</div>
		{/if}
		
		{#if variant === 'badges'}
			<div class="attribute-badges">
				{#each blocks as block}
					{@const value = getBlockValue(block)}
					{@const blockLabel = getBlockLabel(block, 'en')}
					{#if value}
						<span class="attribute-badge">
							{blockLabel}: {value}
						</span>
					{/if}
				{/each}
			</div>
		{:else if variant === 'inline'}
			<div class="attribute-inline">
				{#each blocks as block}
					{@const value = getBlockValue(block)}
					{@const blockLabel = getBlockLabel(block, 'en')}
					{#if value}
						<span class="attribute-item">
							<strong>{blockLabel}:</strong> {value}
						</span>
					{/if}
				{/each}
			</div>
		{:else if variant === 'list'}
			<div class="attribute-list">
				{#each blocks as block}
					{@const value = getBlockValue(block)}
					{@const blockLabel = getBlockLabel(block, 'en')}
					{#if value}
						<div class="attribute-list-item">
							<dt class="attribute-list-label">{blockLabel}</dt>
							<dd class="attribute-list-value">{value}</dd>
						</div>
					{/if}
				{/each}
			</div>
		{/if}
	</div>
{/if}

<style>
	.attribute-blocks {
		margin-bottom: 0.5rem;
	}

	.attribute-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-secondary, #6b7280);
		margin-bottom: 0.5rem;
	}

	/* Badge variant */
	.attribute-badges {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.attribute-badge {
		display: inline-block;
		background-color: var(--bg-muted, #f3f4f6);
		color: var(--text-primary, #1f2937);
		font-size: 0.75rem;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
	}

	/* Inline variant */
	.attribute-inline {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.attribute-item {
		font-size: 0.875rem;
		color: var(--text-secondary, #6b7280);
	}

	/* List variant */
	.attribute-list {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.attribute-list-item {
		display: flex;
		justify-content: space-between;
	}

	.attribute-list-label {
		font-size: 0.875rem;
		color: var(--text-secondary, #6b7280);
	}

	.attribute-list-value {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary, #111827);
	}
</style>