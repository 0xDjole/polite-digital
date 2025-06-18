<script>
	import { createEventDispatcher } from 'svelte';
	import Icon from '@iconify/svelte';
	
	export let quantity = 1;
	export let min = 1;
	export let max = 100;
	export let disabled = false;
	
	const dispatch = createEventDispatcher();
	
	function increment() {
		if (quantity < max && !disabled) {
			quantity = Math.min(max, quantity + 1);
			dispatch('change', quantity);
		}
	}
	
	function decrement() {
		if (quantity > min && !disabled) {
			quantity = Math.max(min, quantity - 1);
			dispatch('change', quantity);
		}
	}
	
	function handleInput(event) {
		const value = parseInt(event.target.value) || min;
		quantity = Math.max(min, Math.min(max, value));
		dispatch('change', quantity);
	}
	
	$: canDecrement = quantity > min && !disabled;
	$: canIncrement = quantity < max && !disabled;
</script>

<div class="flex items-center bg-accent rounded-lg border border-border overflow-hidden shadow-sm">
	<button 
		type="button"
		class="flex items-center justify-center w-10 h-10 text-muted-foreground hover:text-accent-foreground hover:bg-background transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
		disabled={!canDecrement}
		on:click={decrement}
		aria-label="Decrease quantity"
	>
		<Icon icon="mdi:minus" class="w-4 h-4" />
	</button>
	
	<input 
		type="number" 
		{min} 
		{max}
		{disabled}
		bind:value={quantity}
		on:input={handleInput}
		class="w-16 h-10 text-center bg-transparent border-0 text-accent-foreground font-medium focus:outline-none focus:ring-0 appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
		style="-moz-appearance: textfield;"
	/>
	
	<button 
		type="button"
		class="flex items-center justify-center w-10 h-10 text-muted-foreground hover:text-accent-foreground hover:bg-background transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
		disabled={!canIncrement}
		on:click={increment}
		aria-label="Increase quantity"
	>
		<Icon icon="mdi:plus" class="w-4 h-4" />
	</button>
</div>

<style>
	/* Hide number input spinners in all browsers */
	input[type="number"]::-webkit-outer-spin-button,
	input[type="number"]::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
	
	input[type="number"] {
		-moz-appearance: textfield;
	}
</style>