import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import Lenis from "lenis";

// Register plugins
gsap.registerPlugin(ScrollTrigger);

let lenis;
let isInitialized = false;

export function animations() {
	if (isInitialized) return { gsap, ScrollTrigger, lenis };

	// Init Lenis
	lenis = new Lenis({
		duration: 1.2,
		easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
	});

	function raf(time) {
		lenis.raf(time);
		requestAnimationFrame(raf);
	}
	requestAnimationFrame(raf);

	// Connect to GSAP
	lenis.on("scroll", ScrollTrigger.update);
	gsap.ticker.add((time) => {
		lenis.raf(time * 1000);
	});
	gsap.ticker.lagSmoothing(0);

	// Basic setup
	gsap.set("body", { opacity: 1 });

	// Basic fade animations
	gsap.utils.toArray(".gsap-fade-up").forEach((element) => {
		gsap.fromTo(
			element,
			{ opacity: 0, y: 30 },
			{
				opacity: 1,
				y: 0,
				duration: 0.8,
				scrollTrigger: {
					trigger: element,
					start: "top 80%",
					once: true,
				},
			},
		);
	});

	isInitialized = true;
	return { gsap, ScrollTrigger, lenis };
}
