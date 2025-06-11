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
			trigger: ".slide1",
			scrub: 1,
			start: "top center",
			markers: true,
		},
	});

	discover_tl.to(".slide1", {
		y: 220,
	});

	discover_tl.to(".slide2", {
		y: 220,
	});

	discover_tl.to(".slide3", {
		y: 220,
	});

	discover_tl.to(".slide4", {
		y: 220,
	});
}

document.addEventListener("DOMContentLoaded", initWorkAnimations);
document.addEventListener("astro:after-swap", initWorkAnimations);
