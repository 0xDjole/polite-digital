// Enhanced animation initialization with Lenis + GSAP integration
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

let lenis = null;
let isLenisEnabled = false;

// Initialize Lenis if available
async function initLenis(options = {}) {
  try {
    // Dynamic import to avoid loading Lenis everywhere
    const { default: Lenis } = await import('lenis');
    
    const defaultOptions = {
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      direction: 'vertical',
      gestureDirection: 'vertical',
      smooth: true,
      mouseMultiplier: 1,
      smoothTouch: false,
      touchMultiplier: 2,
      infinite: false,
      ...options
    };

    lenis = new Lenis(defaultOptions);
    isLenisEnabled = true;

    // RAF loop for Lenis
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Integrate with GSAP ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);

    return lenis;
  } catch (error) {
    console.warn('Lenis not available, falling back to native scroll:', error);
    return null;
  }
}

// Basic GSAP initialization (existing functionality)
export function initBasicGSAP() {
  // Ensure page is visible first
  gsap.set('body', { opacity: 1 });
  gsap.set('*', { opacity: 1 }); // Emergency fallback
  
  // Only init basic animations if Lenis is not enabled
  if (!isLenisEnabled) {
    initBasicScrollAnimations();
  }
}

// Basic scroll animations
function initBasicScrollAnimations() {
  // Standard fade-in on scroll
  gsap.utils.toArray('.gsap-fade-up').forEach((element) => {
    const delay = parseFloat(element.getAttribute('data-delay')) || 0;
    
    gsap.fromTo(element, 
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        delay: delay,
        scrollTrigger: {
          trigger: element,
          start: "top 80%",
          once: true
        }
      }
    );
  });

  // Stagger animations for groups
  gsap.utils.toArray('.gsap-stagger').forEach(container => {
    const items = container.querySelectorAll('.gsap-stagger-item');
    
    gsap.fromTo(items,
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.15,
        scrollTrigger: {
          trigger: container,
          start: "top 80%",
          once: true
        }
      }
    );
  });
}

// Enhanced initialization with Lenis support
export async function initEnhancedAnimations(lenisOptions = {}) {
  // Initialize Lenis first
  const lenisInstance = await initLenis(lenisOptions);
  
  // Then run basic GSAP setup
  initBasicGSAP();
  
  return {
    lenis: lenisInstance,
    gsap,
    ScrollTrigger
  };
}

// Utility to check if Lenis is available
export function isLenisActive() {
  return isLenisEnabled && lenis !== null;
}

// Get current Lenis instance
export function getLenis() {
  return lenis;
}

// Clean up function
export function destroyAnimations() {
  if (lenis) {
    lenis.destroy();
    lenis = null;
    isLenisEnabled = false;
  }
  ScrollTrigger.killAll();
}

// Legacy export for backward compatibility
export function initGlobalGSAP() {
  initBasicGSAP();
}

export { gsap, ScrollTrigger };