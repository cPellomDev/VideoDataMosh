import { useEffect, useRef } from 'preact/hooks';
import * as THREE from 'three';

interface Effects {
  waveIntensity: number;
  waveFrequency: number;
  colorShift: number;
  speed: number;
  glitchAmount: number;
}

interface TrippyVideoCanvasProps {
  videoUrl: string;
  isPlaying: boolean;
  effects: Effects;
}

export function TrippyVideoCanvas({ videoUrl, isPlaying, effects }: TrippyVideoCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    video: HTMLVideoElement | null;
    texture: THREE.VideoTexture | null;
    material: THREE.ShaderMaterial | null;
    renderer: THREE.WebGLRenderer | null;
    animationId: number | null;
  }>({
    video: null,
    texture: null,
    material: null,
    renderer: null,
    animationId: null
  });

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current || !videoUrl) return;

    // Create video element
    const video = document.createElement('video');
    video.src = videoUrl;
    video.crossOrigin = 'anonymous';
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    sceneRef.current.video = video;

    // Three.js setup
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    containerRef.current.appendChild(renderer.domElement);
    sceneRef.current.renderer = renderer;

    // Video texture
    const texture = new THREE.VideoTexture(video);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    sceneRef.current.texture = texture;

    // Shader material
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: texture },
        uTime: { value: 0 },
        uWaveIntensity: { value: effects.waveIntensity },
        uWaveFrequency: { value: effects.waveFrequency },
        uColorShift: { value: effects.colorShift },
        uSpeed: { value: effects.speed },
        uGlitchAmount: { value: effects.glitchAmount }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform float uTime;
        uniform float uWaveIntensity;
        uniform float uWaveFrequency;
        uniform float uColorShift;
        uniform float uSpeed;
        uniform float uGlitchAmount;
        varying vec2 vUv;

        void main() {
          float t = uTime * uSpeed;
          
          // Wave distortion
          float wave = sin(vUv.y * uWaveFrequency + t) * uWaveIntensity;
          
          // Glitch effect
          float glitch = step(1.0 - uGlitchAmount, fract(vUv.y * 10.0 + t)) * 0.1;
          
          // Sample texture with distortion
          vec2 distortedUV = vUv + vec2(wave + glitch, 0.0);
          vec3 color = texture2D(uTexture, distortedUV).rgb;
          
          // Color shift/rotation
          float angle = uColorShift;
          mat3 colorRotation = mat3(
            cos(angle), -sin(angle), 0.0,
            sin(angle), cos(angle), 0.0,
            0.0, 0.0, 1.0
          );
          color = colorRotation * color;
          
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });
    sceneRef.current.material = material;

    // Create mesh
    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !sceneRef.current.renderer) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      sceneRef.current.renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Animation loop
    let lastTime = 0;
    const animate = (time: number) => {
      if (!sceneRef.current.material || !sceneRef.current.renderer) return;
      
      const deltaTime = (time - lastTime) / 1000;
      lastTime = time;
      
      sceneRef.current.material.uniforms.uTime.value += deltaTime;
      sceneRef.current.renderer.render(scene, camera);
      sceneRef.current.animationId = requestAnimationFrame(animate);
    };
    animate(0);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (sceneRef.current.animationId) {
        cancelAnimationFrame(sceneRef.current.animationId);
      }
      if (sceneRef.current.renderer) {
        sceneRef.current.renderer.dispose();
        if (containerRef.current) {
          containerRef.current.removeChild(sceneRef.current.renderer.domElement);
        }
      }
      if (sceneRef.current.video) {
        sceneRef.current.video.pause();
        sceneRef.current.video.src = '';
        sceneRef.current.video.load();
      }
    };
  }, [videoUrl]);

  // Handle play/pause
  useEffect(() => {
    if (!sceneRef.current.video) return;
    
    if (isPlaying) {
      sceneRef.current.video.play();
    } else {
      sceneRef.current.video.pause();
    }
  }, [isPlaying]);

  // Update shader uniforms when effects change
  useEffect(() => {
    if (!sceneRef.current.material) return;
    
    const { uniforms } = sceneRef.current.material;
    uniforms.uWaveIntensity.value = effects.waveIntensity;
    uniforms.uWaveFrequency.value = effects.waveFrequency;
    uniforms.uColorShift.value = effects.colorShift;
    uniforms.uSpeed.value = effects.speed;
    uniforms.uGlitchAmount.value = effects.glitchAmount;
  }, [effects]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
} 