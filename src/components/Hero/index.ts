import { animations } from "../../lib/animation";

function initWorkAnimations() {
	const { gsap, ScrollTrigger, SplitText } = animations();

	// Simple fade-in animation without text splitting
	gsap.set([".hero-title", ".hero-subtitle"], { opacity: 1 });

	const initTl = gsap.timeline({ delay: 0.3 });

	initTl.fromTo(".hero-title", {
		opacity: 0,
		y: 50
	}, {
		duration: 0.8,
		y: 0,
		opacity: 1,
		ease: "power2.out",
	});

	initTl.fromTo(".hero-subtitle", {
		opacity: 0,
		y: 30
	}, {
		duration: 0.6,
		y: 0,
		opacity: 1,
		ease: "power2.out",
	}, "-=0.4");

	initTl.to(
		"#hero-img",
		{
			opacity: 0.5,
			duration: 0.5,
			ease: "power2.out",
		},
		"-=0.5",
	);

	const heroTl = gsap.timeline({
		scrollTrigger: {
			trigger: "#hero",
			start: "top top",
			end: "+=200%",
			scrub: 2,
			pin: true,
		},
	});

	heroTl
		.fromTo(
			"#hero-img",
			{ scale: 2 },
			{
				scale: 1,
				opacity: 1,
				ease: "power2.out",
			},
		)
		.to([".hero-title", ".hero-subtitle"], {
			scale: 0.6,
			opacity: 0.3,
			ease: "power2.out",
		}, 0);
}

document.addEventListener("DOMContentLoaded", initWorkAnimations);
document.addEventListener("astro:after-swap", initWorkAnimations);
