import { animations } from "../../../lib/animation.js";

function initWorkAnimations() {
	const { gsap, ScrollTrigger } = animations();

	// Vertical scroll animation
	const section_1 = document.getElementById("vertical");
	const col_left = document.querySelector(".col_left");
	const timeln = gsap.timeline({ paused: true });

	timeln.fromTo(
		col_left,
		{ y: 0 },
		{ y: section_1?.scrollHeight - col_left.offsetHeight, duration: 1, ease: "none" },
		0,
	);

	const scroll_1 = ScrollTrigger.create({
		animation: timeln,
		trigger: section_1,
		start: "top top",
		end: "bottom center",
		scrub: true,
	});

	// Horizontal scroll animation with falling last card
	const section_2 = document.getElementById("horizontal");
	let box_items = gsap.utils.toArray(".horizontal__item");
	const horizontalTimeline = gsap.timeline({ paused: true });

	// Horizontal slide animation
	horizontalTimeline.to(
		box_items,
		{
			xPercent: -100 * (box_items.length - 1),
			duration: 1,
			ease: "none",
		},
		0,
	);

	// Last card falls and we go into it
	const lastCard = box_items[box_items.length - 1]; // 5th card

	// First: last card falls slightly
	horizontalTimeline.to(
		lastCard,
		{
			y: "20vh",
			rotation: -5,
			duration: 0.2,
			ease: "power2.out",
		},
		1,
	);

	// Then: zoom into the last card massively to reveal hidden section
	horizontalTimeline.to(
		lastCard,
		{
			scale: 10,
			zIndex: 10,
			duration: 0.5,
			ease: "power2.in",
		},
		1.2,
	);

	// Reveal the hidden colorful section
	const hiddenSection = lastCard.querySelector(".hidden-section");
	horizontalTimeline.to(
		hiddenSection,
		{
			opacity: 1,
			duration: 0.3,
			ease: "power2.out",
		},
		1.3,
	);

	ScrollTrigger.create({
		animation: horizontalTimeline,
		trigger: section_2,
		pin: true,
		scrub: 3,
		start: "top top",
		end: "+=" + (section_2.offsetWidth + window.innerHeight),
	});
}

document.addEventListener("DOMContentLoaded", initWorkAnimations);
document.addEventListener("astro:after-swap", initWorkAnimations);