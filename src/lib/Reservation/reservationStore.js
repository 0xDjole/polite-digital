// src/lib/Reservation/reservationStore.js - Optimized version
import { computed, deepMap } from "nanostores";
import { persistentAtom } from "@nanostores/persistent";
import { getLocalizedString, getLocale, getLocaleFromUrl } from "../../lib/i18n/index";
import { API_URL, BUSINESS_ID, STORAGE_URL } from "../env";
import { getPrice, reservationApi } from "../index";
import { tzGroups, findTimeZone } from "./timezone-utils";
import { showToast } from "../toast.js";

export const cartParts = persistentAtom("reservationCart", [], {
	encode: JSON.stringify,
	decode: JSON.parse,
});

export const store = deepMap({
	currentStep: 1,
	totalSteps: 4,
	steps: {
		1: { name: "method", labelKey: "method" },
		2: { name: "provider", labelKey: "provider" },
		3: { name: "datetime", labelKey: "datetime" },
		4: { name: "review", labelKey: "review" },
	},

	// Calendar data
	weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
	monthYear: "",
	days: [],
	current: new Date(),

	// Selection state
	selectedDate: null,
	slots: [],
	selectedSlot: null,
	selectedMethod: null,
	selectedProvider: null,
	providers: [],

	// Status flags
	loading: false,
	startDate: null,
	endDate: null,
	isMultiDay: false,

	// Phone verification
	phoneNumber: "",
	phoneError: null,
	phoneSuccess: null,
	verificationCode: "",
	verifyError: null,
	isPhoneVerified: false,
	isSendingCode: false,
	isVerifying: false,
	codeSentAt: null,
	canResendAt: null,

	// Service & config
	guestToken: null,
	service: null,
	apiUrl: API_URL,
	businessId: BUSINESS_ID,
	storageUrl: STORAGE_URL,
	timezone: findTimeZone(tzGroups),
	tzGroups,
	parts: [],
});

export const currentStepName = computed(store, (state) => {
	return state?.steps?.[state?.currentStep]?.name || "";
});

export const canProceed = computed(store, (state) => {
	const stepName = state?.steps?.[state?.currentStep]?.name;
	switch (stepName) {
		case "method":
			return !!state.selectedMethod;
		case "provider":
			return !!state.selectedProvider;
		case "datetime":
			return state.isMultiDay
				? !!(state.startDate && state.endDate && state.selectedSlot)
				: !!(state.selectedDate && state.selectedSlot);
		case "review":
			return true;
		default:
			return false;
	}
});

const createCalendarGrid = (date) => {
	const first = new Date(date.getFullYear(), date.getMonth(), 1);
	const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
	const cells = [];

	// Leading blanks
	const pad = (first.getDay() + 6) % 7;
	for (let i = 0; i < pad; i++) cells.push({ key: `b-${i}`, blank: true });

	// Date cells
	for (let d = 1; d <= last.getDate(); d++) {
		cells.push({
			key: `d-${d}`,
			blank: false,
			date: new Date(date.getFullYear(), date.getMonth(), d),
			available: false,
		});
	}

	// Trailing blanks
	const suffix = (7 - (cells.length % 7)) % 7;
	for (let i = 0; i < suffix; i++) cells.push({ key: `b2-${i}`, blank: true });

	return cells;
};

const formatTimeSlot = (from, to, timezone) => {
	const opts = { hour: "2-digit", minute: "2-digit", timeZone: timezone };
	return `${new Date(from * 1000).toLocaleTimeString([], opts)} – ${new Date(to * 1000).toLocaleTimeString([], opts)}`;
};

