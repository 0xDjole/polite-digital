import { reservationApi } from './index.js';

// Shared guest token management
export async function getGuestToken(currentToken = null) {
	if (currentToken) return currentToken;
	
	const response = await reservationApi.getGuestToken();
	if (response.success) {
		return response.token;
	}
	throw new Error('Failed to get guest token');
}

// Shared phone verification
export async function updateProfilePhone(token, phoneNumber) {
	if (!phoneNumber) {
		throw new Error('Phone number is required');
	}
	
	const response = await reservationApi.updateProfilePhone({ token, phoneNumber });
	
	if (response.success) {
		return { success: true };
	} else {
		throw new Error(response.error || 'Failed to send verification code');
	}
}

export async function verifyPhoneCode(token, phoneNumber, code) {
	if (!code) {
		throw new Error('Verification code is required');
	}
	
	const response = await reservationApi.verifyPhoneCode({ token, phoneNumber, code });
	
	if (response.success) {
		return { success: true };
	} else {
		throw new Error(response.error || 'Invalid verification code');
	}
}