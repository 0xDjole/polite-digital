import lottie from "lottie-web";
import moneyAnimationData from "@assets/videos/money.json";
import { animations } from "../../lib/animation";

function init() {
	const { gsap, ScrollTrigger } = animations();

	const container = document.getElementById("money-lottie");
	const moneyContent = document.querySelector(".money-content");
	const featureTitle = document.querySelector("#money-saving .feature-title");
	const featureContent = document.querySelector("#money-saving .feature-content");
	const featureButtons = document.querySelector("#money-saving .feature-buttons");

	if (!container) return;

	const animation = lottie.loadAnimation({
		container: container,
		renderer: "svg",
		loop: false,
		autoplay: false,
		animationData: moneyAnimationData,
	});

	// Create pinned timeline with scrubbing
	const tl = gsap.timeline({
		scrollTrigger: {
			trigger: "#money-saving",
			start: "top top",
			end: "+=200%",
			scrub: 1,
			pin: true,
			onUpdate: (self) => {
				const frame = self.progress * (animation.totalFrames - 1);
				animation.goToAndStop(frame, true);
			},
		},
	});

	// Animate title
	if (featureTitle) {
		gsap.set(featureTitle, {
			y: 60,
			opacity: 0,
			scale: 0.9,
		});

		tl.to(
			featureTitle,
			{
				y: 0,
				opacity: 1,
				scale: 1,
				ease: "none",
			},
			0,
		).to(
			featureTitle,
			{
				scale: 1.05,
				y: -10,
				ease: "none",
			},
			0.3,
		);
	}

	// Animate content
	if (featureContent) {
		gsap.set(featureContent, {
			y: 30,
			opacity: 0,
		});

		tl.to(
			featureContent,
			{
				y: 0,
				opacity: 1,
				ease: "none",
			},
			0.1,
		).to(
			featureContent,
			{
				y: -10,
				ease: "none",
			},
			0.4,
		);
	}

	// Animate buttons
	if (featureButtons) {
		gsap.set(featureButtons, {
			y: 20,
			opacity: 0,
		});

		tl.to(
			featureButtons,
			{
				y: 0,
				opacity: 1,
				ease: "none",
			},
			0.2,
		);
	}

	// Lottie container animation
	gsap.set(container, {
		scale: 0.8,
		opacity: 0,
	});

	tl.to(
		container,
		{
			scale: 1,
			opacity: 1,
			ease: "none",
		},
		0,
	).to(
		container,
		{
			scale: 1.1,
			rotation: -5,
			ease: "none",
		},
		0.3,
	);

	// Handle reduced motion
	const handleReducedMotion = () => {
		const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

		if (prefersReducedMotion) {
			animation.goToAndStop(animation.totalFrames - 1, true);
			ScrollTrigger.getAll().forEach((st) => st.disable());
		}
	};

	handleReducedMotion();
	window
		.matchMedia("(prefers-reduced-motion: reduce)")
		.addEventListener("change", handleReducedMotion);
}

document.addEventListener("DOMContentLoaded", init);
document.addEventListener("astro:after-swap", init);
