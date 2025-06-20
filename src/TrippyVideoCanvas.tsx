import { useEffect, useRef } from 'preact/hooks';
import * as THREE from 'three';

interface Effects {
  waveIntensity: number;
  waveFrequency: number;
  colorShift: number;
  speed: number;
  glitchAmount: number;
  scanlineIntensity: number;
  staticAmount: number;
  trackingNoiseAmount: number;
  chromaticAberration: number;
  verticalJitter: number;
}

interface TrippyVideoCanvasProps {
  videoUrl: string;
  isPlaying: boolean;
  effects: Effects;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

export function TrippyVideoCanvas({ videoUrl, isPlaying, effects, onTimeUpdate }: TrippyVideoCanvasProps) {
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
    
    // Add time update handler
    video.addEventListener('timeupdate', () => {
      onTimeUpdate?.(video.currentTime, video.duration);
    });
    
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
        uGlitchAmount: { value: effects.glitchAmount },
        uScanlineIntensity: { value: effects.scanlineIntensity },
        uStaticAmount: { value: effects.staticAmount },
        uTrackingNoiseAmount: { value: effects.trackingNoiseAmount },
        uChromaticAberration: { value: effects.chromaticAberration },
        uVerticalJitter: { value: effects.verticalJitter },
        uResolution: { value: new THREE.Vector2() }
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
        uniform float uScanlineIntensity;
        uniform float uStaticAmount;
        uniform float uTrackingNoiseAmount;
        uniform float uChromaticAberration;
        uniform float uVerticalJitter;
        uniform vec2 uResolution;
        varying vec2 vUv;

        // Random function
        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }

        // Noise function
        float noise(vec2 st) {
          vec2 i = floor(st);
          vec2 f = fract(st);
          float a = random(i);
          float b = random(i + vec2(1.0, 0.0));
          float c = random(i + vec2(0.0, 1.0));
          float d = random(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }

        void main() {
          float t = uTime * uSpeed;
          vec2 uv = vUv;
          
          // Vertical jitter
          float jitter = sin(t * 10.0) * uVerticalJitter;
          uv.y += jitter;
          
          // Wave distortion
          float wave = sin(uv.y * uWaveFrequency + t) * uWaveIntensity;
          
          // Tracking noise effect
          float trackingLine = step(0.99, sin(uv.y * 100.0 + t)) * uTrackingNoiseAmount;
          float trackingOffset = trackingLine * 0.01;
          
          // Glitch effect
          float glitch = step(1.0 - uGlitchAmount, fract(uv.y * 10.0 + t)) * 0.1;
          
          // Combine distortions
          vec2 distortedUV = uv + vec2(wave + glitch + trackingOffset, 0.0);
          
          // Chromatic aberration
          vec2 redOffset = vec2(uChromaticAberration, 0.0);
          vec2 greenOffset = vec2(0.0, 0.0);
          vec2 blueOffset = vec2(-uChromaticAberration, 0.0);
          
          vec3 color;
          color.r = texture2D(uTexture, distortedUV + redOffset).r;
          color.g = texture2D(uTexture, distortedUV + greenOffset).g;
          color.b = texture2D(uTexture, distortedUV + blueOffset).b;
          
          // Color shift/rotation
          float angle = uColorShift;
          mat3 colorRotation = mat3(
            cos(angle), -sin(angle), 0.0,
            sin(angle), cos(angle), 0.0,
            0.0, 0.0, 1.0
          );
          color = colorRotation * color;
          
          // Static noise
          float staticNoise = noise(vec2(uv.x * 100.0 + t, uv.y * 100.0 - t)) * uStaticAmount;
          color += vec3(staticNoise);
          
          // Scanlines
          float scanline = sin(uv.y * 800.0) * 0.5 + 0.5;
          color *= 1.0 - (scanline * uScanlineIntensity);
          
          // VHS-like color adjustments
          color = mix(color, vec3(dot(color, vec3(0.299, 0.587, 0.114))), 0.1);
          color *= 0.9 + 0.1 * sin(t + uv.y * 10.0);
          
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
      if (!containerRef.current || !sceneRef.current.renderer || !sceneRef.current.material) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      sceneRef.current.renderer.setSize(width, height);
      sceneRef.current.material.uniforms.uResolution.value.set(width, height);
    };
    window.addEventListener('resize', handleResize);
    handleResize();

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
        sceneRef.current.video.removeEventListener('timeupdate', () => {
          onTimeUpdate?.(sceneRef.current.video!.currentTime, sceneRef.current.video!.duration);
        });
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
    uniforms.uScanlineIntensity.value = effects.scanlineIntensity;
    uniforms.uStaticAmount.value = effects.staticAmount;
    uniforms.uTrackingNoiseAmount.value = effects.trackingNoiseAmount;
    uniforms.uChromaticAberration.value = effects.chromaticAberration;
    uniforms.uVerticalJitter.value = effects.verticalJitter;
  }, [effects]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
} 