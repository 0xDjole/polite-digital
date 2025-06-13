import { animations } from "../../lib/animation";

function init() {
	const { gsap, ScrollTrigger } = animations();

	const cards = gsap.utils.toArray(".pricing-plan");

	cards.forEach((card, i) => {
		gsap.from(card, {
			y: 100 * i + 1,
			scrollTrigger: {
				trigger: card,
				start: "top bottom",
				end: "top center",
				scrub: true,
			},
		});
	});
}

document.addEventListener("DOMContentLoaded", init);
document.addEventListener("astro:after-swap", init);
