class ParticleSystem {
    constructor(options = {}) {
        this.options = {
            particleCount: 50, // Increased for more small particles
            particleColor: '#FFFF00', // Yellow color for small dots
            particleSize: { min: 3, max: 8 }, // Bigger size for better visibility
            trailLength: 25,
            trailOpacity: 0.8,
            particleSpeed: 0.4, // Slightly faster movement
            connectionDistance: 120, // Closer connections
            connectionOpacity: 0.3, // More visible connections
            ...options
        };
        
        this.particles = [];
        this.mouse = { x: 0, y: 0 };
        this.mouseTrail = [];
        this.animationId = null;
        this.canvas = null;
        this.ctx = null;
        
        this.init();
    }

    init() {
        try {
            this.createCanvas();
            this.createParticles();
            this.bindEvents();
            this.animate();
            
            console.log('Particle system initialized successfully');
        } catch (error) {
            console.error('Error initializing particle system:', error);
        }
    }

    createCanvas() {
        // Create full-screen canvas
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas to full screen
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '1';
        
        // Add to body
        document.body.appendChild(this.canvas);
        
        // Set canvas size
        this.resizeCanvas();
    }

    createParticles() {
        // Create particle objects
        for (let i = 0; i < this.options.particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * this.options.particleSpeed,
                vy: (Math.random() - 0.5) * this.options.particleSpeed,
                size: Math.random() * (this.options.particleSize.max - this.options.particleSize.min) + this.options.particleSize.min,
                opacity: Math.random() * 0.6 + 0.4 // Higher opacity for better visibility
            });
        }
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    bindEvents() {
        // Track mouse movement
        document.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Update mouse trail
        this.mouseTrail.unshift({ x: this.mouse.x, y: this.mouse.y });
        if (this.mouseTrail.length > this.options.trailLength) {
            this.mouseTrail.pop();
        }
        
        // Draw particles (foreground)
        this.particles.forEach((particle, index) => {
            // Update position
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Bounce off edges
            if (particle.x < 0 || particle.x > this.canvas.width) particle.vx *= -1;
            if (particle.y < 0 || particle.y > this.canvas.height) particle.vy *= -1;
            
            // Keep particles in bounds
            particle.x = Math.max(0, Math.min(this.canvas.width, particle.x));
            particle.y = Math.max(0, Math.min(this.canvas.height, particle.y));
            
            // Draw particle
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fillStyle = this.options.particleColor;
            this.ctx.globalAlpha = particle.opacity;
            this.ctx.fill();
        });
        
        // Draw connections between nearby particles
        this.particles.forEach((particle, index) => {
            this.particles.forEach((otherParticle, otherIndex) => {
                if (index === otherIndex) return;
                
                const distance = Math.sqrt(
                    Math.pow(particle.x - otherParticle.x, 2) + 
                    Math.pow(particle.y - otherParticle.y, 2)
                );
                
                if (distance < this.options.connectionDistance) {
                    const opacity = (1 - distance / this.options.connectionDistance) * this.options.connectionOpacity;
                    this.ctx.beginPath();
                    this.ctx.moveTo(particle.x, particle.y);
                    this.ctx.lineTo(otherParticle.x, otherParticle.y);
                    this.ctx.strokeStyle = this.options.particleColor;
                    this.ctx.globalAlpha = opacity;
                    this.ctx.lineWidth = 1;
                    this.ctx.stroke();
                }
            });
        });
        
        // Draw mouse trail connections to particles (Hybrid Xperience style)
        if (this.mouseTrail.length > 0) {
            this.particles.forEach((particle) => {
                const distance = Math.sqrt(
                    Math.pow(particle.x - this.mouse.x, 2) + 
                    Math.pow(particle.y - this.mouse.y, 2)
                );
                
                if (distance < this.options.connectionDistance * 1.5) {
                    const opacity = (1 - distance / (this.options.connectionDistance * 1.5)) * 0.6;
                    this.ctx.beginPath();
                    this.ctx.moveTo(particle.x, particle.y);
                    this.ctx.lineTo(this.mouse.x, this.mouse.y);
                    this.ctx.strokeStyle = this.options.particleColor;
                    this.ctx.globalAlpha = opacity;
                    this.ctx.lineWidth = 2;
                    this.ctx.stroke();
                }
            });
        }
        
        // Reset global alpha
        this.ctx.globalAlpha = 1;
        
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    // Method to update colors
    updateColors(particleColor) {
        this.options.particleColor = particleColor;
    }

    // Method to destroy particles
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }
}

export default ParticleSystem;
