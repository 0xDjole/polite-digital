<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';
	import { getLocale, getLocaleFromUrl, t } from '@lib/i18n/index.js';
	import { getBlockLabel } from '@lib/index.ts';
	import PhoneInput from '@lib/PhoneInput/index.svelte';
	import TextInput from './TextInput.svelte';
	import TextAreaInput from './TextAreaInput.svelte';
	import SelectInput from './SelectInput.svelte';
	import CheckboxInput from './CheckboxInput.svelte';
	import RangeInput from './RangeInput.svelte';

	// Props
	let { 
		blocks = [], 
		onUpdate = (idx: number, value: unknown) => {},
		onPhoneSendCode = null,
		onPhoneVerifyCode = null,
		onValidationChange = (isValid: boolean, errors: any[]) => {}
	} = $props();

	// Get the current locale from the URL
	let currLocale;
	
	// Initialize the locale when component mounts
	onMount(() => {
		const url = new URL(window.location.href);
		currLocale = getLocaleFromUrl(url);
	});

	function update(idx: number, v: unknown) {
		onUpdate(idx, v);
		// Trigger validation check after any update
		setTimeout(validateAllFields, 0);
	}

	// Validation state
	let validationErrors = $state([]);
	let isFormValid = $state(false);
	let phoneVerified = $state({}); // Track if phone is verified by blockId

	// Validate all fields and notify parent
	function validateAllFields() {
		const errors = [];
		
		blocks.forEach((block, idx) => {
			const value = getBlockValue(block);
			const error = getValidationError(block, value);
			
			if (error) {
				const fieldLabel = getBlockLabel(block, currLocale) || block.key;
				errors.push({
					index: idx,
					blockKey: fieldLabel,
					message: error,
					value: value,
					pattern: block.properties?.pattern
				});
			}
		});
		
		validationErrors = errors;
		isFormValid = errors.length === 0;
		
		// Notify parent component
		onValidationChange(isFormValid, errors);
		
		// Note: Removed automatic focus to prevent interference with PhoneInput component
	}

	// Run validation on mount and when blocks change
	$effect(() => {
		if (blocks.length > 0) {
			validateAllFields();
		}
	});

	// Helper function to get the string value from a block value
	function getBlockValue(block: any): string {
		if (!block.value || !block.value[0]) return '';
		const val = block.value[0];
		if (typeof val === 'string') return val;
		if (typeof val === 'object' && val.en !== undefined) return val.en || '';
		return '';
	}

	// Helper function to update block value properly - always use { en: value } format
	function updateBlockValue(idx: number, value: string) {
		update(idx, { en: value });
	}

	// Helper function to check if field is required based on pattern
	function isFieldRequired(block: any): boolean {
		const pattern = block.properties?.pattern;
		// All patterns make fields required except empty pattern
		return !!pattern || block.properties?.isRequired;
	}

	// Helper function to validate pattern
	function validatePattern(block: any, value: string): boolean {
		if (!block.properties?.pattern) return true;
		
		const trimmedValue = value?.trim() || '';
		if (!trimmedValue) return false; // Empty value fails validation if pattern exists
		
		try {
			const regex = new RegExp(block.properties.pattern);
			return regex.test(trimmedValue);
		} catch (e) {
			console.warn('Invalid regex pattern:', block.properties.pattern);
			return true;
		}
	}

	// Helper function to get validation error message
	function getValidationError(block: any, value: string): string {
		const trimmedValue = value?.trim() || '';
		
		if (isFieldRequired(block) && !trimmedValue) {
			return 'This field is required';
		}
		
		// Phone validation - must be verified
		if (block.properties?.variant === 'phone_number' && trimmedValue) {
			if (!phoneVerified[block.id]) {
				return 'Please verify your phone number';
			}
		}
		
		if (trimmedValue && !validatePattern(block, trimmedValue)) {
			// Return specific error messages based on pattern
			const pattern = block.properties?.pattern;
			if (pattern === '^.+@.+\\..+$') {
				return 'Please enter a valid email address';
			} else if (pattern === '^.{6,20}$') {
				return 'Phone number must be 6-20 characters';
			} else if (pattern === '^https?:\\/\\/.+$') {
				return 'Please enter a valid URL';
			} else {
				return 'Invalid format';
			}
		}
		
		return '';
	}

	// Helper function to check if field has validation error
	function hasValidationError(block: any, value: string): boolean {
		return getValidationError(block, value) !== '';
	}

	// Handle phone verification status update
	function handlePhoneValidation(blockId: string, isVerified: boolean) {
		phoneVerified[blockId] = isVerified;
		validateAllFields();
	}

</script>

{#if blocks?.length > 0}
	{#each blocks as block, idx (block.id)}
		<div class="space-y-2 mb-4">
			{#if getBlockLabel(block, currLocale)}
				<label class="mb-1 block font-medium text-foreground">
					{getBlockLabel(block, currLocale)}
					{#if isFieldRequired(block)}
						<span class="text-error ml-1">*</span>
					{/if}
				</label>
			{/if}

			{#if block.type === 'text'}
				{#if block.properties?.variant === 'phone_number'}
					<PhoneInput
						blockId={block.id}
						value={getBlockValue(block)}
						onChange={(value) => updateBlockValue(idx, value)}
						onSendCode={onPhoneSendCode}
						onVerifyCode={onPhoneVerifyCode}
						onValidationChange={(isVerified) => handlePhoneValidation(block.id, isVerified)}
					/>
				{:else if block.properties?.variant === 'note'}
					<!-- Textarea for notes -->
					<TextAreaInput
						value={getBlockValue(block)}
						placeholder={block.properties?.placeholder || ''}
						required={isFieldRequired(block)}
						onChange={(value) => updateBlockValue(idx, value)}
						onBlur={() => validateAllFields()}
					/>
				{:else if block.properties?.options && block.properties.options.length > 0}
					<!-- Dropdown for fields with options -->
					<SelectInput
						value={getBlockValue(block)}
						options={block.properties.options}
						required={isFieldRequired(block)}
						locale={currLocale}
						onChange={(value) => updateBlockValue(idx, value)}
						onBlur={() => validateAllFields()}
					/>
				{:else}
					<TextInput
						value={getBlockValue(block)}
						placeholder={block.properties?.placeholder || ''}
						required={isFieldRequired(block)}
						onChange={(value) => updateBlockValue(idx, value)}
						onBlur={() => validateAllFields()}
					/>
				{/if}
				{#if getValidationError(block, getBlockValue(block))}
					<div class="mt-1 text-xs text-error font-medium">
						<Icon icon="mdi:alert-circle" class="w-3 h-3 inline mr-1" />
						{getValidationError(block, getBlockValue(block))}
					</div>
				{/if}

			{:else if block.type === 'boolean'}
				<CheckboxInput
					value={block.value?.[0] ?? false}
					label={getBlockLabel(block, currLocale)}
					onChange={(value) => update(idx, value)}
				/>

			{:else if block.type === 'number'}
				<RangeInput
					value={block.value?.[0] ?? block.properties.range.min}
					min={block.properties.range.min}
					max={block.properties.range.max}
					onChange={(value) => update(idx, value)}
				/>
			{/if}

			{#if block.properties?.description}
				<p class="mt-1 text-sm italic text-muted-foreground">
					{typeof block.properties.description === 'object' 
						? block.properties.description[currLocale] || block.properties.description.en 
						: block.properties.description}
				</p>
			{/if}
		</div>
	{/each}
{/if}