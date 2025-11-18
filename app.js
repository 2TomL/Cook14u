// Three.js animated background with logo and smoke
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';

let scene, camera, renderer, clock;
let logoMesh, smokeParticles = [];
let lineMaterial, lineMesh;
let mouse = new THREE.Vector2(0.5, 0.5);
let targetMouse = new THREE.Vector2(0.5, 0.5);
let scrollY = 0;
let targetScrollY = 0;

const lineUniforms = {
  t: { value: 0.0 },
  r: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
  mouse: { value: new THREE.Vector2(0.5, 0.5) }
};

function init() {
  clock = new THREE.Clock();
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 5000);
  camera.position.z = 1000;

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x000000, 1);
  
  const canvas = renderer.domElement;
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '1';
  document.body.insertBefore(canvas, document.body.firstChild);

  // Animated lines background
  const lineGeometry = new THREE.PlaneGeometry(2, 2);
  lineMaterial = new THREE.ShaderMaterial({
    uniforms: lineUniforms,
    transparent: true,
    depthTest: false,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.999, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec2 r;
      uniform float t;
      uniform vec2 mouse;
      varying vec2 vUv;

      float wave(vec2 p, float phase, float freq) {
        return sin(p.y * freq + phase) * 0.3 * sin(p.x * freq * 0.5 + phase * 0.7);
      }

      float glowLine(float dist, float thickness, float intensity) {
        return intensity * thickness / (abs(dist) + thickness * 0.5);
      }

      void main() {
        vec2 uv = (vUv - 0.5) * 2.0;
        uv.x *= r.x / r.y;

        vec3 col = vec3(0.0);
        float time = t * 0.6;
        float waveNoise = sin(uv.y * 2.0 + time * 0.2) * 0.1;

        // Rechter lijnen
        float y1 = uv.x - 1.2 - wave(uv, time * 1.5, 2.0) + waveNoise;
        float line1 = glowLine(y1, 0.02, 0.6);

        float y2 = uv.x - 0.8 - wave(uv + vec2(1.0, 0.5), time * 1.2, 2.5) + waveNoise * 0.8;
        float line2 = glowLine(y2, 0.02, 0.6);

        float y3 = uv.x - 1.6 - wave(uv + vec2(-0.5, 1.0), time * 1.8, 1.8) + waveNoise * 1.2;
        float line3 = glowLine(y3, 0.02, 0.6);

        // Linker lijnen
        float y4 = -uv.x - 1.2 - wave(uv, time * 1.5, 2.0) + waveNoise;
        float line4 = glowLine(y4, 0.02, 0.6);

        float y5 = -uv.x - 0.8 - wave(uv + vec2(1.0, 0.5), time * 1.2, 2.5) + waveNoise * 0.8;
        float line5 = glowLine(y5, 0.02, 0.6);

        float y6 = -uv.x - 1.6 - wave(uv + vec2(-0.5, 1.0), time * 1.8, 1.8) + waveNoise * 1.2;
        float line6 = glowLine(y6, 0.02, 0.6);

        vec3 seahawksBlue = vec3(0.0, 0.22, 0.42);

        col += seahawksBlue * line1;
        col += seahawksBlue * line2 * 0.8;
        col += seahawksBlue * line3 * 0.6;
        col += seahawksBlue * line4;
        col += seahawksBlue * line5 * 0.8;
        col += seahawksBlue * line6 * 0.6;

        gl_FragColor = vec4(col, 1.0);
      }
    `
  });

  lineMesh = new THREE.Mesh(lineGeometry, lineMaterial);
  lineMesh.position.z = -100;
  scene.add(lineMesh);

  // Lighting
  const light = new THREE.DirectionalLight(0xffffff, 1.2);
  light.position.set(-1, 1, 1);
  scene.add(light);

  const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
  scene.add(ambientLight);

  // Smoke particles around center
  const smokeTexture = new THREE.TextureLoader().load("https://s3-us-west-2.amazonaws.com/s.cdpn.io/95637/Smoke-Element.png");
  const smokeMaterial = new THREE.MeshLambertMaterial({
    color: 0x2d5016,
    map: smokeTexture,
    transparent: true,
    opacity: 1.0 // Start with full opacity
  });
  const smokeGeo = new THREE.PlaneGeometry(400, 400);

  // Create smoke in circular pattern around logo
  for (let p = 0; p < 80; p++) {
    const particle = new THREE.Mesh(smokeGeo, smokeMaterial.clone());
    
    // Random angle and distance from center
    const angle = Math.random() * Math.PI * 2;
    const distance = 200 + Math.random() * 400;
    
    particle.position.set(
      Math.cos(angle) * distance,
      Math.sin(angle) * distance,
      200 + Math.random() * 100
    );
    particle.rotation.z = Math.random() * 360;
    particle.userData = {
      angle: angle,
      baseDistance: distance,
      speed: 0.1 + Math.random() * 0.2,
      rotationSpeed: (Math.random() - 0.5) * 0.3,
      targetOpacity: 0.4 // Target opacity to fade to
    };
    scene.add(particle);
    smokeParticles.push(particle);
  }

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('resize', onWindowResize);
  window.addEventListener('scroll', onScroll);
}

function onMouseMove(event) {
  targetMouse.x = event.clientX / window.innerWidth;
  targetMouse.y = 1.0 - (event.clientY / window.innerHeight);
}

function onScroll() {
  targetScrollY = window.scrollY;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  lineUniforms.r.value.set(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // Smooth scroll interpolation
  scrollY += (targetScrollY - scrollY) * 0.1;

  // Update line shader
  lineUniforms.t.value = elapsed;
  mouse.lerp(targetMouse, 0.05);
  lineUniforms.mouse.value.copy(mouse);

  // Animate smoke particles in circular motion
  smokeParticles.forEach(sp => {
    // Rotate around center
    sp.userData.angle += sp.userData.speed * delta;
    
    // Pulsating distance
    const distanceOffset = Math.sin(elapsed * 0.5 + sp.userData.angle * 2) * 50;
    const currentDistance = sp.userData.baseDistance + distanceOffset;
    
    sp.position.x = Math.cos(sp.userData.angle) * currentDistance;
    sp.position.y = Math.sin(sp.userData.angle) * currentDistance + (scrollY * 0.3);
    
    // Rotate particle itself
    sp.rotation.z += sp.userData.rotationSpeed * delta;
    
    // Subtle depth movement with scroll influence
    sp.position.z = 200 + Math.sin(elapsed * 0.3 + sp.userData.angle) * 50 + (scrollY * 0.1);
    
    // Fade from full opacity to target opacity over 3 seconds
    if (elapsed < 3) {
      const fadeProgress = elapsed / 3;
      sp.material.opacity = 1.0 - (fadeProgress * (1.0 - sp.userData.targetOpacity));
    } else {
      sp.material.opacity = sp.userData.targetOpacity;
    }
  });

  renderer.render(scene, camera);
}

init();
animate();

// Content options interaction
document.addEventListener('DOMContentLoaded', function() {
  const options = document.querySelectorAll('.option');
  const platformLinks = document.querySelectorAll('.platform-link');
  
  options.forEach((option, index) => {
    option.addEventListener('click', function() {
      options.forEach(opt => opt.classList.remove('active'));
      platformLinks.forEach(link => link.classList.remove('active'));
      this.classList.add('active');
      if (platformLinks[index]) {
        platformLinks[index].classList.add('active');
      }
    });
  });
  
  // Hamburger menu toggle
  const hamburger = document.getElementById('hamburger-menu');
  const nav = document.querySelector('nav');
  
  if (hamburger) {
    hamburger.addEventListener('click', function() {
      this.classList.toggle('is-active');
      nav.classList.toggle('active');
    });
    
    // Close menu when clicking on a link
    document.querySelectorAll('nav a').forEach(link => {
      link.addEventListener('click', function() {
        hamburger.classList.remove('is-active');
        nav.classList.remove('active');
      });
    });
  }
  
  // Video and Instagram navigation
  document.querySelectorAll('.video-nav').forEach(button => {
    button.addEventListener('click', function(e) {
      e.stopPropagation();
      const platform = this.getAttribute('data-platform');
      if (!platform) return;
      
      const container = this.closest('.content-embed');
      let items, currentIndex, newIndex;
      
      if (platform === 'youtube') {
        items = container.querySelectorAll('.video-frame');
      } else if (platform === 'instagram') {
        items = container.querySelectorAll('.insta-photo');
      }
      
      if (!items || items.length === 0) return;
      
      currentIndex = Array.from(items).findIndex(f => f.classList.contains('active'));
      
      if (this.classList.contains('prev-video')) {
        newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
      } else {
        newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
      }
      
      items[currentIndex].classList.remove('active');
      items[newIndex].classList.add('active');
    });
  });
  
  // Navigation dots for mobile
  document.querySelectorAll('.nav-dot').forEach(dot => {
    dot.addEventListener('click', function() {
      const optionIndex = parseInt(this.getAttribute('data-option'));
      const options = document.querySelectorAll('.option');
      const dots = document.querySelectorAll('.nav-dot');
      const platformLinks = document.querySelectorAll('.platform-link');
      
      // Remove active class from all
      options.forEach(opt => opt.classList.remove('active'));
      dots.forEach(d => d.classList.remove('active'));
      platformLinks.forEach(link => link.classList.remove('active'));
      
      // Add active to selected
      options[optionIndex].classList.add('active');
      this.classList.add('active');
      platformLinks[optionIndex].classList.add('active');
    });
  });
});

// Fire effect for skull eyes and nose
const fireCanvas = document.getElementById('fireCanvas');
if (fireCanvas) {
  const ctx = fireCanvas.getContext('2d');
  const container = fireCanvas.parentElement;
  
  function resizeCanvas() {
    fireCanvas.width = container.offsetWidth;
    fireCanvas.height = container.offsetHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const particles = [];
  const particleCount = 100;

  class FireParticle {
    constructor() {
      this.reset();
    }

    reset() {
      // Random position in eyes or nose area (relative to canvas size)
      const area = Math.random();
      if (area < 0.4) { // Left eye
        this.x = fireCanvas.width * (0.30 + Math.random() * 0.12);
        this.y = fireCanvas.height * (0.43 + Math.random() * 0.15);
      } else if (area < 0.8) { // Right eye
        this.x = fireCanvas.width * (0.55 + Math.random() * 0.12);
        this.y = fireCanvas.height * (0.43 + Math.random() * 0.15);
      } else { // Nose
        this.x = fireCanvas.width * (0.42 + Math.random() * 0.13);
        this.y = fireCanvas.height * (0.63 + Math.random() * 0.1);
      }

      this.baseY = this.y;
      this.vy = -0.2 - Math.random() * 0.6;
      this.vx = (Math.random() - 0.5) * 0.2;
      this.life = 1;
      this.decay = 0.005 + Math.random() * 0.01;
      this.size = 3 + Math.random() * 4;
    }

    update() {
      this.y += this.vy;
      this.x += this.vx;
      this.life -= this.decay;
      
      // Reset if particle goes too far up (stays within skull area)
      if (this.life <= 0 || this.y < this.baseY - 40) {
        this.reset();
      }
    }

    draw() {
      const alpha = this.life;
      const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
      
      // Fire colors: yellow to orange to red
      if (this.life > 0.6) {
        gradient.addColorStop(0, `rgba(255, 255, 100, ${alpha})`);
        gradient.addColorStop(0.5, `rgba(255, 150, 0, ${alpha * 0.8})`);
        gradient.addColorStop(1, `rgba(255, 100, 0, ${alpha * 0.3})`);
      } else {
        gradient.addColorStop(0, `rgba(255, 150, 0, ${alpha})`);
        gradient.addColorStop(0.5, `rgba(255, 80, 0, ${alpha * 0.8})`);
        gradient.addColorStop(1, `rgba(200, 0, 0, ${alpha * 0.3})`);
      }

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (let i = 0; i < particleCount; i++) {
    particles.push(new FireParticle());
  }

  function animateFire() {
    ctx.clearRect(0, 0, fireCanvas.width, fireCanvas.height);
    
    particles.forEach(particle => {
      particle.update();
      particle.draw();
    });

    requestAnimationFrame(animateFire);
  }

  animateFire();
}
