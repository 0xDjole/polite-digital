<script lang="ts">
	import { store, actions } from '../reservationStore.js';
	import DynamicForm from '@lib/DynamicForm/index.svelte';

	let phoneStates = $state({});

	function update(idx: number, v: unknown) {
		const svc = { ...$store.service };
		const list = [...svc.reservationBlocks];
		list[idx] = { ...list[idx], value: Array.isArray(v) ? v : [v] };
		svc.reservationBlocks = list;
		store.setKey('service', svc);
	}

	async function handlePhoneSendCode(blockId: string, phone: string) {
		phoneStates[blockId] = { ...phoneStates[blockId], isLoading: true, error: null };
		store.setKey('phoneNumber', phone);
		
		const result = await actions.updateProfilePhone();
		
		if (result) {
			phoneStates[blockId] = { 
				...phoneStates[blockId], 
				isLoading: false, 
				success: "Verification code sent successfully!",
				error: null 
			};
		} else {
			phoneStates[blockId] = { 
				...phoneStates[blockId], 
				isLoading: false, 
				error: $store.phoneError || "Failed to send verification code" 
			};
		}
	}

	async function handlePhoneVerifyCode(blockId: string, code: string) {
		phoneStates[blockId] = { ...phoneStates[blockId], isVerifying: true, verifyError: null };
		store.setKey('verificationCode', code);
		
		const result = await actions.verifyPhoneCode();
		
		if (result) {
			phoneStates[blockId] = { 
				...phoneStates[blockId], 
				isVerifying: false, 
				isVerified: true,
				verifyError: null 
			};
		} else {
			phoneStates[blockId] = { 
				...phoneStates[blockId], 
				isVerifying: false, 
				verifyError: $store.verifyError || "Invalid verification code" 
			};
		}
	}
</script>

<DynamicForm 
	blocks={$store.service?.reservationBlocks || []} 
	onUpdate={update}
	onPhoneSendCode={handlePhoneSendCode}
	onPhoneVerifyCode={handlePhoneVerifyCode}
	phoneStates={phoneStates}
/>