// Actions
export const actions = {
	// Calendar management
	updateCalendarGrid() {
		const state = store.get();
		const cur = state.current || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
		const days = createCalendarGrid(cur);

		store.setKey("current", cur);
		store.setKey("monthYear", cur.toLocaleString(undefined, { month: "long", year: "numeric" }));
		store.setKey("days", days);
	},

	updateCalendar() {
		this.updateCalendarGrid();
		const state = store.get();
		if (state.service) this.fetchAvailability("month");
	},

	prevMonth() {
		const { current } = store.get();
		store.setKey("current", new Date(current.getFullYear(), current.getMonth() - 1, 1));
		this.updateCalendar();
	},

	nextMonth() {
		const { current } = store.get();
		store.setKey("current", new Date(current.getFullYear(), current.getMonth() + 1, 1));
		this.updateCalendar();
	},

	// Service initialization
	setService(service) {
		store.setKey("service", service);
		store.setKey("selectedMethod", null);
		store.setKey("selectedProvider", null);
		store.setKey("providers", []);
		store.setKey("selectedDate", null);
		store.setKey("startDate", null);
		store.setKey("endDate", null);
		store.setKey("slots", []);
		store.setKey("selectedSlot", null);
		store.setKey("currentStep", 1);
		store.setKey("isMultiDay", !!service?.reservationConfigs?.isMultiDay);

		const now = new Date();
		store.setKey("current", new Date(now.getFullYear(), now.getMonth(), 1));
		this.updateCalendarGrid();

		// Auto-select if only one method available
		if (service.reservationMethods?.length === 1) {
			const method = service.reservationMethods[0];
			store.setKey("selectedMethod", method);
			this.determineTotalSteps();
			this.handleMethodSelection(method, false);
		} else {
			this.determineTotalSteps();
		}
		this.fetchAvailability("month");
	},

	// Step management
	determineTotalSteps() {
		const state = store.get();
		if (!state.service) {
			store.setKey("totalSteps", 1);
			return 1;
		}

		const active = [];
		if (state.service.reservationMethods?.length > 1) {
			active.push({ name: "method", label: "Choose Reservation Type" });
		}
		if (state.selectedMethod?.includes("SPECIFIC")) {
			active.push({ name: "provider", label: "Choose Provider" });
		}
		if (state.selectedMethod && state.selectedMethod !== "ORDER") {
			active.push({
				name: "datetime",
				label: state.isMultiDay ? "Choose Date Range" : "Choose Date & Time",
			});
		}
		active.push({ name: "review", label: "Review & Confirm" });

		const stepObj = {};
		active.forEach((st, idx) => {
			stepObj[idx + 1] = st;
		});

		store.setKey("steps", stepObj);
		store.setKey("totalSteps", active.length);

		if (state.currentStep > active.length) {
			store.setKey("currentStep", active.length);
		}
		return active.length;
	},

	async getGuestToken() {
		const state = store.get();
		if (state.guestToken) return state.guestToken;

		const res = await reservationApi.getGuestToken();
		if (res.success) {
			store.setKey("guestToken", res.token);
			return res.token;
		}
		throw new Error("Failed to get guest token");
	},

	getStepNumberByName(name) {
		const { steps } = store.get();
		for (const [k, v] of Object.entries(steps)) {
			if (v.name === name) return Number(k);
		}
		return null;
	},

	nextStep() {
		const state = store.get();
		if (state.currentStep >= state.totalSteps || !canProceed.get()) return;

		const next = state.currentStep + 1;
		const name = state.steps[next]?.name;
		store.setKey("currentStep", next);

		if (name === "datetime") {
			this.fetchAvailability("month");
			if (!state.selectedDate && !state.startDate) {
				this.findFirstAvailable();
			}
		}
	},

	prevStep() {
		const state = store.get();
		if (state.currentStep <= 1) return;
		this.clearCurrentStepState();
		store.setKey("currentStep", state.currentStep - 1);
	},

	clearCurrentStepState() {
		const name = currentStepName.get();
		if (name === "method") {
			store.setKey("selectedMethod", null);
		} else if (name === "provider") {
			store.setKey("selectedProvider", null);
			store.setKey("providers", []);
		} else if (name === "datetime") {
			store.setKey("selectedDate", null);
			store.setKey("startDate", null);
			store.setKey("endDate", null);
			store.setKey("slots", []);
			store.setKey("selectedSlot", null);
		}
	},

	goToStep(step) {
		const state = store.get();
		if (step < 1 || step > state.totalSteps) return;

		if (step < state.currentStep) {
			for (let i = state.currentStep; i > step; i--) {
				const n = state.steps[i]?.name;
				if (n === "datetime") {
					store.setKey("selectedDate", null);
					store.setKey("startDate", null);
					store.setKey("endDate", null);
					store.setKey("slots", []);
					store.setKey("selectedSlot", null);
				} else if (n === "provider") {
					store.setKey("selectedProvider", null);
					store.setKey("providers", []);
				} else if (n === "method") {
					store.setKey("selectedMethod", null);
				}
			}
		}

		store.setKey("currentStep", step);

		if (state.steps[step]?.name === "datetime") {
			this.fetchAvailability("month");
			if (!state.selectedDate && !state.startDate) {
				this.findFirstAvailable();
			}
		}
	},

	// Method selection
	async handleMethodSelection(method, advance = true) {
		store.setKey("selectedDate", null);
		store.setKey("startDate", null);
		store.setKey("endDate", null);
		store.setKey("slots", []);
		store.setKey("selectedSlot", null);
		store.setKey("selectedMethod", method);

		this.determineTotalSteps();

		if (method === "ORDER") {
			this.handleOrderMethod();
			if (advance) {
				const reviewStep = this.getStepNumberByName("review");
				if (reviewStep) this.goToStep(reviewStep);
				return;
			}
		} else if (method.includes("SPECIFIC")) {
			await this.loadProviders();
			const state = store.get();
			if (advance && state.providers.length === 1) {
				this.selectProvider(state.providers[0]);
				const datetimeStep = this.getStepNumberByName("datetime");
				if (datetimeStep) this.goToStep(datetimeStep);
				return;
			}
		} else if (method === "STANDARD" && advance) {
			const datetimeStep = this.getStepNumberByName("datetime");
			if (datetimeStep) this.goToStep(datetimeStep);
			return;
		}

		if (advance && store.get().currentStep < store.get().totalSteps) {
			this.nextStep();
		}
	},

	handleOrderMethod() {
		const state = store.get();
		const now = new Date();
		const dur = state.service.durations?.reduce((a, c) => a + c.duration, 0) || 3600;
		const from = Math.floor(now.getTime() / 1000);
		const to = from + dur;

		store.setKey("selectedSlot", {
			from,
			to,
			timeText: formatTimeSlot(from, to, state.timezone),
		});
	},

	// Provider management
	async loadProviders() {
		store.setKey("loading", true);
		store.setKey("providers", []);

		try {
			const { businessId, service } = store.get();
			const res = await reservationApi.getProviders({ businessId, serviceId: service.id });
			store.setKey("providers", res.success ? res.data : []);
		} catch (e) {
			console.error("Error loading providers:", e);
		} finally {
			store.setKey("loading", false);
		}
	},

	selectProvider(r) {
		store.setKey("selectedProvider", r);
		store.setKey("selectedDate", null);
		store.setKey("startDate", null);
		store.setKey("endDate", null);
		store.setKey("slots", []);
		store.setKey("selectedSlot", null);

		if (currentStepName.get() === "datetime") {
			this.fetchAvailability("month");
			this.findFirstAvailable();
		}
	},

	// Availability and date management
	async fetchAvailability(type, date = null) {
		const state = store.get();
		if (!state.service || currentStepName.get() !== "datetime") return;

		store.setKey("loading", true);

		try {
			let from, to, limit;

			if (type === "month") {
				from = Math.floor(
					new Date(state.current.getFullYear(), state.current.getMonth(), 1).getTime() / 1000,
				);
				to = Math.floor(
					new Date(state.current.getFullYear(), state.current.getMonth() + 1, 0).getTime() / 1000,
				);
				limit = 100;
			} else if (type === "day" && date) {
				const dObj = typeof date === "string" ? new Date(date) : date;
				from = Math.floor(dObj.getTime() / 1000);
				to = from + 24 * 3600;
				limit = 100;
			} else if (type === "first") {
				const now = new Date();
				from = Math.floor(now.setHours(0, 0, 0, 0) / 1000);
				to = Math.floor(new Date(now.getFullYear(), now.getMonth() + 3, 0).getTime() / 1000);
				limit = 1;
			} else {
				store.setKey("loading", false);
				return;
			}

			const params = { businessId: state.businessId, serviceId: state.service.id, from, to, limit };
			if (state.selectedProvider) params.providerId = state.selectedProvider.id;

			const result = await reservationApi.getAvailableSlots(params);
			if (!result.success) {
				console.error(`Error fetching availability (${type}):`, result.error);
				return;
			}

			if (type === "month") {
				const avail = new Set(
					result.data.map((i) => {
						const date = new Date(i.from * 1000);
						return date.toISOString().slice(0, 10);
					}),
				);
				store.setKey(
					"days",
					state.days.map((c) => {
						if (!c.blank && c.date) {
							const iso = c.date.toISOString().slice(0, 10);
							return { ...c, available: avail.has(iso) };
						}
						return c;
					}),
				);
			} else if (type === "day") {
				const slots = result.data.map((i, idx) => ({
					...i,
					id: `slot-${i.from}-${idx}`,
					day: new Date(i.from * 1000).toISOString().slice(0, 10),
					timeText: formatTimeSlot(i.from, i.to, state.timezone),
				}));

				store.setKey("slots", slots);
				if (slots.length && !state.selectedSlot) {
					store.setKey("selectedSlot", slots[0]);
				}
			} else if (type === "first" && result.data.length) {
				const first = new Date(result.data[0].from * 1000);
				const iso = first.toISOString().slice(0, 10);

				store.setKey("current", new Date(first.getFullYear(), first.getMonth(), 1));
				this.updateCalendarGrid();
				await this.fetchAvailability("month");

				if (state.isMultiDay) {
					store.setKey("startDate", iso);
					store.setKey("selectedDate", iso);
				} else {
					store.setKey("selectedDate", iso);
					await this.fetchAvailability("day", iso);
				}
			}
		} catch (err) {
			console.error(`Error in fetchAvailability (${type}):`, err);
		} finally {
			store.setKey("loading", false);
		}
	},

	findFirstAvailable() {
		if (currentStepName.get() === "datetime") this.fetchAvailability("first");
	},

	// Date selection
	selectDate(cell) {
		if (!cell.date || !cell.available) return;
		// Store date components directly to avoid timezone issues
		const dateInfo = {
			year: cell.date.getFullYear(),
			month: cell.date.getMonth() + 1,
			day: cell.date.getDate(),
			iso: `${cell.date.getFullYear()}-${String(cell.date.getMonth() + 1).padStart(2, '0')}-${String(cell.date.getDate()).padStart(2, '0')}`
		};
		const state = store.get();

		if (state.isMultiDay) {
			if (!state.startDate) {
				store.setKey("startDate", dateInfo.iso);
				store.setKey("selectedSlot", null);
				store.setKey("selectedDate", dateInfo.iso);
				store.setKey("endDate", null);
			} else if (!state.endDate) {
				const start = new Date(state.startDate).getTime();
				const cellT = cell.date.getTime();
				if (cellT < start) {
					store.setKey("endDate", state.startDate);
					store.setKey("startDate", dateInfo.iso);
				} else {
					store.setKey("endDate", dateInfo.iso);
				}
			} else {
				store.setKey("startDate", dateInfo.iso);
				store.setKey("selectedDate", dateInfo.iso);
				store.setKey("endDate", null);
				store.setKey("selectedSlot", null);
			}
		} else {
			store.setKey("selectedSlot", null);
			store.setKey("selectedDate", dateInfo.iso);
			this.fetchAvailability("day", dateInfo.iso);
		}
	},

	createMultiDaySlot() {
		const state = store.get();
		if (!state.startDate || !state.endDate) return;

		const startDT = new Date(state.startDate);
		startDT.setHours(9, 0, 0, 0);
		const endDT = new Date(state.endDate);
		endDT.setHours(17, 0, 0, 0);

		const from = Math.floor(startDT.getTime() / 1000);
		const to = Math.floor(endDT.getTime() / 1000);

		const rangeSlot = {
			id: `multi-day-slot-${from}-${to}`,
			from,
			to,
			isMultiDay: true,
			timeText: `9:00 AM - 5:00 PM daily`,
			dateRange: `${this.formatDateDisplay(state.startDate)} to ${this.formatDateDisplay(state.endDate)}`,
			day: state.startDate,
		};

		store.setKey("slots", [rangeSlot]);
		store.setKey("selectedSlot", rangeSlot);
	},

	resetDateSelection() {
		store.setKey("startDate", null);
		store.setKey("endDate", null);
		store.setKey("selectedDate", null);
		store.setKey("slots", []);
		store.setKey("selectedSlot", null);
	},

	selectTimeSlot(slot) {
		store.setKey("selectedSlot", slot);
	},

	setSelectedTimeZone(zone) {
		const state = store.get();
		if (zone === state.timezone) return;

		store.setKey("timezone", zone);

		if (currentStepName.get() === "datetime") {
			if (state.selectedDate) {
				this.fetchAvailability("day", state.selectedDate);
			} else if (!state.selectedDate && !state.startDate) {
				this.findFirstAvailable();
			}
		}
	},

	// Calendar helpers
	isAvailable(cell) {
		return cell.date && cell.available;
	},
	isSelectedDay(cell) {
		if (cell.blank || !cell.date) return false;
		const iso = `${cell.date.getFullYear()}-${String(cell.date.getMonth() + 1).padStart(2, '0')}-${String(cell.date.getDate()).padStart(2, '0')}`;
		const state = store.get();
		return iso === state.startDate || iso === state.endDate || iso === state.selectedDate;
	},
	isInSelectedRange(cell) {
		const state = store.get();
		if (cell.blank || !cell.date || !state.startDate || !state.endDate) return false;
		const t = cell.date.getTime();
		const a = new Date(state.startDate).getTime();
		const b = new Date(state.endDate).getTime();
		return t >= a && t <= b;
	},
	formatDateDisplay(ds) {
		if (!ds) return "";
		const d = new Date(ds);
		return d.toLocaleDateString(getLocale(), { month: "short", day: "numeric" });
	},

	// Cart operations
	addToCart(slot) {
		const state = store.get();
		const id = crypto.randomUUID();

		let dateDisplay, timeText;
		if (state.isMultiDay && slot.isMultiDay) {
			const a = new Date(slot.from * 1000),
				b = new Date(slot.to * 1000);
			dateDisplay = `${a.toLocaleDateString(getLocale(), { month: "short", day: "numeric" })} - ${b.toLocaleDateString(getLocale(), { month: "short", day: "numeric", year: "numeric" })}`;
			timeText = slot.timeText;
		} else {
			const date = state.selectedDate ? new Date(state.selectedDate) : new Date(slot.from * 1000);
			dateDisplay = date.toLocaleDateString(getLocale(), {
				weekday: "short",
				year: "numeric",
				month: "short",
				day: "numeric",
			});
			timeText = slot.timeText;
		}

		const blocks = (state.service?.reservationBlocks || []).map((f) => ({
			...f,
			value: Array.isArray(f.value) ? f.value : [f.value],
		}));

		const newPart = {
			id,
			serviceId: state.service.id,
			serviceName: getLocalizedString(state.service.name, getLocale()),
			date: dateDisplay,
			from: slot.from,
			to: slot.to,
			timeText,
			isMultiDay: state.isMultiDay && (!!state.endDate || slot.isMultiDay),
			reservationMethod: state.selectedMethod,
			providerId: state.selectedProvider?.id,
			blocks,
		};

		const newParts = [...state.parts, newPart];
		store.setKey("parts", newParts);
		cartParts.set(newParts);

		this.resetDateSelection();
		store.setKey("currentStep", 1);
		if (state.service.reservationMethods?.length > 1) {
			store.setKey("selectedMethod", null);
		}
	},

	removePart(id) {
		const filteredParts = store.get().parts.filter((p) => p.id !== id);
		store.setKey("parts", filteredParts);
		cartParts.set(filteredParts);
	},

	// Phone validation helper
	validatePhoneNumber(phone) {
		if (!phone) return false;
		const cleaned = phone.replace(/\D/g, "");
		return cleaned.length >= 8 && cleaned.length <= 15;
	},

	// Phone verification
	async updateProfilePhone() {
		store.setKey("phoneError", null);
		store.setKey("phoneSuccess", null);
		store.setKey("isSendingCode", true);

		try {
			const phoneNumber = store.get().phoneNumber;

			// Validate phone number format
			if (!this.validatePhoneNumber(phoneNumber)) {
				store.setKey("phoneError", "Please enter a valid phone number");
				return false;
			}

			const token = await this.getGuestToken();
			const res = await reservationApi.updateProfilePhone({
				token,
				phoneNumber,
			});

			if (res.success) {
				store.setKey("phoneSuccess", "Verification code sent successfully!");
				store.setKey("codeSentAt", Date.now());
			} else {
				store.setKey("phoneError", res.error || "Failed to send verification code");
			}

			return res.success;
		} catch (e) {
			store.setKey("phoneError", e.message);
			return false;
		} finally {
			store.setKey("isSendingCode", false);
		}
	},

	async verifyPhoneCode() {
		store.setKey("verifyError", null);
		store.setKey("isVerifying", true);

		try {
			const { phoneNumber, verificationCode } = store.get();

			// Validate code format
			if (!verificationCode || verificationCode.length !== 4) {
				store.setKey("verifyError", "Please enter a 4-digit verification code");
				return false;
			}

			const token = await this.getGuestToken();
			const res = await reservationApi.verifyPhoneCode({
				token,
				phoneNumber,
				code: verificationCode,
			});

			if (res.success) {
				store.setKey("isPhoneVerified", true);
				store.setKey("phoneSuccess", null); // Clear success message
				store.setKey("verificationCode", ""); // Clear the code
			} else {
				// Provide user-friendly error messages
				let errorMessage = "Invalid verification code";
				if (res.error?.includes("expired")) {
					errorMessage = "Verification code has expired. Please request a new one.";
				} else if (res.error?.includes("incorrect") || res.error?.includes("invalid")) {
					errorMessage = "Incorrect verification code. Please try again.";
				}
				store.setKey("verifyError", errorMessage);
			}

			return res.success;
		} catch (e) {
			store.setKey("verifyError", "Failed to verify code. Please try again.");
			return false;
		} finally {
			store.setKey("isVerifying", false);
		}
	},

	// Checkout
	async checkout() {
		const state = store.get();
		if (state.loading || !state.parts.length) return;

		store.setKey("loading", true);

		try {
			const token = await this.getGuestToken();
			const result = await reservationApi.checkout({
				token,
				businessId: state.businessId,
				parts: state.parts,
			});

			if (result.success) {
				showToast("Reservation created successfully!", "success", 6000);
				const emptyCart = [];
				store.setKey("parts", emptyCart);
				cartParts.set(emptyCart);
			} else {
				throw new Error(result.error);
			}
		} catch (e) {
			console.error(e);
			showToast("Booking failed: " + e.message, "error", 8000);
		} finally {
			store.setKey("loading", false);
		}
	},

	// Helpers
	getLabel(block, locale = getLocale()) {
		if (!block) return "";

		if (block.properties?.label) {
			if (typeof block.properties.label === "object") {
				return (
					block.properties.label[locale] ||
					block.properties.label.en ||
					Object.values(block.properties.label)[0] ||
					""
				);
			}
			if (typeof block.properties.label === "string") {
				return block.properties.label;
			}
		}
		return block.key || "";
	},

	getServicePrice() {
		const state = store.get();
		return getPrice(state.service?.priceOption, getLocale());
	},
};

export function initReservationStore() {
	actions.updateCalendarGrid();

	const savedParts = cartParts.get();
	if (savedParts && savedParts.length > 0) {
		store.setKey("parts", savedParts);
	}

	store.listen((state) => {
		if (
			state.isMultiDay &&
			state.startDate &&
			state.endDate &&
			currentStepName.get() === "datetime" &&
			(!state.slots.length || !state.slots[0].isMultiDay)
		) {
			actions.createMultiDaySlot();
		}

		if (JSON.stringify(state.parts) !== JSON.stringify(cartParts.get())) {
			cartParts.set(state.parts);
		}
	});

	cartParts.listen((parts) => {
		const currentParts = store.get().parts;
		if (JSON.stringify(parts) !== JSON.stringify(currentParts)) {
			store.setKey("parts", parts);
		}
	});
}

export default { store, actions, initReservationStore };
