import { animations } from "../../lib/animation";

function init() {
	const { gsap, ScrollTrigger, SplitText } = animations();

	const featureTitle = document.querySelector(".feature-title");
	const featureContent = document.querySelector(".feature-content");
	const aboutImage = document.querySelector(".about-image");
	const zigzagImage = document.querySelector(".zigzag-image");

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

	// Triangle particles reveal effect
	const particleImage = document.querySelector(".particle-image");

	if (aboutImage && particleImage) {
		// Initial states
		gsap.set(aboutImage, { x: -100, opacity: 0, scale: 0.8 });
		gsap.set(particleImage, {
			filter: "blur(6px) brightness(0.3)",
			maskImage: "conic-gradient(from 0deg at 50% 50%, black 0deg, black 120deg, transparent 120deg, transparent 240deg, black 240deg, black 360deg)",
			maskSize: "8px 8px",
			maskRepeat: "repeat",
			WebkitMaskImage: "conic-gradient(from 0deg at 50% 50%, black 0deg, black 120deg, transparent 120deg, transparent 240deg, black 240deg, black 360deg)",
			WebkitMaskSize: "8px 8px",
			WebkitMaskRepeat: "repeat",
		});

		// Slow triangle assembly
		tl.to(aboutImage, { x: 0, opacity: 1, scale: 1, ease: "none", duration: 1 }, 0)
		  .to(particleImage, { 
			  filter: "blur(3px) brightness(0.6)",
			  maskSize: "12px 12px",
			  WebkitMaskSize: "12px 12px",
			  ease: "none",
			  duration: 1
		  }, 0.3)
		  .to(particleImage, { 
			  filter: "blur(1px) brightness(0.9)",
			  maskSize: "16px 16px",
			  WebkitMaskSize: "16px 16px",
			  ease: "none",
			  duration: 1
		  }, 1.0)
		  .to(particleImage, { 
			  filter: "blur(0px) brightness(1)",
			  maskImage: "none",
			  WebkitMaskImage: "none",
			  ease: "none",
			  duration: 0.5
		  }, 1.8)
		  .to(aboutImage, { scale: 1.1, rotation: 2, ease: "none" }, 2.0);
	}
}

document.addEventListener("DOMContentLoaded", init);
document.addEventListener("astro:after-swap", init);
