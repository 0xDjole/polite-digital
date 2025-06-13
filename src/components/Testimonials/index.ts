import { animations } from "../../lib/animation";

function init() {
	const { gsap, ScrollTrigger, SplitText } = animations();

	const track = document.querySelector(".testimonial-track");

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
}

document.addEventListener("DOMContentLoaded", init);
document.addEventListener("astro:after-swap", init);
