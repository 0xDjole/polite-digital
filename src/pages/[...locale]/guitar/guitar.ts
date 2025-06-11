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
			markers: true,
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
}

document.addEventListener("DOMContentLoaded", initWorkAnimations);
document.addEventListener("astro:after-swap", initWorkAnimations);
