import { animations } from "../../lib/animation";

function initWorkAnimations() {
	const { gsap, ScrollTrigger, SplitText } = animations();

	// Split text animation for hero title and subtitle (plays on load)
	const titleSplit = new SplitText(".hero-title", { type: "chars" });
	const subtitleSplit = new SplitText(".hero-subtitle", { type: "chars" });

	// Set parent elements back to visible and hide individual chars
	gsap.set([".hero-title", ".hero-subtitle"], { opacity: 1 });
	gsap.set([titleSplit.chars, subtitleSplit.chars], { opacity: 0, y: 100 });

	const initTl = gsap.timeline({ delay: 0.3, scrub: true });

	initTl.to(titleSplit.chars, {
		duration: 0.6,
		y: 0,
		opacity: 1,
		stagger: 0.03,
		ease: "power2.out",
	});

	initTl.to(
		subtitleSplit.chars,
		{
			duration: 0.5,
			y: 0,
			opacity: 1,
			stagger: 0.015,
			ease: "power2.out",
		},
		"-=0.4",
	);

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

	heroTl.fromTo(
		"#hero-img",
		{ scale: 2 },
		{
			scale: 1,
			opacity: 1,
			ease: "power2.out",
		},
	);
}

document.addEventListener("DOMContentLoaded", initWorkAnimations);
document.addEventListener("astro:after-swap", initWorkAnimations);
