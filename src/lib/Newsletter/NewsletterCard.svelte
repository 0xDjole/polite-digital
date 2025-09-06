<script lang="ts">
	import { loadStripe } from '@stripe/stripe-js';
	
	interface StatusEvent {
		status: 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'SUSPENDED';
		created_at: number;
	}

	interface Newsletter {
		id: string;
		businessId: string;
		name: string;
		description: string;
		newsletter_type: 'Free' | 'Paid';
		statuses: StatusEvent[];
		price?: number;
		currency?: string;
		created_at: number;
		updated_at: number;
	}

	interface Props {
		newsletter: Newsletter;
	}

	let { newsletter }: Props = $props();

	let subscribing = $state(false);
	let error = $state<string | null>(null);
	let email = $state('');

	const formatPrice = (price: number, currency: string = 'USD') => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: currency.toUpperCase(),
		}).format(price);
	};

	const handleSubscribe = async () => {
		if (!email || !email.includes('@')) {
			error = 'Please enter a valid email address';
			return;
		}

		subscribing = true;
		error = null;

		if (newsletter.newsletter_type === 'Free') {
			try {
				const { newsletterApi } = await import('../core/api/newsletter');
				const response = await newsletterApi.subscribe({
					newsletterId: newsletter.id,
					email: email,
				});

				if (response.success) {
					alert('Successfully subscribed to the newsletter!');
					email = ''; // Clear the email field
				} else {
					throw new Error(response.error || 'Failed to subscribe');
				}
			} catch (err) {
				console.error('Subscription error:', err);
				error = err instanceof Error ? err.message : 'Failed to subscribe';
			} finally {
				subscribing = false;
			}
			return;
		}

		// Handle paid newsletter subscription with Stripe
		if (!newsletter.price || newsletter.price <= 0) {
			error = 'This newsletter is not properly configured for subscriptions';
			return;
		}

		try {
			// Subscribe to paid newsletter - backend returns checkout URL
			const { newsletterApi } = await import('../core/api/newsletter');
			const response = await newsletterApi.subscribe({
				newsletterId: newsletter.id,
				email: email,
			});

			if (!response.success) {
				throw new Error(response.error || 'Failed to start subscription');
			}

			// Backend returns {subscriptionId, status, checkoutUrl}
			const { checkoutUrl } = response.data;
			
			if (!checkoutUrl) {
				throw new Error('No checkout URL received from server');
			}

			// Redirect directly to Stripe checkout URL
			window.location.href = checkoutUrl;
		} catch (err) {
			console.error('Subscription error:', err);
			error = err instanceof Error ? err.message : 'Failed to start subscription';
		} finally {
			subscribing = false;
		}
	};
</script>

<div class="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow">
	<div class="space-y-4">
		<!-- Newsletter Header -->
		<div>
			<h3 class="text-xl font-semibold mb-2">{newsletter.name}</h3>
			<p class="text-muted-foreground text-sm">
				{newsletter.description}
			</p>
		</div>

		<!-- Newsletter Type & Price -->
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {newsletter.newsletter_type === 'Free' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'}">
					{newsletter.newsletter_type}
				</span>
				{#if newsletter.newsletter_type === 'Paid' && newsletter.price}
					<span class="text-sm font-medium">
						{formatPrice(newsletter.price, newsletter.currency)}/month
					</span>
				{/if}
			</div>

			<div class="text-xs text-muted-foreground">
				Status: <span class="capitalize">{newsletter.statuses[0]?.status.toLowerCase() || 'inactive'}</span>
			</div>
		</div>

		<!-- Subscription Button -->
		{#if newsletter.statuses[0]?.status === 'ACTIVE'}
			<div class="space-y-2">
				<input
					type="email"
					bind:value={email}
					placeholder="Enter your email"
					class="w-full px-3 py-2 border border-border rounded-md text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
					required
				/>
				
				<button
					onclick={handleSubscribe}
					disabled={subscribing || !email}
					class="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-md font-medium transition-colors"
				>
					{#if subscribing}
						<span class="flex items-center justify-center gap-2">
							<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
							Subscribing...
						</span>
					{:else}
						Subscribe
						{#if newsletter.newsletter_type === 'Paid' && newsletter.price}
							for {formatPrice(newsletter.price, newsletter.currency)}/mo
						{/if}
					{/if}
				</button>

				{#if error}
					<p class="text-destructive text-sm text-center">{error}</p>
				{/if}
			</div>
		{:else}
			<div class="text-center">
				<p class="text-muted-foreground text-sm">
					This newsletter is currently {newsletter.statuses[0]?.status.toLowerCase() || 'inactive'}
				</p>
			</div>
		{/if}
	</div>
</div>