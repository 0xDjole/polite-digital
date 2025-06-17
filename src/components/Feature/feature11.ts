import lottie from 'lottie-web';
import gearAnimationData from '@assets/videos/gear.json';
import { animations } from '../../lib/animation';

function init() {
  const { gsap, ScrollTrigger } = animations();
  
  const section = document.querySelector('.workflow-section');
  const gearContainer = document.getElementById('gear-lottie');
  
  if (!gearContainer || !section) return;

  // Load gear animation
  const gearAnimation = lottie.loadAnimation({
    container: gearContainer,
    renderer: 'svg',
    loop: false,
    autoplay: false,
    animationData: gearAnimationData,
  });

  // Rotate gear based on scroll progress
  ScrollTrigger.create({
    trigger: section,
    start: 'top bottom',
    end: 'bottom top',
    scrub: 1,
    onUpdate: (self) => {
      const frame = self.progress * (gearAnimation.totalFrames - 1);
      gearAnimation.goToAndStop(frame, true);
    },
  });
}

document.addEventListener('DOMContentLoaded', init);
document.addEventListener('astro:after-swap', init);