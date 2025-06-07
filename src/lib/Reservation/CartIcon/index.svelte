<script>
    import Icon from '@iconify/svelte';
    import { store, initReservationStore } from '../reservationStore.js';
    import { onMount } from 'svelte';
	import {  getLocale, getRelativeLocaleUrl } from '@lib/i18n/index.js';
    
    export let className = '';
    
    onMount(() => {
        initReservationStore();
    });
</script>

<a
    href={getRelativeLocaleUrl(getLocale(), '/cart')}
    class="cart-icon relative flex h-8 w-8 items-center justify-center rounded-full {className}"
    aria-label="Shopping cart"
>
    <Icon icon="mdi:cart" class="h-5 w-5 text-primary" />
    {#if $store.parts.length > 0}
        <div
            class="bg-primary-600 absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold text-white shadow-sm"
        >
            {$store.parts.length}
        </div>
    {/if}
</a>

<style>
    .cart-icon {
        transition: transform 0.2s ease;
    }
    .cart-icon:hover {
        transform: scale(1.05);
    }
    .cart-icon:hover :global(.text-primary) {
        color: var(--text-secondary);
    }
    .cart-icon:active {
        transform: scale(0.95);
    }
    .min-w-5 {
        min-width: 1.25rem;
    }
</style>
