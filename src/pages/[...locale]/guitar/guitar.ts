import { animations } from "../../../lib/animation.js";

function initWorkAnimations() {
	const { gsap, ScrollTrigger } = animations();

	gsap.fromTo(
		"#title",
		{
			scale: 5.2,
			y: -180,
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

	image_tl.from(
		".the-best",
		{
			opacity: 0,
			scale: 0.8,
			y: 50,
			scrollTrigger: {
				trigger: "#image-section",
				start: "top top",
				end: "bottom top",
				scrub: 2,
			},
		},
		0,
	);

	// About section - PowerPoint style story flow
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
		duration: 2,
		ease: "power2.out",
	});

	// Step 2: Show first paragraph
	aboutTl.to(".reveal-text:nth-child(1)", {
		opacity: 1,
		y: 0,
		duration: 2,
		ease: "power2.out",
	}, "+=1");

	// Step 3: Show second paragraph
	aboutTl.to(".reveal-text:nth-child(2)", {
		opacity: 1,
		y: 0,
		duration: 2,
		ease: "power2.out",
	}, "+=1");

	// Step 4: Show third paragraph
	aboutTl.to(".reveal-text:nth-child(3)", {
		opacity: 1,
		y: 0,
		duration: 2,
		ease: "power2.out",
	}, "+=1");

	// Step 5: Show stats one by one
	aboutTl.to(".stat-item:nth-child(1)", {
		opacity: 1,
		scale: 1,
		duration: 1.5,
		ease: "power2.out",
	}, "+=1");

	aboutTl.to(".stat-item:nth-child(2)", {
		opacity: 1,
		scale: 1,
		duration: 1.5,
		ease: "power2.out",
	}, "+=0.5");

	aboutTl.to(".stat-item:nth-child(3)", {
		opacity: 1,
		scale: 1,
		duration: 1.5,
		ease: "power2.out",
	}, "+=0.5");

	// Counter animation
	const counters = document.querySelectorAll(".stat-number");
	counters.forEach((counter) => {
		const target = parseInt(counter.getAttribute("data-count"));
		gsap.to(counter, {
			textContent: target,
			duration: 2,
			ease: "power2.out",
			snap: { textContent: 1 },
			scrollTrigger: {
				trigger: counter,
				start: "top 80%",
			},
		});
	});

	// Services section - PowerPoint style with smooth reveals
	const servicesTl = gsap.timeline({
		scrollTrigger: {
			trigger: ".services-section",
			start: "top top",
			end: "+=400%",
			pin: true,
			scrub: 1,
		},
	});

	// Step 1: Show services title
	servicesTl.to(".services-section .section-title", {
		opacity: 1,
		y: 0,
		duration: 2,
		ease: "power2.out",
	});

	// Step 2-5: Show each service card one by one
	servicesTl.to(".service-card:nth-child(1)", {
		opacity: 1,
		y: 0,
		duration: 2,
		ease: "power2.out",
	}, "+=1");

	servicesTl.to(".service-card:nth-child(2)", {
		opacity: 1,
		y: 0,
		duration: 2,
		ease: "power2.out",
	}, "+=1");

	servicesTl.to(".service-card:nth-child(3)", {
		opacity: 1,
		y: 0,
		duration: 2,
		ease: "power2.out",
	}, "+=1");

	servicesTl.to(".service-card:nth-child(4)", {
		opacity: 1,
		y: 0,
		duration: 2,
		ease: "power2.out",
	}, "+=1");

	// Simple CTA animation
	gsap.to(".cta-title, .cta-text, .cta-button", {
		opacity: 1,
		y: 0,
		duration: 1,
		stagger: 0.3,
		ease: "power2.out",
		scrollTrigger: {
			trigger: ".cta-section",
			start: "top 80%",
		},
	});
}

document.addEventListener("DOMContentLoaded", initWorkAnimations);
document.addEventListener("astro:after-swap", initWorkAnimations);
