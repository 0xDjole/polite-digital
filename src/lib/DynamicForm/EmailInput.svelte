<script lang="ts">
	let { 
		value = '',
		placeholder = 'Enter email address',
		required = false,
		onChange = (value: string) => {},
		onBlur = () => {}
	} = $props();

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		onChange(target.value);
	}
</script>

<input
	type="email"
	{value}
	{placeholder}
	{required}
	on:input={handleInput}
	on:blur={onBlur}
	class="w-full rounded-lg border-0 bg-muted px-3 py-2 text-foreground focus:bg-background placeholder-gray-500"
/>