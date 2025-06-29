<script lang="ts">
	import PhoneInput from '@lib/PhoneInput/index.svelte';
	
	// Accept callbacks instead of stores
	let { value = '', onChange, onSendCode, onVerifyCode, blockId } = $props();
	
	// Local phone verification state for this specific block
	let phoneState = $state({
		isLoading: false,
		error: null,
		success: null,
		isVerifying: false,
		verifyError: null,
		isVerified: false,
		verificationCode: ''
	});

	function handleSendCode(phone) {
		console.log('PhoneVerification handleSendCode called', { blockId, phone, onSendCode });
		phoneState.isLoading = true;
		phoneState.error = null;
		
		if (!onSendCode) {
			console.error('onSendCode callback not provided');
			phoneState.isLoading = false;
			phoneState.error = "No send code callback provided";
			return;
		}
		
		onSendCode(blockId, phone).then(result => {
			phoneState.isLoading = false;
			if (result) {
				phoneState.success = "Verification code sent successfully!";
				phoneState.error = null;
			} else {
				phoneState.error = "Failed to send verification code";
			}
		}).catch(error => {
			phoneState.isLoading = false;
			phoneState.error = error.message || "Failed to send verification code";
		});
	}

	function handleVerifyCode(code) {
		phoneState.isVerifying = true;
		phoneState.verifyError = null;
		
		onVerifyCode(blockId, code).then(result => {
			phoneState.isVerifying = false;
			if (result) {
				phoneState.isVerified = true;
				phoneState.verifyError = null;
			} else {
				phoneState.verifyError = "Invalid verification code";
			}
		}).catch(error => {
			phoneState.isVerifying = false;
			phoneState.verifyError = error.message || "Invalid verification code";
		});
	}
</script>

<PhoneInput
	{value}
	{onChange}
	onSendCode={handleSendCode}
	onVerifyCode={handleVerifyCode}
	isVerified={phoneState.isVerified}
	isLoading={phoneState.isLoading}
	error={phoneState.error}
	success={phoneState.success}
	verificationCode={phoneState.verificationCode}
	isVerifying={phoneState.isVerifying}
	verifyError={phoneState.verifyError}
/>