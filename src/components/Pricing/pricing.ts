import { animations } from "../../lib/animation";

function init() {
	const { gsap, ScrollTrigger, SplitText } = animations();

	const pricingSplitText = document.querySelector(".pricing-split-text");
	
	if (pricingSplitText) {
		const split = new SplitText(pricingSplitText, { type: "words" });
		
		gsap.from(split.words, {
			y: 50,
			opacity: 0,
			duration: 0.8,
			stagger: 0.08,
			ease: "power2.out",
			scrollTrigger: {
				trigger: pricingSplitText,
				start: "top 85%",
				end: "bottom 15%",
				toggleActions: "play none none reverse"
			}
		});
	}
}

document.addEventListener("DOMContentLoaded", init);
document.addEventListener("astro:after-swap", init);