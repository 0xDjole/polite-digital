// Minimal GSAP setup - industry standard
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initGlobalGSAP() {
  // Ensure page is visible first
  gsap.set('body', { opacity: 1 });
  gsap.set('*', { opacity: 1 }); // Emergency fallback
  
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

export { gsap, ScrollTrigger };