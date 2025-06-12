import { animations } from "../../../lib/animation.js";

function initWorkAnimations() {
	const { gsap, ScrollTrigger, SplitText } = animations();
	
	// Check for reduced motion preference
	const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	if (prefersReducedMotion) {
		return;
	}
	
	// Cinematic easing system
	const cinematicEase = "power2.out";
	const smoothEase = "power1.inOut";
	
	gsap.defaults({ ease: cinematicEase });

	// Screen size detection
	const isSmallScreen = window.innerWidth < 768;
	const isVerySmall = window.innerWidth < 480;

	// ===== HERO TITLE - MAXIMIZE TRANSFORMATION =====
	if (!isVerySmall) {
		gsap.fromTo("#title", {
			scale: isSmallScreen ? 3 : 5,
			y: isSmallScreen ? -100 : -200,
			opacity: 0.2
		}, {
			y: 0,
			scale: 1,
			opacity: 1,
			duration: isSmallScreen ? 1 : 1.5,
			ease: cinematicEase,
			scrollTrigger: {
				trigger: "#title",
				start: "top 90%",
				end: isSmallScreen ? "bottom 50%" : "bottom top",
				scrub: 1,
			},
		});
	}

	// ===== DISCOVER SECTION - LAYERED STORY =====
	if (isSmallScreen) {
		gsap.fromTo(".slide h1", {
			opacity: 0, 
			y: 50,
			scale: 0.9
		}, {
			opacity: 1, 
			y: 0,
			scale: 1,
			duration: 1,
			stagger: 0.2,
			ease: cinematicEase,
			scrollTrigger: {
				trigger: ".discover",
				start: "top 80%"
			}
		});
	} else {
		const discoverTl = gsap.timeline({
			scrollTrigger: {
				trigger: ".discover",
				start: "top top",
				end: "bottom top",
				scrub: 1,
				pin: true,
			},
		});

		discoverTl
			.to(".slide1", {
				y: 150,
				rotation: -2,
				scale: 1.05,
			})
			.to(".slide2", {
				y: 180,
				rotation: 1,
				scale: 1.1,
			}, "-=0.5")
			.to(".slide3", {
				y: 220,
				rotation: -1,
				scale: 1.15,
			}, "-=0.5")
			.to(".slide4", {
				y: 280,
				rotation: 3,
				scale: 1.2,
			}, "-=0.5");
	}

	// ===== HERO IMAGE - CLEAN CIRCLE REVEAL =====
	if (isSmallScreen) {
		gsap.fromTo(".the-best", {
			opacity: 0, 
			y: 30
		}, {
			opacity: 1, 
			y: 0,
			duration: 1.2,
			ease: cinematicEase,
			scrollTrigger: {
				trigger: "#image-section",
				start: "top 70%"
			}
		});
	} else {
		const imageTl = gsap.timeline({
			scrollTrigger: {
				trigger: "#image-section",
				start: "top top",
				end: "bottom top",
				scrub: 1,
				pin: true,
			},
		});

		// Clean circle reveal
		imageTl.fromTo(".cover", {
			clipPath: "circle(20% at 50% 50%)",
		}, {
			clipPath: "circle(100% at 50% 50%)",
			duration: 1,
			ease: smoothEase
		});

		// Text reveal with split characters
		const splitText = new SplitText(".the-best", { type: "chars" });
		gsap.set(splitText.chars, { 
			opacity: 0, 
			y: 50
		});

		imageTl.to(splitText.chars, {
			opacity: 1,
			y: 0,
			duration: 1,
			stagger: 0.02,
			ease: cinematicEase,
		}, 0.3);
	}

	// ===== ABOUT SECTION - HERITAGE STORY =====
	if (isSmallScreen) {
		gsap.fromTo(".about-section .section-title", {
			opacity: 0, 
			y: 40
		}, {
			opacity: 1, 
			y: 0,
			duration: 1,
			ease: cinematicEase,
			scrollTrigger: { trigger: ".about-section", start: "top 80%" }
		});
		
		gsap.fromTo(".reveal-text", {
			opacity: 0, 
			y: 20
		}, {
			opacity: 1, 
			y: 0,
			duration: 0.8,
			stagger: 0.2,
			ease: cinematicEase,
			scrollTrigger: { trigger: ".text-block", start: "top 80%" }
		});
		
		gsap.fromTo(".stat-item", {
			opacity: 0, 
			scale: 0.8
		}, {
			opacity: 1, 
			scale: 1,
			duration: 0.8,
			stagger: 0.1,
			ease: "back.out(1.7)",
			scrollTrigger: { trigger: ".about-stats", start: "top 80%" }
		});

		// Counter animation
		const counters = document.querySelectorAll(".stat-number");
		counters.forEach((counter, index) => {
			const target = parseInt(counter.getAttribute("data-count"));
			gsap.to(counter, {
				textContent: target,
				duration: 1.5,
				ease: smoothEase,
				snap: { textContent: 1 },
				delay: index * 0.2,
				scrollTrigger: {
					trigger: counter,
					start: "top 80%"
				}
			});
		});
	} else {
		const aboutTl = gsap.timeline({
			scrollTrigger: {
				trigger: ".about-section",
				start: "top top",
				end: "+=300%",
				pin: true,
				scrub: 1,
			},
		});

		aboutTl
			.to(".about-section .section-title", {
				opacity: 1,
				y: 0,
				duration: 0.5,
			})
			.to(".reveal-text", {
				opacity: 1,
				y: 0,
				duration: 1,
				stagger: 0.1,
			}, "+=0.3")
			.to(".stat-item", {
				opacity: 1,
				scale: 1,
				duration: 0.8,
				stagger: 0.1,
				ease: "back.out(1.7)",
			}, "+=0.2");

		// Counter animation
		const counters = document.querySelectorAll(".stat-number");
		counters.forEach((counter, index) => {
			const target = parseInt(counter.getAttribute("data-count"));
			gsap.to(counter, {
				textContent: target,
				duration: 2,
				ease: smoothEase,
				snap: { textContent: 1 },
				delay: index * 0.1,
			});
		});
	}

	// ===== SERVICES - COMPLETE HORIZONTAL SLIDE =====
	if (isSmallScreen) {
		gsap.fromTo(".services-section .section-title", {
			opacity: 0, 
			y: 40
		}, {
			opacity: 1, 
			y: 0,
			duration: 1,
			ease: cinematicEase,
			scrollTrigger: { trigger: ".services-section", start: "top 80%" }
		});
		
		gsap.fromTo(".service-card", {
			opacity: 0, 
			x: 50
		}, {
			opacity: 1, 
			x: 0,
			duration: 0.8,
			stagger: 0.2,
			ease: cinematicEase,
			scrollTrigger: { trigger: ".services-grid", start: "top 80%" }
		});
	} else {
		const servicesTl = gsap.timeline({
			scrollTrigger: {
				trigger: ".services-section",
				start: "top top",
				end: "+=400%",
				pin: true,
				scrub: 1,
			},
		});

		servicesTl
			.to(".services-section .section-title", {
				opacity: 1,
				y: 0,
				duration: 0.3,
			})
			.to(".services-grid", {
				x: "-300vw", // Slide completely across
				duration: 8,
				ease: "none",
			}, "+=0.5");

		// Activate cards as they come into view
		[1, 2, 3, 4].forEach((cardNum, index) => {
			servicesTl.to(`.service-card:nth-child(${cardNum})`, {
				onStart: () => {
					const card = document.querySelector(`.service-card:nth-child(${cardNum})`);
					card?.classList.add("active");
				},
			}, `${1.5 + index * 1.5}`);
		});
	}

	// ===== FLYING IMAGES - SLOWER CINEMATIC MOVEMENT =====
	const flyingImages = gsap.utils.toArray(".flying-image");
	
	flyingImages.forEach((image, index) => {
		const delay = parseInt(image.getAttribute("data-delay")) || 0;
		
		gsap.set(image, {
			y: "150vh",
			opacity: 0,
			scale: 0.8
		});
		
		const flyUpTl = gsap.timeline({
			scrollTrigger: {
				trigger: "#flying-images",
				start: "top bottom",
				end: "bottom top",
				scrub: 0.2, // Much slower
			}
		});
		
		flyUpTl
			.to(image, {
				opacity: 1,
				scale: 1,
				duration: 0.2,
				ease: cinematicEase,
				delay: delay * 0.1
			})
			.to(image, {
				y: "-150vh",
				duration: 1,
				ease: "none"
			}, delay * 0.1)
			.to(image, {
				opacity: 0,
				scale: 0.9,
				duration: 0.1,
			}, "-=0.1");
		
		// Subtle horizontal drift on desktop
		if (!isSmallScreen) {
			gsap.to(image, {
				x: gsap.utils.random(-20, 20),
				duration: gsap.utils.random(8, 15),
				ease: smoothEase,
				yoyo: true,
				repeat: -1,
				delay: delay * 0.5
			});
		}
	});

	// ===== CTA SECTION =====
	gsap.fromTo([".cta-title", ".cta-text", ".cta-button"], {
		opacity: 0,
		y: 40
	}, {
		opacity: 1,
		y: 0,
		duration: 1,
		stagger: 0.2,
		ease: cinematicEase,
		scrollTrigger: {
			trigger: ".cta-section",
			start: "top 80%",
		},
	});

	// Gallery text
	gsap.fromTo(".flying-text", {
		opacity: 0, 
		y: -40
	}, {
		opacity: 1, 
		y: 0,
		duration: 1.5,
		ease: cinematicEase,
		scrollTrigger: {
			trigger: "#flying-images",
			start: "top 90%"
		}
	});

	// Enhanced scroll refresh
	let resizeTimer;
	window.addEventListener('resize', () => {
		clearTimeout(resizeTimer);
		resizeTimer = setTimeout(() => {
			ScrollTrigger.refresh();
		}, 150);
	});
}

document.addEventListener("DOMContentLoaded", initWorkAnimations);
document.addEventListener("astro:after-swap", initWorkAnimations);