<script>
	import { onMount } from 'svelte';
	import { eshopApi, reservationApi, getImageUrl, BUSINESS_ID } from '@lib/index';
	import { showToast } from '@lib/toast.js';
	import { cartParts } from '@lib/Reservation/reservationStore.js';
	import Cart from '@lib/Reservation/Cart/index.svelte';
	import { cartItems, cartTotal, cartItemCount, store, actions, initEshopCartStore } from '../eshopCartStore.js';
	import { createEventDispatcher } from 'svelte';
	import QuantitySelector from '../QuantitySelector/index.svelte';
	import Icon from '@iconify/svelte';

	let showCheckoutForm = false;
	let checkoutFormData = {};

	function formatPrice(priceOption) {
		if (!priceOption) return '';
		return `${priceOption.basePrice} ${priceOption.currency}`;
	}

	function getProductImage(item) {
		// In a full implementation, you'd fetch product details to get images
		// For now, we'll use a placeholder
		return null;
	}

	function handleQuantityUpdate(itemId, newQuantity) {
		actions.updateQuantity(itemId, newQuantity);
	}

	function handleRemoveItem(itemId) {
		actions.removeItem(itemId);
	}

	function handleProceedToCheckout() {
		if ($cartItems.length === 0) {
			showToast('Cart is empty', 'error', 3000);
			return;
		}
		showCheckoutForm = true;
	}

	function handleCheckoutCancel() {
		showCheckoutForm = false;
		checkoutFormData = {};
	}

	async function handleCheckoutComplete(formData) {
		const success = await actions.checkout(formData, 'Cash');
		if (success) {
			showCheckoutForm = false;
			checkoutFormData = {};
		}
	}

	onMount(() => {
		initEshopCartStore();
	});

	$: hasEshopItems = $cartItems?.length > 0;
	$: hasReservationItems = $cartParts?.length > 0;
	$: totalEshopItems = $cartItemCount;
</script>

