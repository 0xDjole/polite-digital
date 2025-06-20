// Unified cart store that combines e-shop and reservation items
import { computed } from "nanostores";
import { cartItems, cartItemCount } from "./EShop/eshopCartStore.js";
import { cartParts } from "./Reservation/reservationStore.js";

// Unified cart count (e-shop items + reservation parts)
export const unifiedCartCount = computed([cartItems, cartParts], (eshopItems, reservationParts) => {
    const eshopCount = eshopItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    const reservationCount = reservationParts?.length || 0;
    return eshopCount + reservationCount;
});

// Helpers to check if carts have items
export const hasEshopItems = computed(cartItems, (items) => items?.length > 0);
export const hasReservationItems = computed(cartParts, (parts) => parts?.length > 0);

// Check if cart is completely empty
export const isCartEmpty = computed([cartItems, cartParts], (eshopItems, reservationParts) => {
    return (!eshopItems || eshopItems.length === 0) && (!reservationParts || reservationParts.length === 0);
});

export default {
    unifiedCartCount,
    hasEshopItems,
    hasReservationItems,
    isCartEmpty
};