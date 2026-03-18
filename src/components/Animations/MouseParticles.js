import React, { useEffect, useRef, useState } from 'react';

const MouseParticles = ({ color = 'rgba(129, 140, 248, 0.7)' }) => { // Premium Lilac (Indigo 400ish)
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -1000, y: -1000, lastX: -1000, lastY: -1000, moving: false });
  const timeoutRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = window.innerWidth;
    let height = window.innerHeight;

    const particles = [];
    const particleCount = 180; // Denser for better visibility

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

      update() {
        // Only react if mouse is moving
        if (mouseRef.current.moving) {
          let dx = mouseRef.current.x - this.x;
          let dy = mouseRef.current.y - this.y;
          let distance = Math.sqrt(dx * dx + dy * dy);
          
          let maxDistance = 250; 
          if (distance < maxDistance) {
            let force = (maxDistance - distance) / maxDistance;
            let forceDirectionX = dx / distance;
            let forceDirectionY = dy / distance;
            
            this.x += forceDirectionX * force * this.density * 0.6;
            this.y += forceDirectionY * force * this.density * 0.6;
          } else {
            this.returnToBase();
          }
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
        ctx.fillStyle = color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // Reset for performance
      }
    }

    const init = () => {
      particles.length = 0;
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.moving = true;

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        mouseRef.current.moving = false;
      }, 100); // Threshold for "stopped"
    };

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      init();
    };

    canvas.width = width;
    canvas.height = height;
    init();
    animate();

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
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
