// Small CSS-only confetti burst used to celebrate finishing a workout,
// a Pomodoro session, or a fully-checked To-Do day. No external assets.
const COLORS = ['#F97316', '#2563EB', '#16A34A', '#7C3AED', '#059669', '#EA580C'];
const PARTICLE_COUNT = 16;

export function celebrate() {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  const layer = document.createElement('div');
  layer.className = 'confetti-layer';

  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    const particle = document.createElement('span');
    particle.className = 'confetti-particle';
    const angle = (360 / PARTICLE_COUNT) * i + (Math.random() * 20 - 10);
    const distance = 90 + Math.random() * 60;
    const rad = (angle * Math.PI) / 180;
    particle.style.setProperty('--dx', `${Math.cos(rad) * distance}px`);
    particle.style.setProperty('--dy', `${Math.sin(rad) * distance}px`);
    particle.style.setProperty('--rot', `${Math.random() * 360}deg`);
    particle.style.background = COLORS[i % COLORS.length];
    particle.style.animationDelay = `${Math.random() * 60}ms`;
    layer.appendChild(particle);
  }

  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 1100);
}
