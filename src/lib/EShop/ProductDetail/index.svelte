<script>
	import { onMount } from 'svelte';
	import { eshopApi, reservationApi, getImageUrl, BUSINESS_ID } from '@lib/index';
	import { showToast } from '@lib/toast.js';
	import { cartParts } from '@lib/Reservation/reservationStore.js';

	export let slug;

	let product = null;
	let loading = true;
	let error = null;
	let selectedVariant = null;
	let quantity = 1;
	let selectedImageIndex = 0;
	let addingToCart = false;
	let userToken = null;

	async function loadProduct() {
		try {
			loading = true;
			error = null;
			
			const response = await eshopApi.getProductBySlug({
				businessId: BUSINESS_ID,
				slug: slug
			});

			if (response.success) {
				product = response.data;
				selectedVariant = getDefaultVariant(product);
			} else {
				error = response.error || 'Product not found';
			}
		} catch (err) {
			error = 'Failed to load product';
			console.error('Error loading product:', err);
		} finally {
			loading = false;
		}
	}

	async function getGuestToken() {
		if (userToken) return userToken;
		
		const response = await reservationApi.getGuestToken();
		if (response.success) {
			userToken = response.token;
			return userToken;
		}
		throw new Error('Failed to get guest token');
	}

	async function addToCart() {
		if (!product || !selectedVariant) return;
		
		try {
			addingToCart = true;
			const token = await getGuestToken();
			
			const response = await eshopApi.addToCart({
				token,
				productId: product.id,
				variantId: selectedVariant.id,
				quantity,
				businessId: BUSINESS_ID
			});

			if (response.success) {
				showToast('Product added to cart!', 'success', 3000);
				// Optionally refresh cart state or redirect to cart
			} else {
				throw new Error(response.error || 'Failed to add to cart');
			}
		} catch (err) {
			showToast(`Error: ${err.message}`, 'error', 5000);
			console.error('Error adding to cart:', err);
		} finally {
			addingToCart = false;
		}
	}

	function getDefaultVariant(product) {
		return product.variants?.find(v => v.isDefault) || product.variants?.[0];
	}

	function formatPrice(priceOption) {
		if (!priceOption) return '';
		return `${priceOption.basePrice} ${priceOption.currency}`;
	}

	function getProductImages(product) {
		if (!product.gallery || product.gallery.length === 0) {
			return [];
		}
		
		return product.gallery.map(item => {
			if (item?.media?.resolutions?.original?.url) {
				return {
					url: getImageUrl(item.media.resolutions.original.url, false),
					thumbnail: getImageUrl(item.media.resolutions?.thumbnail?.url || item.media.resolutions.original.url, false),
					alt: product.name
				};
			}
			return null;
		}).filter(Boolean);
	}

	function selectVariant(variant) {
		selectedVariant = variant;
	}

	function goBack() {
		window.history.back();
	}

	onMount(() => {
		loadProduct();
	});

	$: images = product ? getProductImages(product) : [];
	$: selectedImage = images[selectedImageIndex];
	$: isInStock = selectedVariant?.stock > 0;
</script>

