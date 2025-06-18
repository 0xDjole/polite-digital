<script>
	import { onMount } from 'svelte';
	import { eshopApi, reservationApi, getImageUrl, BUSINESS_ID } from '@lib/index';
	import { showToast } from '@lib/toast.js';
	import { cartParts } from '@lib/Reservation/reservationStore.js';
	import Cart from '@lib/Reservation/Cart/index.svelte';

	let eshopCart = null;
	let loading = true;
	let error = null;
	let userToken = null;
	let userId = null;
	let processingCheckout = false;

	async function getGuestToken() {
		if (userToken) return userToken;
		
		const response = await reservationApi.getGuestToken();
		if (response.success) {
			userToken = response.token;
			// Extract user ID from token payload (simplified - in production you'd decode JWT properly)
			const payload = JSON.parse(atob(response.token.split('.')[1]));
			userId = payload.sub || payload.user_id || 'guest';
			return userToken;
		}
		throw new Error('Failed to get guest token');
	}

	async function loadEshopCart() {
		try {
			loading = true;
			error = null;
			
			const token = await getGuestToken();
			
			const response = await eshopApi.getCart({
				token,
				userId,
				businessId: BUSINESS_ID
			});

			if (response.success) {
				eshopCart = response.data;
			} else {
				error = response.error || 'Failed to load cart';
			}
		} catch (err) {
			error = 'Failed to load cart';
			console.error('Error loading cart:', err);
		} finally {
			loading = false;
		}
	}

	async function updateQuantity(cartItemId, newQuantity) {
		try {
			const token = await getGuestToken();
			
			const response = await eshopApi.updateCartItem({
				token,
				cartItemId,
				quantity: newQuantity
			});

			if (response.success) {
				await loadEshopCart();
				showToast('Cart updated!', 'success', 2000);
			} else {
				throw new Error(response.error || 'Failed to update cart');
			}
		} catch (err) {
			showToast(`Error: ${err.message}`, 'error', 5000);
			console.error('Error updating cart:', err);
		}
	}

	async function removeItem(cartItemId) {
		try {
			const token = await getGuestToken();
			
			const response = await eshopApi.removeFromCart({
				token,
				cartItemId
			});

			if (response.success) {
				await loadEshopCart();
				showToast('Item removed from cart!', 'success', 2000);
			} else {
				throw new Error(response.error || 'Failed to remove item');
			}
		} catch (err) {
			showToast(`Error: ${err.message}`, 'error', 5000);
			console.error('Error removing item:', err);
		}
	}

	async function checkout() {
		if (!eshopCart?.items?.length) return;
		
		try {
			processingCheckout = true;
			const token = await getGuestToken();
			
			// Simple checkout with basic order info
			const orderInfoBlocks = [
				{
					id: crypto.randomUUID(),
					type: 'text',
					value: 'guest@example.com', // In production, this would come from user input
					properties: {
						label: { en: 'Email' },
						key: 'email'
					}
				}
			];
			
			const response = await eshopApi.checkout({
				token,
				cartId: eshopCart.id,
				paymentMethod: 'Cash', // Simple default - in production you'd have payment options
				orderInfoBlocks
			});

			if (response.success) {
				showToast('Order placed successfully!', 'success', 6000);
				await loadEshopCart(); // Refresh cart
			} else {
				throw new Error(response.error || 'Failed to place order');
			}
		} catch (err) {
			showToast(`Checkout failed: ${err.message}`, 'error', 8000);
			console.error('Checkout error:', err);
		} finally {
			processingCheckout = false;
		}
	}

	function formatPrice(priceOption) {
		if (!priceOption) return '';
		return `${priceOption.basePrice} ${priceOption.currency}`;
	}

	function getProductImage(item) {
		// In a full implementation, you'd fetch product details to get images
		// For now, we'll use a placeholder
		return null;
	}

	onMount(() => {
		loadEshopCart();
	});

	$: hasEshopItems = eshopCart?.items?.length > 0;
	$: hasReservationItems = $cartParts?.length > 0;
	$: totalEshopItems = eshopCart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
</script>

