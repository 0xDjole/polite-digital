import { animations } from "../../../lib/animation.js";

function initWorkAnimations() {
	const { gsap, ScrollTrigger, SplitText } = animations();
	
	// Check for reduced motion preference and mobile
	const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const isMobile = window.innerWidth < 768;
	
	if (prefersReducedMotion) {
		return; // Skip all animations
	}
	
	// Set default easing for all animations
	gsap.defaults({ ease: "cubic-bezier(0.4, 0.0, 0.2, 1)" });

	// Simplified title animation for mobile
	if (!isMobile) {
		gsap.fromTo(
			"#title",
			{
				scale: 3,
				y: -100,
			},
			{
				y: 0,
				scale: 1,
				scrollTrigger: {
					trigger: "#title",
					end: "bottom top-30",
					scrub: true,
				},
			},
		);
	}

	// Simplified discover animation for mobile
	if (isMobile) {
		// Simple fade-in animation for mobile
		gsap.fromTo(".slide h1", 
			{ opacity: 0, y: 50 },
			{ 
				opacity: 1, 
				y: 0, 
				duration: 0.8,
				stagger: 0.2,
				scrollTrigger: {
					trigger: ".discover",
					start: "top 80%"
				}
			}
		);
	} else {
		// Full desktop animation
		const discover_tl = gsap.timeline({
			scrollTrigger: {
				trigger: ".discover",
				scrub: 1.5,
				start: "top top",
				end: "bottom top",
				pin: true,
			},
		});

		discover_tl.to(".slide1", {
			y: 150,
			rotation: -2,
		});

		discover_tl.to(
			".slide2",
			{
				y: 180,
				rotation: 1,
			},
			"-=0.5",
		);

		discover_tl.to(
			".slide3",
			{
				y: 220,
				rotation: -1,
			},
			"-=0.5",
		);

		discover_tl.to(
			".slide4",
			{
				y: 280,
				rotation: 3,
				scale: 1.1,
			},
			"-=0.5",
		);
	}

	// Image section animations
	if (isMobile) {
		// Simple mobile version
		gsap.fromTo(".the-best", 
			{ opacity: 0, y: 30 },
			{ 
				opacity: 1, 
				y: 0, 
				duration: 1,
				scrollTrigger: {
					trigger: "#image-section",
					start: "top 60%"
				}
			}
		);
	} else {
		// Full desktop animation
		const image_tl = gsap.timeline();

		image_tl.from(".cover", {
			clipPath: "circle(20% at 50% 50%)",
			scrollTrigger: {
				trigger: "#image-section",
				start: "top top",
				end: "bottom top",
				scrub: 2,
				pin: true,
			},
		});

		// Split text animation for "Expert Guitar Restoration"
		const splitText = new SplitText(".the-best", { type: "chars" });

		gsap.set(splitText.chars, { opacity: 0, y: 100 });

		image_tl.to(
			splitText.chars,
			{
				opacity: 1,
				y: 0,
				duration: 0.6,
				stagger: 0.05,
				ease: "power2.out",
				scrollTrigger: {
					trigger: "#image-section",
					start: "top top",
					end: "bottom top",
					scrub: 2,
				},
			},
			0,
		);
	}

	// About section animations
	if (isMobile) {
		// Simple mobile animations
		gsap.fromTo(".about-section .section-title", 
			{ opacity: 0, y: 30 },
			{ opacity: 1, y: 0, duration: 0.8, scrollTrigger: { trigger: ".about-section", start: "top 80%" } }
		);
		
		gsap.fromTo(".reveal-text", 
			{ opacity: 0, y: 20 },
			{ opacity: 1, y: 0, duration: 0.6, stagger: 0.2, scrollTrigger: { trigger: ".text-block", start: "top 80%" } }
		);
		
		gsap.fromTo(".stat-item", 
			{ opacity: 0, scale: 0.8 },
			{ opacity: 1, scale: 1, duration: 0.6, stagger: 0.1, scrollTrigger: { trigger: ".about-stats", start: "top 80%" } }
		);
	} else {
		// Full desktop animation
		const aboutTl = gsap.timeline({
			scrollTrigger: {
				trigger: ".about-section",
				start: "top top",
				end: "+=300%",
				pin: true,
				scrub: 1,
			},
		});

	// Step 1: Show title
	aboutTl.to(".about-section .section-title", {
		opacity: 1,
		y: 0,
		duration: 0.6,
		ease: "power2.out",
	});

	// Step 2-4: Show paragraphs with stagger
	aboutTl.to(
		".reveal-text",
		{
			opacity: 1,
			y: 0,
			duration: 0.5,
			stagger: 0.1,
			ease: "power2.out",
		},
		"+=0.3",
	);

	// Step 5: Show stats with stagger
	aboutTl.to(
		".stat-item",
		{
			opacity: 1,
			scale: 1,
			duration: 0.4,
			stagger: 0.1,
			ease: "power2.out",
		},
		"+=0.3",
	);

		// Counter animation
		const counters = document.querySelectorAll(".stat-number");
		counters.forEach((counter, index) => {
			const target = parseInt(counter.getAttribute("data-count"));
			gsap.to(counter, {
				textContent: target,
				duration: 0.6,
				ease: "power2.out",
				snap: { textContent: 1 },
				delay: index * 0.1,
			});
		});
	}

	// Services section
	if (isMobile) {
		// Simple mobile services animation
		gsap.fromTo(".services-section .section-title", 
			{ opacity: 0, y: 30 },
			{ opacity: 1, y: 0, duration: 0.8, scrollTrigger: { trigger: ".services-section", start: "top 80%" } }
		);
		
		gsap.fromTo(".service-card", 
			{ opacity: 0, x: 50 },
			{ opacity: 1, x: 0, duration: 0.8, stagger: 0.2, scrollTrigger: { trigger: ".services-grid", start: "top 80%" } }
		);
	} else {
		// Full desktop animation
		const servicesTl = gsap.timeline({
			scrollTrigger: {
				trigger: ".services-section",
				start: "top top",
				end: "+=400%",
				pin: true,
				scrub: 1,
			},
		});

		servicesTl.to(".services-section .section-title", {
			opacity: 1,
			y: 0,
			duration: 0.4,
		});

		servicesTl.to(
			".services-grid",
			{
				x: "-100vw",
				duration: 8,
				ease: "none",
			},
			"+=0.5",
		);

		servicesTl.to(
			".service-card:nth-child(1)",
			{
				onStart: () => document.querySelector(".service-card:nth-child(1)").classList.add("active"),
			},
			"1",
		);

		servicesTl.to(
			".service-card:nth-child(2)",
			{
				onStart: () => document.querySelector(".service-card:nth-child(2)").classList.add("active"),
			},
			"3",
		);

		servicesTl.to(
			".service-card:nth-child(3)",
			{
				onStart: () => document.querySelector(".service-card:nth-child(3)").classList.add("active"),
			},
			"5",
		);

		servicesTl.to(
			".service-card:nth-child(4)",
			{
				onStart: () => document.querySelector(".service-card:nth-child(4)").classList.add("active"),
			},
			"7",
		);
	}

	// CTA animation (same for both mobile and desktop)
	gsap.to(".cta-title, .cta-text, .cta-button", {
		opacity: 1,
		y: 0,
		duration: 0.6,
		stagger: 0.15,
		ease: "power2.out",
		scrollTrigger: {
			trigger: ".cta-section",
			start: "top 80%",
		},
	});

	// Grid animations
	if (isMobile) {
		// Simple mobile grid animation
		gsap.fromTo(".box", 
			{ opacity: 0, y: 30 },
			{ 
				opacity: 1, 
				y: 0, 
				duration: 0.6,
				stagger: 0.1,
				scrollTrigger: {
					trigger: "#flying-images",
					start: "top 80%"
				}
			}
		);
	} else {
		// Full desktop grid animation
		const gridWrapper = gsap.utils.toArray(".grid-items");
		gridWrapper.forEach((wrapper, gridIndex) => {
			const boxes = wrapper.querySelectorAll(".box");

			boxes.forEach((box, index) => {
				const y = gridIndex % 2 ? 500 - index * 100 : 500 + index * 100;

				gsap.from(box, {
					y,
					duration: 0.4,
					scrollTrigger: {
						trigger: box,
						start: "top bottom",
						end: "top bottom",
						scrub: 2,
					},
				});
			});
		});
	}
}

document.addEventListener("DOMContentLoaded", initWorkAnimations);
document.addEventListener("astro:after-swap", initWorkAnimations);
