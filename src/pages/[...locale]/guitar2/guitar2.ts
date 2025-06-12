import { animations } from "../../../lib/animation.js";

function initGuitar2Animations() {
	const { gsap, ScrollTrigger } = animations();

	// Initialize smooth scrolling with Lenis (if available)
	if (typeof window !== 'undefined' && (window as any).Lenis) {
		const lenis = new (window as any).Lenis();
		lenis.on("scroll", ScrollTrigger.update);
		gsap.ticker.add((time: number) => {
			lenis.raf(time * 1000);
		});
		gsap.ticker.lagSmoothing(0);
	}

	// Guitar services sticky section
	const stickySection = document.querySelector(".sticky");
	const outlineCanvas = document.querySelector(".outline-layer") as HTMLCanvasElement;
	const fillCanvas = document.querySelector(".fill-layer") as HTMLCanvasElement;

	if (stickySection && outlineCanvas && fillCanvas) {
		const outlineCtx = outlineCanvas.getContext("2d")!;
		const fillCtx = fillCanvas.getContext("2d")!;
		const stickyHeight = window.innerHeight * 5;

		function setCanvasSize(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
			const dpr = window.devicePixelRatio || 1;
			canvas.width = window.innerWidth * dpr;
			canvas.height = window.innerHeight * dpr;
			canvas.style.width = `${window.innerWidth}px`;
			canvas.style.height = `${window.innerHeight}px`;
			ctx.scale(dpr, dpr);
		}

		setCanvasSize(outlineCanvas, outlineCtx);
		setCanvasSize(fillCanvas, fillCtx);

		const triangleSize = 150;
		const lineWidth = 1;
		const SCALE_THRESHOLD = 0.01;
		const triangleStates = new Map();
		let animationFrameId: number | null = null;
		let canvasXPosition = 0;

		function drawTriangle(ctx: CanvasRenderingContext2D, x: number, y: number, fillScale = 0, flipped = false) {
			const halfSize = triangleSize / 2;

			if (fillScale < SCALE_THRESHOLD) {
				ctx.beginPath();
				if (!flipped) {
					ctx.moveTo(x, y - halfSize);
					ctx.lineTo(x + halfSize, y + halfSize);
					ctx.lineTo(x - halfSize, y + halfSize);
				} else {
					ctx.moveTo(x, y + halfSize);
					ctx.lineTo(x + halfSize, y - halfSize);
					ctx.lineTo(x - halfSize, y - halfSize);
				}
				ctx.closePath();
				ctx.strokeStyle = "rgba(212, 165, 116, 0.075)";
				ctx.lineWidth = lineWidth;
				ctx.stroke();
			}

			if (fillScale >= SCALE_THRESHOLD) {
				ctx.save();
				ctx.translate(x, y);
				ctx.scale(fillScale, fillScale);
				ctx.translate(-x, -y);

				ctx.beginPath();
				if (!flipped) {
					ctx.moveTo(x, y - halfSize);
					ctx.lineTo(x + halfSize, y + halfSize);
					ctx.lineTo(x - halfSize, y + halfSize);
				} else {
					ctx.moveTo(x, y + halfSize);
					ctx.lineTo(x + halfSize, y - halfSize);
					ctx.lineTo(x - halfSize, y - halfSize);
				}
				ctx.closePath();
				ctx.fillStyle = "#d4a574";
				ctx.strokeStyle = "#d4a574";
				ctx.lineWidth = lineWidth;
				ctx.stroke();
				ctx.fill();
				ctx.restore();
			}
		}

		function drawGrid(scrollProgress = 0) {
			if (animationFrameId) {
				cancelAnimationFrame(animationFrameId);
			}

			outlineCtx.clearRect(0, 0, outlineCanvas.width, outlineCanvas.height);
			fillCtx.clearRect(0, 0, fillCanvas.width, fillCanvas.height);

			const animationProgress =
				scrollProgress <= 0.65 ? 0 : (scrollProgress - 0.65) / 0.35;

			let needsUpdate = false;
			const animationSpeed = 0.15;

			triangleStates.forEach((state: any) => {
				if (state.scale < 1) {
					const x =
						state.col * (triangleSize * 0.5) + triangleSize / 2 + canvasXPosition;
					const y = state.row * triangleSize + triangleSize / 2;
					const flipped = (state.row + state.col) % 2 !== 0;
					drawTriangle(outlineCtx, x, y, 0, flipped);
				}
			});

			triangleStates.forEach((state: any) => {
				const shouldBeVisible = state.order <= animationProgress;
				const targetScale = shouldBeVisible ? 1 : 0;
				const newScale =
					state.scale + (targetScale - state.scale) * animationSpeed;

				if (Math.abs(newScale - state.scale) > 0.001) {
					state.scale = newScale;
					needsUpdate = true;
				}

				if (state.scale >= SCALE_THRESHOLD) {
					const x =
						state.col * (triangleSize * 0.5) + triangleSize / 2 + canvasXPosition;
					const y = state.row * triangleSize + triangleSize / 2;
					const flipped = (state.row + state.col) % 2 !== 0;
					drawTriangle(fillCtx, x, y, state.scale, flipped);
				}
			});

			if (needsUpdate) {
				animationFrameId = requestAnimationFrame(() => drawGrid(scrollProgress));
			}
		}

		function initializeTriangles() {
			const cols = Math.ceil(window.innerWidth / (triangleSize * 0.5));
			const rows = Math.ceil(window.innerHeight / (triangleSize * 0.5));
			const totalTriangles = rows * cols;

			const positions = [];
			for (let r = 0; r < rows; r++) {
				for (let c = 0; c < cols; c++) {
					positions.push({ row: r, col: c, key: `${r}-${c}` });
				}
			}

			for (let i = positions.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[positions[i], positions[j]] = [positions[j], positions[i]];
			}

			positions.forEach((pos, index) => {
				triangleStates.set(pos.key, {
					order: index / totalTriangles,
					scale: 0,
					row: pos.row,
					col: pos.col,
				});
			});
		}

		initializeTriangles();
		drawGrid();

		ScrollTrigger.create({
			trigger: stickySection,
			start: "top top",
			end: `+=${stickyHeight}px`,
			pin: true,
			onUpdate: (self) => {
				canvasXPosition = -self.progress * 200;
				drawGrid(self.progress);

				const cards = document.querySelector(".cards");
				const progress = Math.min(self.progress / 0.654, 1);
				if (cards) {
					gsap.set(cards, {
						x: -progress * window.innerWidth * 2,
					});
				}
			},
		});

		window.addEventListener("resize", () => {
			setCanvasSize(outlineCanvas, outlineCtx);
			setCanvasSize(fillCanvas, fillCtx);
			triangleStates.clear();
			initializeTriangles();
			drawGrid();
			ScrollTrigger.refresh();
		});
	}

	// Add simple intro animations
	gsap.fromTo(".hero-intro h1", {
		opacity: 0,
		y: 50,
	}, {
		opacity: 1,
		y: 0,
		duration: 1.5,
		ease: "power3.out",
		scrollTrigger: {
			trigger: ".hero-intro",
			start: "top 80%",
		}
	});

	gsap.fromTo(".outro h1", {
		opacity: 0,
		y: 50,
	}, {
		opacity: 1,
		y: 0,
		duration: 1.5,
		ease: "power3.out",
		scrollTrigger: {
			trigger: ".outro",
			start: "top 80%",
		}
	});
}

document.addEventListener("DOMContentLoaded", initGuitar2Animations);
document.addEventListener("astro:after-swap", initGuitar2Animations);