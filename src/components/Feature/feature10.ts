import { animations } from "../../lib/animation";

function initInteractiveShowcase() {
	const { gsap, ScrollTrigger } = animations();

	// Get all cards and panels
	const cards = document.querySelectorAll('.showcase-card');
	const panels = document.querySelectorAll('.content-panel');

	// Initialize - set first card as active
	if (cards.length > 0) {
		cards[0].classList.add('active');
	}

	// Card click interactions
	cards.forEach((card) => {
		card.addEventListener('click', () => {
			const cardType = card.getAttribute('data-card');
			
			// Remove active from all cards and panels
			cards.forEach(c => c.classList.remove('active'));
			panels.forEach(p => p.classList.remove('active'));
			
			// Add active to clicked card
			card.classList.add('active');
			
			// Find and activate corresponding panel
			const targetPanel = document.querySelector(`[data-panel="${cardType}"]`);
			if (targetPanel) {
				targetPanel.classList.add('active');
			}
		});
	});

	// Clean pinned scroll animation
	ScrollTrigger.create({
		trigger: ".showcase-section",
		start: "top top",
		end: "+=100vh",
		pin: true,
		scrub: 1,
		onUpdate: (self) => {
			const progress = self.progress;

			// Cards move up
			gsap.set('.showcase-card', {
				y: progress * -80,
			});

			// Title scales
			gsap.set('.main-title', {
				scale: 1 + (progress * 0.2),
			});

			// Orbs move
			gsap.set('.orb-1', {
				x: progress * -100,
				y: progress * -50,
			});

			gsap.set('.orb-2', {
				x: progress * 80,
				y: progress * 40,
			});
		}
	});

	// Handle reduced motion
	const handleReducedMotion = () => {
		const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		
		if (prefersReducedMotion) {
			ScrollTrigger.getAll().forEach(st => st.disable());
		}
	};

	handleReducedMotion();
	window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', handleReducedMotion);
}

document.addEventListener("DOMContentLoaded", initInteractiveShowcase);
document.addEventListener("astro:after-swap", initInteractiveShowcase);