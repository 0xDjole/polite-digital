<script>
	import { getLocale, getRelativeLocaleUrl } from "@lib/i18n";

	const API_URL = import.meta.env.PUBLIC_API_URL;
	const STORAGE_URL = import.meta.env.PUBLIC_STORAGE_URL;
	const BUSINESS_ID = import.meta.env.PUBLIC_BUSINESS_ID;

	let locale = "en";
	let services = [];

	function getGalleryThumbnail(gallery) {
		if (!gallery?.length) return null;
		const item = gallery.find((g) => g.settings?.isThumbnail) || gallery[0];
		const res = item.media.resolutions.thumbnail || item.media.resolutions.original;
		return res?.url || null;
	}

	function getPrice(priceOption) {
		if (!priceOption) return "";
		switch (priceOption.type) {
			case "standard":
				return `${priceOption.basePrice}${priceOption.currency}`;
			case "custom":
				return priceOption.customValue[locale] || priceOption.customValue.en;
			case "complex": {
				const val = priceOption.customValue[locale] || priceOption.customValue.en;
				return `${priceOption.basePrice}${priceOption.currency} + ${val}`;
			}
			default:
				return "";
		}
	}

	async function loadServices() {
		const res = await fetch(
			`${API_URL}/v1/businesses/${BUSINESS_ID}/services?limit=100`
		);
		const { items } = await res.json();
		services = items;
	}

	loadServices();
</script>

<div class="mt-30 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
	{#if services.length === 0}
		<p class="col-span-full text-gray-600">No services found.</p>
	{:else}
		{#each services as service (service.id)}
			{@const thumbPath = getGalleryThumbnail(service.gallery)}
			{@const thumbUrl = thumbPath ? `${STORAGE_URL}/${thumbPath}` : null}

			<a
				href={getRelativeLocaleUrl(getLocale(), `/services/${service.slug}`) }
				class="block overflow-hidden rounded-lg border shadow-sm transition hover:shadow-md"
			>
				{#if thumbUrl}
					<img
						src={thumbUrl}
						alt={service.name[locale] || service.name.en}
						referrerpolicy="no-referrer"
						class="h-40 w-full object-cover"
					/>
				{/if}

				<div class="p-4">
					<h3 class="text-lg font-medium">
						{service.name[locale] || service.name.en}
					</h3>
					<p class="mt-2 text-sm text-gray-600">
						{getPrice(service.priceOption)}
					</p>
				</div>
			</a>
		{/each}
	{/if}
</div>

