"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const TAU = Math.PI * 2;
const STAR_COUNT = 1400;

type StarLayer = {
  points: THREE.Points;
  depth: number;
};

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function createStarLayer(count: number, depth: number, size: number, opacity: number): StarLayer {
  const particleCount = Math.max(0, Math.floor(count));
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const twinkle = new Float32Array(particleCount);
  const phase = new Float32Array(particleCount);
  const color = new THREE.Color();

  for (let index = 0; index < particleCount; index += 1) {
    const offset = index * 3;
    const radius = randomBetween(8, 31);
    const angle = Math.random() * TAU;
    const y = randomBetween(-15, 15);

    positions[offset] = Math.cos(angle) * radius;
    positions[offset + 1] = y;
    positions[offset + 2] = randomBetween(-8, -1) * depth;

    color.setHSL(randomBetween(0.55, 0.68), randomBetween(0.15, 0.55), randomBetween(0.72, 1));
    colors[offset] = color.r;
    colors[offset + 1] = color.g;
    colors[offset + 2] = color.b;
    twinkle[index] = randomBetween(0.45, 1.4);
    phase[index] = Math.random() * TAU;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aTwinkle", new THREE.BufferAttribute(twinkle, 1));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: size },
      uOpacity: { value: opacity },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 1.25) },
    },
    vertexShader: `
      attribute float aTwinkle;
      attribute float aPhase;
      varying vec3 vColor;
      varying float vAlpha;
      uniform float uTime;
      uniform float uSize;
      uniform float uPixelRatio;

      void main() {
        vec4 modelPosition = modelMatrix * vec4(position, 1.0);
        vec4 viewPosition = viewMatrix * modelPosition;
        gl_Position = projectionMatrix * viewPosition;
        gl_PointSize = uSize * uPixelRatio * (220.0 / max(1.0, -viewPosition.z));
        vColor = color;
        vAlpha = 0.76 + sin(uTime * aTwinkle + aPhase) * 0.24;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;
      uniform float uOpacity;

      void main() {
        float distanceFromCenter = distance(gl_PointCoord, vec2(0.5));
        float glow = 1.0 - smoothstep(0.08, 0.5, distanceFromCenter);
        if (glow <= 0.01) discard;
        gl_FragColor = vec4(vColor, glow * vAlpha * uOpacity);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;

  return {
    points,
    depth,
  };
}

function createGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) return null;

  const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, "rgba(150, 205, 255, 0.28)");
  gradient.addColorStop(0.24, "rgba(74, 110, 255, 0.15)");
  gradient.addColorStop(0.58, "rgba(80, 40, 180, 0.07)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);

  return new THREE.CanvasTexture(canvas);
}

function createNebula(texture: THREE.Texture, color: number, size: number, x: number, y: number) {
  const nebula = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      color,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  nebula.position.set(x, y, -7);
  nebula.scale.set(size, size * 0.7, 1);
  return nebula;
}

function createMeteor() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([0, 0, 0, -0.8, 0.35, 0], 3),
  );
  const meteor = new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({
      color: 0xbfe5ff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    }),
  );
  meteor.position.set(randomBetween(-9, 9), randomBetween(2, 8), -3);
  meteor.userData = {
    velocity: randomBetween(0.015, 0.035),
    delay: randomBetween(2, 10),
    age: 0,
  };
  return meteor;
}

export default function ThreeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0, 10);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    renderer.setClearColor(0x02040f, 1);

    const starLayers = [
      createStarLayer(STAR_COUNT * 0.35, 0.35, 0.05, 0.42),
      createStarLayer(STAR_COUNT * 0.4, 0.65, 0.075, 0.66),
      createStarLayer(STAR_COUNT * 0.25, 1, 0.11, 0.92),
    ];
    starLayers.forEach(({ points }) => scene.add(points));

    const glowTexture = createGlowTexture();
    const nebulae: THREE.Sprite[] = [];
    if (glowTexture) {
      nebulae.push(
        createNebula(glowTexture, 0x183caa, 12, -7, 5),
        createNebula(glowTexture, 0x541b9e, 10, 7, -1),
        createNebula(glowTexture, 0x0a6b9e, 8, -4, -7),
      );
      nebulae.forEach((nebula) => scene.add(nebula));
    }

    const meteors = Array.from({ length: 4 }, createMeteor);
    meteors.forEach((meteor) => scene.add(meteor));

    const pointer = new THREE.Vector2();
    const target = new THREE.Vector2();
    let scrollTarget = 0;
    let scrollPosition = 0;
    let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
    let isScrolling = false;
    let frameCounter = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      const width = Math.max(1, window.innerWidth);
      const height = Math.max(1, window.innerHeight);
      camera.aspect = width / height;
      camera.position.z = window.innerWidth < 768 ? 12 : 10;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const onPointerMove = (event: PointerEvent) => {
      const width = Math.max(1, window.innerWidth);
      const height = Math.max(1, window.innerHeight);
      const x = (event.clientX / width) * 2 - 1;
      const y = -(event.clientY / height) * 2 + 1;
      if (Number.isFinite(x) && Number.isFinite(y)) {
        pointer.set(x, y);
      }
    };
    const onScroll = () => {
      scrollTarget = window.scrollY;
      isScrolling = true;
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isScrolling = false;
      }, 120);
    };

    let frameId = 0;
    let isPageVisible = true;
    let previousTime = performance.now();
    let renderAccumulator = 0;
    const animate = (now: number) => {
      if (!isPageVisible) return;

      const delta = Math.min((now - previousTime) / 1000, 0.05);
      previousTime = now;
      renderAccumulator += delta;
      const time = now * 0.001;
      frameCounter += 1;
      target.lerp(pointer, 0.035);
      scrollPosition += (scrollTarget - scrollPosition) * 0.045;

      starLayers.forEach((layer) => {
        const material = layer.points.material as THREE.ShaderMaterial;
        material.uniforms.uTime.value = reducedMotion ? 0 : time;
        layer.points.position.y = -scrollPosition * (0.0008 + layer.depth * 0.0014);
        layer.points.position.x = target.x * layer.depth * 0.28;
      });

      if (!isScrolling || frameCounter % 3 === 0) nebulae.forEach((nebula, index) => {
        nebula.position.y += Math.sin(time * 0.08 + index) * 0.0005;
        nebula.position.x = [-7, 7, -4][index] + target.x * (0.8 + index * 0.25);
        nebula.position.y = [5, -1, -7][index] + target.y * (0.5 + index * 0.2) - scrollPosition * (0.0003 + index * 0.0002);
        nebula.material.rotation = Math.sin(time * 0.04 + index) * 0.12;
      });

      if (!isScrolling) meteors.forEach((meteor) => {
        const data = meteor.userData as { velocity: number; delay: number; age: number };
        if (!reducedMotion) data.age += delta;
        if (data.age > data.delay) {
          meteor.position.x -= data.velocity * delta * 60;
          meteor.position.y -= data.velocity * delta * 28;
          (meteor.material as THREE.LineBasicMaterial).opacity = Math.max(0, 0.75 - (data.age - data.delay) * 0.16);
          if (meteor.position.x < -12 || meteor.position.y < -7) {
            meteor.position.set(randomBetween(3, 11), randomBetween(4, 8), -3);
            data.age = 0;
            data.delay = randomBetween(4, 11);
          }
        }
      });

      camera.position.x += (target.x * 0.16 - camera.position.x) * 0.025;
      camera.position.y += (target.y * 0.1 + scrollPosition * 0.00035 - camera.position.y) * 0.025;
      camera.lookAt(0, 0, -3);
      if (renderAccumulator >= 1 / 30) {
        renderer.render(scene, camera);
        renderAccumulator = 0;
      }
      frameId = requestAnimationFrame(animate);
    };
    const onVisibilityChange = () => {
      isPageVisible = document.visibilityState === "visible";
      if (isPageVisible) {
        previousTime = performance.now();
        frameId = requestAnimationFrame(animate);
      } else {
        cancelAnimationFrame(frameId);
        if (scrollTimeout) clearTimeout(scrollTimeout);
      }
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Sprite || object instanceof THREE.Line) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
          else object.material.dispose();
        }
      });
      glowTexture?.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="three-background pointer-events-none fixed inset-0 z-0 h-full w-full" />;
}