<div class="bg-tertiary mx-auto mt-20 max-w-4xl space-y-6 rounded-xl p-6 shadow-lg">
	<h1 class="text-3xl font-bold text-primary mb-6">Shopping Cart</h1>

	<!-- E-shop Cart Section -->
	<div class="space-y-4">
		<h2 class="text-2xl font-semibold text-primary flex items-center gap-2">
			<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 2.5M7 13l2.5 2.5"></path>
			</svg>
			Products ({totalEshopItems})
		</h2>

		{#if loading}
			<div class="flex justify-center items-center py-8">
				<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
			</div>
		{:else if error}
			<div class="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
				<div class="text-red-800 text-lg mb-2">Error</div>
				<div class="text-red-600 mb-4">{error}</div>
				<button 
					class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
					on:click={loadEshopCart}
				>
					Retry
				</button>
			</div>
		{:else if !hasEshopItems}
			<div class="bg-secondary rounded-lg p-6 text-center">
				<div class="text-muted bg-tertiary mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
					<svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 2.5M7 13l2.5 2.5"></path>
					</svg>
				</div>
				<p class="text-muted mb-4">No products in cart</p>
				<a href="/products" class="text-blue-600 hover:text-blue-800 font-medium">
					Browse Products →
				</a>
			</div>
		{:else}
			<div class="space-y-3">
				{#each eshopCart.items as item (item.id)}
					<div class="bg-secondary border-secondary rounded-lg border p-4">
						<div class="flex items-center justify-between">
							<div class="flex-1">
								<h3 class="font-medium text-primary">{item.productNameSnapshot}</h3>
								
								{#if Object.keys(item.variantAttributesSnapshot).length > 0}
									<div class="mt-1 flex flex-wrap gap-1">
										{#each Object.entries(item.variantAttributesSnapshot) as [key, value]}
											<span class="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
												{key}: {value}
											</span>
										{/each}
									</div>
								{/if}
								
								<div class="mt-2 text-lg font-semibold text-blue-600">
									{formatPrice(item.priceSnapshot)} each
								</div>
							</div>

							<div class="flex items-center gap-3">
								<!-- Quantity Controls -->
								<div class="flex items-center">
									<button 
										class="p-1 border border-gray-300 rounded-l hover:bg-gray-100 transition-colors"
										on:click={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
									>
										-
									</button>
									<span class="px-3 py-1 border-t border-b border-gray-300 bg-white">
										{item.quantity}
									</span>
									<button 
										class="p-1 border border-gray-300 rounded-r hover:bg-gray-100 transition-colors"
										on:click={() => updateQuantity(item.id, item.quantity + 1)}
									>
										+
									</button>
								</div>

								<!-- Item Total -->
								<div class="text-lg font-bold text-primary min-w-[80px] text-right">
									{formatPrice({
										...item.priceSnapshot,
										basePrice: item.priceSnapshot.basePrice * item.quantity
									})}
								</div>

								<!-- Remove Button -->
								<button
									class="hover:bg-tertiary flex h-8 w-8 items-center justify-center rounded-full text-red-500 hover:text-red-600 transition"
									on:click={() => removeItem(item.id)}
									aria-label="Remove item"
								>
									<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
									</svg>
								</button>
							</div>
						</div>
					</div>
				{/each}
			</div>

			<!-- E-shop Cart Total and Checkout -->
			{#if eshopCart.total}
				<div class="border-t pt-4">
					<div class="flex justify-between items-center mb-4">
						<span class="text-xl font-semibold">Total Products:</span>
						<span class="text-2xl font-bold text-blue-600">
							{formatPrice(eshopCart.total)}
						</span>
					</div>

					<button
						class="bg-primary-600 hover:bg-primary-500 w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
						disabled={processingCheckout}
						on:click={checkout}
					>
						{#if processingCheckout}
							<svg class="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							Processing...
						{:else}
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
							</svg>
							Checkout Products
						{/if}
					</button>
				</div>
			{/if}
		{/if}
	</div>

	<!-- Reservations Section -->
	{#if hasReservationItems}
		<div class="border-t pt-6">
			<h2 class="text-2xl font-semibold text-primary flex items-center gap-2 mb-4">
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
				</svg>
				Reservations ({$cartParts.length})
			</h2>
			<Cart />
		</div>
	{:else}
		<div class="border-t pt-6">
			<h2 class="text-2xl font-semibold text-primary flex items-center gap-2 mb-4">
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
				</svg>
				Reservations (0)
			</h2>
			<div class="bg-secondary rounded-lg p-6 text-center">
				<div class="text-muted bg-tertiary mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
					<svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
					</svg>
				</div>
				<p class="text-muted mb-4">No reservations in cart</p>
				<a href="/services" class="text-blue-600 hover:text-blue-800 font-medium">
					Browse Services →
				</a>
			</div>
		</div>
	{/if}
</div>