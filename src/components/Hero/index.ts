import { animations } from "../../lib/animation";

function initWorkAnimations() {
	const { gsap, ScrollTrigger, SplitText } = animations();

	// Split text by characters but keep words together
	const heroTitle = new SplitText(".hero-title", { 
		type: "words,chars",
		wordsClass: "split-word"
	});
	
	const heroSubtitle = new SplitText(".hero-subtitle", { 
		type: "words,chars",
		wordsClass: "split-word" 
	});

	// Set initial states
	gsap.set([".hero-title", ".hero-subtitle"], { opacity: 1 });
	gsap.set(heroTitle.chars, { opacity: 0, y: 20 });
	gsap.set(heroSubtitle.chars, { opacity: 0, y: 15 });

	const initTl = gsap.timeline({ delay: 0.3 });

	// Animate title characters with stagger
	initTl.to(heroTitle.chars, {
		opacity: 1,
		y: 0,
		duration: 0.05,
		stagger: {
			each: 0.03,
			from: "start"
		},
		ease: "power2.out"
	});

	// Animate subtitle characters
	initTl.to(heroSubtitle.chars, {
		opacity: 1,
		y: 0,
		duration: 0.04,
		stagger: {
			each: 0.02,
			from: "start"
		},
		ease: "power2.out"
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
