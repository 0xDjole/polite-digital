<script>
	import { getImageUrl } from "@lib/index";
	let { blocks = [], label = '', locale = 'en', isNested = false } = $props();
	
	// Get localized content
	function getLocalizedContent(content) {
		if (!content) return '';
		if (content[locale]) return content[locale];
		if (content.en) return content.en;
		return content;
	}

	// Helper function to get badge display text
	function getBadgeText(block, locale) {
		if (!block || !block.value) return '';
		
		const valueBlock = block.value.find(v => v.key === 'value');
		if (!valueBlock || !valueBlock.value) return '';
		
		return getLocalizedContent(valueBlock.value[0]);
	}

	// Helper function to get badge image
	function getBadgeImage(block) {
		if (!block || !block.value) return null;
		
		const mediaBlock = block.value.find(v => v.key === 'media');
		if (!mediaBlock || !mediaBlock.value || !mediaBlock.value[0]) return null;
		
		return getImageUrl(mediaBlock.value[0]);
	}
	
</script>

{#if !isNested}
	<div class="space-y-6">
		{#if label}
			<h3 class="text-xl font-bold tracking-wide">{label}</h3>
		{/if}
		<div class="space-y-6">
			{#each blocks as block (block.id)}
				<div class="my-4">
					<svelte:self blocks={[block]} isNested={true} {locale} />
				</div>
			{/each}
		</div>
	</div>
{:else}
	{#each blocks as block (block.id)}
		{#if block.type === 'text' && block.properties?.variant === 'p'}
			<p class="my-2">
				{getLocalizedContent(block.value?.[0])}
			</p>
		{:else if block.type === 'text' && block.properties?.variant === 'h1'}
			<h1 class="text-3xl font-bold my-4">
				{getLocalizedContent(block.value?.[0])}
			</h1>
		{:else if block.type === 'text' && block.properties?.variant === 'h2'}
			<h2 class="text-2xl font-semibold my-3">
				{getLocalizedContent(block.value?.[0])}
			</h2>
		{:else if block.type === 'text' && block.properties?.variant === 'h3'}
			<h3 class="text-xl font-medium my-2">
				{getLocalizedContent(block.value?.[0])}
			</h3>
		{:else if block.type === 'text'}
			<p>{getLocalizedContent(block.value?.[0])}</p>
		{:else if block.type === 'media'}
			{@const imageUrl = getImageUrl(block.value?.[0])}
			{#if imageUrl}
				<div>
					<img
						src={imageUrl}
						alt=""
						class="transition-transform duration-500 hover:scale-105"
						referrerpolicy="no-referrer"
					/>
				</div>
			{/if}
		{:else if block.type === 'block' && block.properties?.variant === 'badge'}
			{@const badgeText = getBadgeText(block, locale)}
			{@const badgeImage = getBadgeImage(block)}
			
			<div class="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-primary-900/30 border border-primary-700 text-primary-300 my-2">
				<!-- Badge Image -->
				{#if badgeImage}
					<div class="flex-shrink-0 w-6 h-6 rounded-full overflow-hidden bg-base-700">
						<img 
							src={badgeImage} 
							alt={badgeText}
							class="w-full h-full object-cover"
							referrerpolicy="no-referrer"
						/>
					</div>
				{:else}
					<div class="flex-shrink-0 w-6 h-6 rounded-full bg-base-700 flex items-center justify-center">
						<svg class="w-3 h-3 text-base-500" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
						</svg>
					</div>
				{/if}

				<!-- Badge Text -->
				<span class="text-sm font-medium">
					{badgeText}
				</span>
			</div>
		{:else if block.type === 'block' && block.properties?.variant === 'ul'}
			<ul class="list-disc pl-5 my-3 space-y-1">
				{#each block.value as item}
					<li>
						<svelte:self blocks={[item]} isNested={true} {locale} />
					</li>
				{/each}
			</ul>
		{:else if block.type === 'block' && block.properties?.variant === 'ol'}
			<ol class="list-decimal pl-5 my-3 space-y-1">
				{#each block.value as item}
					<li>
						<svelte:self blocks={[item]} isNested={true} {locale} />
					</li>
				{/each}
			</ol>
		{:else if block.type === 'block' && block.properties?.variant === 'li'}
			{#if block.value}
				<svelte:self blocks={block.value} isNested={true} {locale} />
			{/if}
		{:else if block.type === 'block'}
            <div>
				{#each block.value as nestedBlock}
					<svelte:self blocks={[nestedBlock]} isNested={true} {locale} />
				{/each}
			</div>
		{/if}
	{/each}
{/if}
