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

  // Pin and animate like work page
  const colLeft = document.querySelector('.left-column');
  const timeline = gsap.timeline({ paused: true });

  timeline.fromTo(
    colLeft,
    { y: 0 },
    { y: section?.scrollHeight - colLeft?.offsetHeight, duration: 1, ease: "none" }
  );

  ScrollTrigger.create({
    animation: timeline,
    trigger: section,
    start: "top center",
    end: "bottom center",
    scrub: true,
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
          element.style.color = '#8B5CF6';
        },
        onEnterBack: () => {
          // Reset all elements in this item
          allElements.forEach(el => el.style.color = '');
          // Highlight only current line
          element.style.color = '#8B5CF6';
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