import { animations } from "../../lib/animation";

function init() {
	const { gsap, ScrollTrigger, SplitText } = animations();

	const track = document.querySelector(".testimonial-track");
	const heartEmoji = document.querySelector(".heart-emoji");
	const joinText = document.querySelector(".join-text");

	const tl = gsap.timeline({
		scrollTrigger: {
			trigger: "#testimonial",
			start: "top top",
			end: "+=400%",
			scrub: 1,
			pin: true,
		},
	});

	tl.to(track, {
		x: () => -track.scrollWidth + track.parentElement.clientWidth / 2 + 150,
		ease: "none",
	});

	// Animate heart and split text at the end
	tl.to(heartEmoji, {
		scale: 1.5,
		duration: 0.5,
		ease: "back.out(1.7)",
	});

	// Split text animation
	const split = new SplitText(joinText, { type: "chars" });
	tl.from(
		split.chars,
		{
			y: 30,
			scale: 1.2,
			opacity: 0,
			duration: 0.5,
			stagger: 0.05,
			ease: "power2.out",
		},
		"-=0.3",
	);
}

document.addEventListener("DOMContentLoaded", init);
document.addEventListener("astro:after-swap", init);
