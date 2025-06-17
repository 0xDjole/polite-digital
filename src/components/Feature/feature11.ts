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

  // Highlight each line individually - snap effect
  const workflowItems = document.querySelectorAll('.workflow-item');
  
  workflowItems.forEach((item) => {
    const title = item.querySelector('.step-title');
    const description = item.querySelector('.step-description');
    const features = item.querySelectorAll('.step-features li');
    
    // Create array of all elements to highlight
    const allElements = [];
    if (title) allElements.push(title);
    if (description) allElements.push(description);
    features.forEach(feature => allElements.push(feature));
    
    // Create individual triggers for each line
    allElements.forEach((element, index) => {
      ScrollTrigger.create({
        trigger: element,
        start: 'center 60%',
        end: 'center 40%',
        onEnter: () => {
          // Reset all elements in this item
          allElements.forEach(el => el.style.color = '');
          // Highlight only current line
          element.style.color = '#fbbf24';
        },
        onEnterBack: () => {
          // Reset all elements in this item
          allElements.forEach(el => el.style.color = '');
          // Highlight only current line
          element.style.color = '#fbbf24';
        }
      });
    });
    
    // Reset all when leaving the entire item
    ScrollTrigger.create({
      trigger: item,
      start: 'top 80%',
      end: 'bottom 20%',
      onLeave: () => allElements.forEach(el => el.style.color = ''),
      onLeaveBack: () => allElements.forEach(el => el.style.color = '')
    });
  });
}

document.addEventListener('DOMContentLoaded', init);
document.addEventListener('astro:after-swap', init);