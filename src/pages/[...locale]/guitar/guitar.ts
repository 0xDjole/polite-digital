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
			scrub: 1,
			start: "top center",
			end: "bottom+=300 center",
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

	const image_tl = gsap.timeline();

	image_tl.from(".cover", {
		borderRadius: "50%",
		width: "300px",
		height: "300px",
		scrollTrigger: {
			trigger: "#image-section",
			start: "top bottom-=200",
			end: "top center",
			scrub: true,
		},
	});
}

document.addEventListener("DOMContentLoaded", initWorkAnimations);
document.addEventListener("astro:after-swap", initWorkAnimations);