<div class="min-h-screen bg-gray-50 py-8">
	<div class="container mx-auto px-4">
		{#if loading}
			<div class="flex justify-center items-center py-20">
				<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
			</div>
		{:else if error}
			<div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center max-w-md mx-auto">
				<div class="text-red-800 text-lg mb-2">Error</div>
				<div class="text-red-600 mb-4">{error}</div>
				<button 
					class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors mr-2"
					on:click={loadProduct}
				>
					Retry
				</button>
				<button 
					class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
					on:click={goBack}
				>
					Go Back
				</button>
			</div>
		{:else if product}
			<!-- Breadcrumb -->
			<nav class="mb-6">
				<button 
					class="text-blue-600 hover:text-blue-800 transition-colors"
					on:click={goBack}
				>
					← Back to Products
				</button>
			</nav>

			<div class="bg-white rounded-lg shadow-lg overflow-hidden">
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6">
					<!-- Product Images -->
					<div class="space-y-4">
						{#if selectedImage}
							<div class="aspect-square bg-gray-100 rounded-lg overflow-hidden">
								<img 
									src={selectedImage.url} 
									alt={selectedImage.alt}
									class="w-full h-full object-cover"
								/>
							</div>
							
							{#if images.length > 1}
								<div class="grid grid-cols-4 gap-2">
									{#each images as image, index}
										<button 
											class="aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 transition-colors {selectedImageIndex === index ? 'border-blue-500' : 'border-transparent'}"
											on:click={() => selectedImageIndex = index}
										>
											<img 
												src={image.thumbnail} 
												alt={image.alt}
												class="w-full h-full object-cover"
											/>
										</button>
									{/each}
								</div>
							{/if}
						{:else}
							<div class="aspect-square bg-gray-200 rounded-lg flex items-center justify-center">
								<svg class="w-24 h-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
								</svg>
							</div>
						{/if}
					</div>

					<!-- Product Details -->
					<div class="space-y-6">
						<div>
							<h1 class="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
							<div class="flex items-center gap-2 mb-4">
								<span class="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
									{product.productType}
								</span>
								<span class="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
									SKU: {selectedVariant?.sku || 'N/A'}
								</span>
							</div>
							
							{#if product.description}
								<p class="text-gray-600 leading-relaxed">{product.description}</p>
							{/if}
						</div>

						<!-- Variants -->
						{#if product.variants && product.variants.length > 1}
							<div>
								<h3 class="text-lg font-semibold mb-3">Options</h3>
								<div class="grid grid-cols-1 gap-2">
									{#each product.variants as variant}
										<button 
											class="p-3 border rounded-lg text-left transition-colors {selectedVariant?.id === variant.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}"
											on:click={() => selectVariant(variant)}
											disabled={variant.stock === 0}
										>
											<div class="flex justify-between items-center">
												<div>
													<div class="font-medium">{formatPrice(variant.price)}</div>
													{#if Object.keys(variant.attributes).length > 0}
														<div class="text-sm text-gray-600">
															{#each Object.entries(variant.attributes) as [key, value]}
																<span class="mr-2">{key}: {value}</span>
															{/each}
														</div>
													{/if}
												</div>
												<div class="text-sm {variant.stock > 0 ? 'text-green-600' : 'text-red-600'}">
													{variant.stock > 0 ? `${variant.stock} in stock` : 'Out of stock'}
												</div>
											</div>
										</button>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Price and Stock -->
						{#if selectedVariant}
							<div class="border-t pt-6">
								<div class="flex items-center justify-between mb-4">
									<div class="text-3xl font-bold text-blue-600">
										{formatPrice(selectedVariant.price)}
									</div>
									<div class="text-sm {isInStock ? 'text-green-600' : 'text-red-600'}">
										{isInStock ? `${selectedVariant.stock} in stock` : 'Out of stock'}
									</div>
								</div>

								<!-- Quantity and Add to Cart -->
								{#if isInStock}
									<div class="flex gap-4">
										<div class="flex items-center">
											<label for="quantity" class="sr-only">Quantity</label>
											<button 
												class="p-2 border border-gray-300 rounded-l-lg hover:bg-gray-100 transition-colors"
												on:click={() => quantity = Math.max(1, quantity - 1)}
											>
												-
											</button>
											<input 
												id="quantity"
												type="number" 
												min="1" 
												max={selectedVariant.stock}
												bind:value={quantity}
												class="w-16 p-2 border-t border-b border-gray-300 text-center"
											/>
											<button 
												class="p-2 border border-gray-300 rounded-r-lg hover:bg-gray-100 transition-colors"
												on:click={() => quantity = Math.min(selectedVariant.stock, quantity + 1)}
											>
												+
											</button>
										</div>

										<button 
											class="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
											on:click={addToCart}
											disabled={addingToCart || !isInStock}
										>
											{#if addingToCart}
												<svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
													<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
													<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
												</svg>
												Adding...
											{:else}
												<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 2.5M7 13l2.5 2.5"></path>
												</svg>
												Add to Cart
											{/if}
										</button>
									</div>
								{:else}
									<button 
										class="w-full bg-gray-400 text-white px-6 py-3 rounded-lg cursor-not-allowed"
										disabled
									>
										Out of Stock
									</button>
								{/if}
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>