<div class="bg-tertiary mx-auto mt-20 max-w-4xl space-y-6 rounded-xl p-6 shadow-lg">
	<h1 class="text-3xl font-bold text-primary mb-6">Shopping Cart</h1>

	<!-- E-shop Cart Section -->
	<div class="space-y-4">
		<h2 class="text-2xl font-semibold text-primary flex items-center gap-2">
			<Icon icon="mdi:shopping" class="w-6 h-6" />
			Products ({totalEshopItems})
		</h2>

		{#if $store.loading}
			<div class="flex justify-center items-center py-8">
				<Icon icon="mdi:loading" class="w-8 h-8 animate-spin text-primary" />
			</div>
		{:else if $store.error}
			<div class="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
				<div class="text-red-800 text-lg mb-2">Error</div>
				<div class="text-red-600 mb-4">{$store.error}</div>
			</div>
		{:else if !hasEshopItems}
			<div class="bg-secondary rounded-lg p-6 text-center">
				<div class="text-muted bg-tertiary mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
					<Icon icon="mdi:shopping-outline" class="h-8 w-8" />
				</div>
				<p class="text-muted mb-4">No products in cart</p>
				<a href="/products" class="text-blue-600 hover:text-blue-800 font-medium">
					Browse Products →
				</a>
			</div>
		{:else}
			<div class="space-y-3">
				{#each $cartItems as item (item.id)}
					<div class="bg-secondary border-secondary rounded-lg border p-4">
						<div class="flex items-center justify-between">
							<div class="flex-1">
								<h3 class="font-medium text-primary">{item.productName}</h3>
								
								{#if Object.keys(item.variantAttributes).length > 0}
									<div class="mt-1 flex flex-wrap gap-1">
										{#each Object.entries(item.variantAttributes) as [key, value]}
											<span class="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
												{key}: {value}
											</span>
										{/each}
									</div>
								{/if}
								
								<div class="mt-2 text-lg font-semibold text-blue-600">
									{formatPrice(item.price)} each
								</div>
							</div>

							<div class="flex items-center gap-3">
								<!-- Quantity Controls -->
								<QuantitySelector 
									quantity={item.quantity}
									min={1}
									max={99}
									on:change={(e) => handleQuantityUpdate(item.id, e.detail)}
								/>

								<!-- Item Total -->
								<div class="text-lg font-bold text-primary min-w-[80px] text-right">
									{formatPrice({
										...item.price,
										basePrice: item.price.basePrice * item.quantity
									})}
								</div>

								<!-- Remove Button -->
								<button
									class="hover:bg-accent flex h-8 w-8 items-center justify-center rounded-full text-destructive hover:text-destructive/80 transition"
									on:click={() => handleRemoveItem(item.id)}
									aria-label="Remove item"
								>
									<Icon icon="mdi:delete" class="h-5 w-5" />
								</button>
							</div>
						</div>
					</div>
				{/each}
			</div>

			<!-- E-shop Cart Total and Checkout -->
			{#if $cartTotal.basePrice > 0}
				<div class="border-t pt-4">
					<div class="flex justify-between items-center mb-4">
						<span class="text-xl font-semibold">Total Products:</span>
						<span class="text-2xl font-bold text-blue-600">
							{formatPrice($cartTotal)}
						</span>
					</div>

					<button
						class="bg-primary hover:bg-primary/90 w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-primary-foreground transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
						disabled={$store.processingCheckout}
						on:click={handleProceedToCheckout}
					>
						{#if $store.processingCheckout}
							<Icon icon="mdi:loading" class="h-5 w-5 animate-spin" />
							Processing...
						{:else}
							<Icon icon="mdi:credit-card" class="h-5 w-5" />
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
				<Icon icon="mdi:calendar" class="w-6 h-6" />
				Reservations ({$cartParts.length})
			</h2>
			<Cart />
		</div>
	{:else}
		<div class="border-t pt-6">
			<h2 class="text-2xl font-semibold text-primary flex items-center gap-2 mb-4">
				<Icon icon="mdi:calendar" class="w-6 h-6" />
				Reservations (0)
			</h2>
			<div class="bg-secondary rounded-lg p-6 text-center">
				<div class="text-muted bg-tertiary mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
					<Icon icon="mdi:calendar-outline" class="h-8 w-8" />
				</div>
				<p class="text-muted mb-4">No reservations in cart</p>
				<a href="/services" class="text-blue-600 hover:text-blue-800 font-medium">
					Browse Services →
				</a>
			</div>
		</div>
	{/if}
</div>

<!-- Checkout Form Modal -->
{#if showCheckoutForm}
	<div class="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
		<div class="bg-card rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto border shadow-lg">
			<div class="p-6">
				<div class="flex justify-between items-center mb-4">
					<h3 class="text-xl font-semibold text-foreground">Checkout</h3>
					<button 
						on:click={handleCheckoutCancel}
						class="text-muted-foreground hover:text-foreground transition-colors"
					>
						<Icon icon="mdi:close" class="w-6 h-6" />
					</button>
				</div>

				<!-- Order Summary -->
				<div class="mb-6 p-4 bg-accent rounded-lg">
					<h4 class="font-medium mb-2 text-accent-foreground">Order Summary</h4>
					<div class="space-y-1 text-sm text-accent-foreground/80">
						{#each $cartItems as item}
							<div class="flex justify-between">
								<span>{item.productName} x{item.quantity}</span>
								<span>{formatPrice({ ...item.price, basePrice: item.price.basePrice * item.quantity })}</span>
							</div>
						{/each}
					</div>
					<div class="border-t border-accent-foreground/20 mt-2 pt-2 font-semibold text-accent-foreground">
						<div class="flex justify-between">
							<span>Total:</span>
							<span>{formatPrice($cartTotal)}</span>
						</div>
					</div>
				</div>

				<!-- Checkout Form -->
				<form on:submit|preventDefault={(e) => {
					const formData = new FormData(e.target);
					const data = {};
					for (let [key, value] of formData.entries()) {
						data[key] = value;
					}
					handleCheckoutComplete(data);
				}}>
					{#each $store.checkoutBlocks as block}
						<div class="mb-4">
							<label class="block text-sm font-medium text-foreground mb-2">
								{actions.getBlockLabel(block)}
								{#if block.properties?.isRequired}
									<span class="text-destructive">*</span>
								{/if}
							</label>
							
							{#if block.type === 'text'}
								{#if block.properties?.options}
									<select 
										name={block.key}
										required={block.properties?.isRequired}
										class="w-full p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring transition-colors text-foreground"
									>
										<option value="">Select...</option>
										{#each block.properties.options as option}
											<option value={option}>{option}</option>
										{/each}
									</select>
								{:else}
									<input 
										type="text" 
										name={block.key}
										placeholder={block.properties?.placeholder || ''}
										required={block.properties?.isRequired}
										class="w-full p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring transition-colors text-foreground placeholder:text-muted-foreground"
									/>
								{/if}
							{:else if block.type === 'boolean'}
								<label class="flex items-center space-x-2 cursor-pointer">
									<input 
										type="checkbox" 
										name={block.key}
										class="rounded border-border text-primary focus:ring-ring focus:ring-2"
									/>
									<span class="text-sm text-foreground">{actions.getBlockLabel(block)}</span>
								</label>
							{:else if block.type === 'number'}
								<input 
									type="number" 
									name={block.key}
									min={block.properties?.min}
									max={block.properties?.max}
									required={block.properties?.isRequired}
									class="w-full p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring transition-colors text-foreground"
								/>
							{/if}
							
							{#if block.properties?.description}
								<p class="text-xs text-muted-foreground mt-1">{block.properties.description}</p>
							{/if}
						</div>
					{/each}

					<div class="flex gap-3 mt-6">
						<button 
							type="button"
							on:click={handleCheckoutCancel}
							class="flex-1 px-4 py-3 border border-border text-foreground rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
						>
							Cancel
						</button>
						<button 
							type="submit"
							disabled={$store.processingCheckout}
							class="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{#if $store.processingCheckout}
								<Icon icon="mdi:loading" class="h-4 w-4 animate-spin inline mr-2" />
								Processing...
							{:else}
								Place Order
							{/if}
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}