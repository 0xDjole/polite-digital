import { animations } from "../../../lib/animation.js";

// Logo data from GTA VI
const logoData = "M486.348 213C484.148 213 482.848 211.9 482.448 209.7L439.848 6.89999L439.548 5.69999C439.548 3.89999 440.648 2.99999 442.848 2.99999H489.348C491.748 2.99999 493.048 4.09999 493.248 6.3L510.348 126C510.548 126.8 510.848 127.2 511.248 127.2C511.848 127 512.148 126.6 512.148 126L528.048 6.3C528.248 4.09999 529.548 2.99999 531.948 2.99999H577.248C579.848 2.99999 580.848 4.29999 580.248 6.89999L537.348 209.7C536.948 211.9 535.648 213 533.448 213H486.348Z";

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

	// Set up overlay styles exactly like GTA VI
	const overlay = document.querySelector(".overlay") as HTMLElement;
	if (overlay) {
		overlay.style.width = "100vw";
		overlay.style.height = "100vh";
		overlay.style.position = "fixed";
		overlay.style.top = "0";
		overlay.style.left = "0";
		overlay.style.transform = "none";
	}

	// Get all elements
	const heroImgContainer = document.querySelector(".hero-img-container");
	const heroImgLogo = document.querySelector(".hero-img-logo");
	const heroImgCopy = document.querySelector(".hero-img-copy");
	const fadeOverlay = document.querySelector(".fade-overlay");
	const svgOverlay = document.querySelector(".overlay");
	const overlayCopy = document.querySelector(".overlay-copy h1");

	const initialOverlayScale = 500;
	const logoContainer = document.querySelector(".logo-container");
	const logoMask = document.getElementById("logoMask");

	// Set logo data
	if (logoMask) {
		logoMask.setAttribute("d", logoData);
	}

	function updateLogoMask() {
		if (!logoContainer || !logoMask) return;
		
		const logoDimensions = logoContainer.getBoundingClientRect();
		const logoBoundingBox = logoMask.getBBox();

		const horizontalScaleRatio = logoDimensions.width / logoBoundingBox.width;
		const verticalScaleRatio = logoDimensions.height / logoBoundingBox.height;
		const logoScaleFactor = Math.min(horizontalScaleRatio, verticalScaleRatio);

		const logoHorizontalPosition =
			logoDimensions.left +
			(logoDimensions.width - logoBoundingBox.width * logoScaleFactor) / 2 -
			logoBoundingBox.x * logoScaleFactor;
		const logoVerticalPosition =
			logoDimensions.top +
			(logoDimensions.height - logoBoundingBox.height * logoScaleFactor) / 2 -
			logoBoundingBox.y * logoScaleFactor;

		logoMask.setAttribute(
			"transform",
			`translate(${logoHorizontalPosition}, ${logoVerticalPosition}) scale(${logoScaleFactor})`
		);
	}

	updateLogoMask();

	// Set initial overlay scale
	if (svgOverlay) {
		gsap.set(svgOverlay, {
			transformOrigin: "50% 50%",
			xPercent: 0,
			yPercent: 0,
			left: 0,
			top: 0,
			scale: initialOverlayScale,
		});
	}

	let scrollTriggerInstance: any;

	function setupScrollTrigger() {
		if (scrollTriggerInstance) {
			scrollTriggerInstance.kill();
		}

		scrollTriggerInstance = ScrollTrigger.create({
			trigger: ".hero",
			start: "top top",
			end: `+=${window.innerHeight * 5}px`,
			pin: true,
			pinSpacing: true,
			scrub: 1,
			onUpdate: (self) => {
				const scrollProgress = self.progress;
				const fadeOpacity = 1 - scrollProgress * (1 / 0.15);

				// Fade out logo and copy text
				if (scrollProgress <= 0.15) {
					if (heroImgLogo && heroImgCopy) {
						gsap.set([heroImgLogo, heroImgCopy], {
							opacity: fadeOpacity,
						});
					}
				} else {
					if (heroImgLogo && heroImgCopy) {
						gsap.set([heroImgLogo, heroImgCopy], {
							opacity: 0,
						});
					}
				}

				// Scale hero image and overlay
				if (scrollProgress <= 0.85) {
					const normalizedProgress = scrollProgress * (1 / 0.85);
					const heroImgContainerScale = 1.5 - 0.5 * normalizedProgress;
					const overlayScale =
						initialOverlayScale *
						Math.pow(1 / initialOverlayScale, normalizedProgress);
					let fadeOverlayOpacity = 0;

					if (heroImgContainer) {
						gsap.set(heroImgContainer, {
							scale: heroImgContainerScale,
						});
					}

					if (svgOverlay) {
						gsap.set(svgOverlay, {
							transformOrigin: "50% 25%",
							scale: overlayScale,
							force3D: true,
						});
					}

					// Show white fade overlay
					if (scrollProgress >= 0.25) {
						fadeOverlayOpacity = Math.min(
							1,
							(scrollProgress - 0.25) * (1 / 0.4)
						);
					}

					if (fadeOverlay) {
						gsap.set(fadeOverlay, {
							opacity: fadeOverlayOpacity,
						});
					}
				}

				// Reveal overlay copy text
				if (scrollProgress >= 0.7 && scrollProgress <= 0.85) {
					const overlayCopyRevealProgress = (scrollProgress - 0.7) * (1 / 0.15);

					const gradientSpread = 100;
					const gradientBottomPosition = 240 - overlayCopyRevealProgress * 280;
					const gradientTopPosition = gradientBottomPosition - gradientSpread;
					const overlayCopyScale = 1.25 - 0.25 * overlayCopyRevealProgress;

					if (overlayCopy) {
						overlayCopy.style.background = `linear-gradient(to bottom, #0a0a0a 0%, #0a0a0a ${gradientTopPosition}%, #d4a574 ${gradientBottomPosition}%, #d4a574 100%)`;
						overlayCopy.style.backgroundClip = "text";

						const parentElement = overlayCopy.parentElement;
						if (parentElement) {
							gsap.set(parentElement, {
								scale: overlayCopyScale,
								opacity: overlayCopyRevealProgress,
							});
						}
					}
				} else if (scrollProgress < 0.7) {
					const overlayCopyElement = document.querySelector(".overlay-copy");
					if (overlayCopyElement) {
						gsap.set(overlayCopyElement, {
							opacity: 0,
						});
					}
				}
			},
		});
	}

	setupScrollTrigger();

	// Orken World sticky section
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
			updateLogoMask();
			ScrollTrigger.refresh();
			setupScrollTrigger();
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