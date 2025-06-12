import { animations } from "../../../lib/animation.js";

function initWorkAnimations() {
	const { gsap, ScrollTrigger, SplitText } = animations();

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

	// Split text animation for "Expert Guitar Restoration"
	const splitText = new SplitText(".the-best", { type: "chars" });

	gsap.set(splitText.chars, { opacity: 0, y: 100 });

	image_tl.to(
		splitText.chars,
		{
			opacity: 1,
			y: 0,
			duration: 0.8,
			stagger: 0.05,
			ease: "back.out(1.7)",
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
	aboutTl.to(
		".reveal-text:nth-child(1)",
		{
			opacity: 1,
			y: 0,
			duration: 2,
			ease: "power2.out",
		},
		"+=1",
	);

	// Step 3: Show second paragraph
	aboutTl.to(
		".reveal-text:nth-child(2)",
		{
			opacity: 1,
			y: 0,
			duration: 2,
			ease: "power2.out",
		},
		"+=1",
	);

	// Step 4: Show third paragraph
	aboutTl.to(
		".reveal-text:nth-child(3)",
		{
			opacity: 1,
			y: 0,
			duration: 2,
			ease: "power2.out",
		},
		"+=1",
	);

	// Step 5: Show stats one by one
	aboutTl.to(
		".stat-item:nth-child(1)",
		{
			opacity: 1,
			scale: 1,
			duration: 1.5,
			ease: "power2.out",
		},
		"+=1",
	);

	aboutTl.to(
		".stat-item:nth-child(2)",
		{
			opacity: 1,
			scale: 1,
			duration: 1.5,
			ease: "power2.out",
		},
		"+=0.5",
	);

	aboutTl.to(
		".stat-item:nth-child(3)",
		{
			opacity: 1,
			scale: 1,
			duration: 1.5,
			ease: "power2.out",
		},
		"+=0.5",
	);

	// Slow, cinematic counter animation
	const counters = document.querySelectorAll(".stat-number");
	counters.forEach((counter) => {
		const target = parseInt(counter.getAttribute("data-count"));
		gsap.to(counter, {
			textContent: target,
			duration: 3,
			ease: "power2.out",
			snap: { textContent: 1 },
			delay: 0.5,
		});
	});

	// Services section - Simple horizontal scroll
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
		duration: 1,
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

	const gridWrapper = gsap.utils.toArray(".grid-items");
	gridWrapper.forEach((wrapper, gridIndex) => {
		const boxes = wrapper.querySelectorAll(".box");

		boxes.forEach((box, index) => {
			const y = gridIndex % 2 ? 500 - index * 100 : 500 + index * 100;

			gsap.from(box, {
				y,
				duration: 0.5,
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

document.addEventListener("DOMContentLoaded", initWorkAnimations);
document.addEventListener("astro:after-swap", initWorkAnimations);
