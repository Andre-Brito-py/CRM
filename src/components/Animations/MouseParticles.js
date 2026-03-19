import React, { useEffect, useRef } from 'react';

const MouseParticles = ({ color = 'rgba(129, 140, 248, 0.7)' }) => { // Premium Lilac (Indigo 400ish)
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -1000, y: -1000, lastMoveTs: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;

    let width = window.innerWidth;
    let height = window.innerHeight;

    const particles = [];
    const particleCount = 180; // Denser for better visibility
    const maxDistance = 250;
    const maxDistanceSq = maxDistance * maxDistance;
    const stoppedThresholdMs = 100;

    class Particle {
      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.baseX = this.x;
        this.baseY = this.y;
        this.size = Math.random() * 2.5 + 1.5; // Slightly larger
        this.speedX = (Math.random() - 0.5) * 0.3;
        this.speedY = (Math.random() - 0.5) * 0.3;
        this.density = (Math.random() * 40) + 10;
      }

      update(isMouseMoving) {
        // Only react if mouse is moving
        if (isMouseMoving) {
          const dx = mouseRef.current.x - this.x;
          const dy = mouseRef.current.y - this.y;
          const distanceSq = (dx * dx) + (dy * dy);

          if (distanceSq > 0 && distanceSq < maxDistanceSq) {
            const distance = Math.sqrt(distanceSq);
            const invDistance = 1 / distance;
            const force = (maxDistance - distance) / maxDistance;
            const forceDirectionX = dx * invDistance;
            const forceDirectionY = dy * invDistance;

            this.x += forceDirectionX * force * this.density * 0.6;
            this.y += forceDirectionY * force * this.density * 0.6;
          } else this.returnToBase();
        } else {
          // Slow drift when mouse is still
          this.x += this.speedX;
          this.y += this.speedY;
          this.returnToBase();
        }

        // Screen wrap
        if (this.x > width) this.x = 0;
        else if (this.x < 0) this.x = width;
        if (this.y > height) this.y = 0;
        else if (this.y < 0) this.y = height;
      }

      returnToBase() {
        if (this.x !== this.baseX) {
          let dxBase = this.x - this.baseX;
          this.x -= dxBase / 50;
        }
        if (this.y !== this.baseY) {
          let dyBase = this.y - this.baseY;
          this.y -= dyBase / 50;
        }
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const init = () => {
      particles.length = 0;
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    };

    const animate = (now) => {
      const isMouseMoving = (now - (mouseRef.current.lastMoveTs || 0)) < stoppedThresholdMs;

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = color;
      ctx.shadowBlur = 15;
      ctx.shadowColor = color;

      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        p.update(isMouseMoving);
        p.draw();
      }

      ctx.shadowBlur = 0;
      animationFrameId = requestAnimationFrame(animate);
    };

    const handlePointerMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.lastMoveTs = performance.now();
    };

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      init();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && !animationFrameId) {
        animationFrameId = requestAnimationFrame(animate);
        return;
      }
      if (document.hidden && animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    };

    canvas.width = width;
    canvas.height = height;
    init();
    animationFrameId = requestAnimationFrame(animate);

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [color]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 mix-blend-multiply opacity-80"
    />
  );
};

export default MouseParticles;
