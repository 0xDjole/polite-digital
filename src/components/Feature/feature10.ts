import { animations } from "../../lib/animation";

function init() {
	const { gsap, ScrollTrigger, SplitText } = animations();

	const featureTitle = document.querySelector(".feature-title");
	const featureContent = document.querySelector(".feature-content");
	const featureBtn1 = document.querySelector(".feature-btn-1");
	const featureBtn2 = document.querySelector(".feature-btn-2");
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
			scale: 0.9
		});
		
		// Animate in and then scale up during scrub
		tl.to(featureTitle, {
			y: 0,
			opacity: 1,
			scale: 1,
			ease: "none",
		}, 0)
		.to(featureTitle, {
			scale: 1.05,
			y: -10,
			ease: "none",
		}, 0.3);
	}

	// Simple content animation without splitting
	if (featureContent) {
		// Initial state
		gsap.set(featureContent, {
			y: 30,
			opacity: 0
		});
		
		// Animate in and then move during scrub
		tl.to(featureContent, {
			y: 0,
			opacity: 1,
			ease: "none",
		}, 0.1)
		.to(featureContent, {
			y: -10,
			ease: "none",
		}, 0.4);
	}

	// Animated buttons
	if (featureBtn1 && featureBtn2) {
		// Initial state
		gsap.set([featureBtn1, featureBtn2], {
			y: 40,
			opacity: 0,
			scale: 0.8
		});
		
		// Animate in and then scale during scrub
		tl.to([featureBtn1, featureBtn2], {
			y: 0,
			opacity: 1,
			scale: 1,
			stagger: 0.1,
			ease: "none",
		}, 0.2)
		.to([featureBtn1, featureBtn2], {
			scale: 1.05,
			y: -5,
			stagger: 0.1,
			ease: "none",
		}, 0.5);

		// Add magnetic hover effect
		[featureBtn1, featureBtn2].forEach((btn) => {
			btn.addEventListener("mouseenter", () => {
				gsap.to(btn, {
					scale: 1.1,
					duration: 0.3,
					ease: "power2.out",
				});
			});

			btn.addEventListener("mouseleave", () => {
				gsap.to(btn, {
					scale: 1.05,
					duration: 0.3,
					ease: "power2.out",
				});
			});

			btn.addEventListener("mousemove", (e) => {
				const rect = btn.getBoundingClientRect();
				const x = e.clientX - rect.left - rect.width / 2;
				const y = e.clientY - rect.top - rect.height / 2;
				
				gsap.to(btn, {
					x: x * 0.1,
					y: y * 0.1,
					duration: 0.3,
					ease: "power2.out",
				});
			});

			btn.addEventListener("mouseleave", () => {
				gsap.to(btn, {
					x: 0,
					y: 0,
					duration: 0.5,
					ease: "elastic.out(1, 0.3)",
				});
			});
		});
	}

	// Enhanced image animation
	if (aboutImage) {
		// Initial state
		gsap.set(aboutImage, {
			x: -100,
			opacity: 0,
			scale: 0.8
		});
		
		// Animate in and then transform during scrub
		tl.to(aboutImage, {
			x: 0,
			opacity: 1,
			scale: 1,
			ease: "none",
		}, 0)
		.to(aboutImage, {
			scale: 1.1,
			rotation: 2,
			ease: "none",
		}, 0.3);
	}
}

document.addEventListener("DOMContentLoaded", init);
document.addEventListener("astro:after-swap", init);