import { animations } from "../../lib/animation";

function init() {
	const { gsap, ScrollTrigger, SplitText } = animations();

	const featureTitle = document.querySelector(".feature-title");
	const featureContent = document.querySelector(".feature-content");
	const aboutImage = document.querySelector(".about-image");

	// Single scrubbed pinned timeline
	const tl = gsap.timeline({
		scrollTrigger: {
			trigger: "#about",
			start: "top top",
			end: "+=200%",
			scrub: 1,
			pin: true,
		},
	});

	// Simple title animation without splitting
	if (featureTitle) {
		// Initial state
		gsap.set(featureTitle, {
			y: 60,
			opacity: 0,
			scale: 0.9,
		});

		// Animate in and then scale up during scrub
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

	// Simple content animation without splitting
	if (featureContent) {
		// Initial state
		gsap.set(featureContent, {
			y: 30,
			opacity: 0,
		});

		// Animate in and then move during scrub
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

	// Enhanced image animation
	if (aboutImage) {
		// Initial state
		gsap.set(aboutImage, {
			x: -100,
			opacity: 0,
			scale: 0.8,
		});

		// Animate in and then transform during scrub
		tl.to(
			aboutImage,
			{
				x: 0,
				opacity: 1,
				scale: 1,
				ease: "none",
			},
			0,
		).to(
			aboutImage,
			{
				scale: 1.1,
				rotation: 2,
				ease: "none",
			},
			0.3,
		);
	}
}

document.addEventListener("DOMContentLoaded", init);
document.addEventListener("astro:after-swap", init);
