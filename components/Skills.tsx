'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WALL_THICKNESS = 40;
const WALL_PADDING = 2;
const BALL_SPAWN_HEIGHT_RATIO = 0.35;
const CAT_BALL = 0x0001;
const CAT_WALL = 0x0002;
const SCROLL_VELOCITY_CLAMP = 1;
const ANGULAR_VELOCITY_JITTER = 0.02;
const MIN_DIMENSION = 10;
const SCROLL_SHAKE_THROTTLE = 16; // ~60fps throttling (ms)
const OPTIMAL_PIXEL_RATIO = 1; // Keep the many physics canvases inexpensive during page scrolling
const MOBILE_BREAKPOINT = 768;
const RESIZE_DEBOUNCE = 150;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MatterModule = typeof import('matter-js');

type PhysicsConfig = {
  minBalls?: number;
  maxBalls?: number;
  colors: string[];
  gravity?: number;
  radiusRange?: [number, number];
  restitution?: number;
  friction?: number;
  frictionAir?: number;
  pixelRatio?: number;
  shakeForce?: number;
};

type ResolvedPhysicsConfig = Required<PhysicsConfig>;

type Skill = {
  name: string;
  src: string;
  palette: string[];
  options?: Omit<PhysicsConfig, 'colors'>;
};

type RevealedPokemon = {
  id: number;
  name: string;
  image: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
};

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

const randInt = (a: number, b: number): number =>
  Math.floor(Math.random() * (b - a + 1)) + a;

/** Fills in defaults and applies responsive/device-aware overrides. */
function resolveConfig(config: PhysicsConfig): ResolvedPhysicsConfig {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT;

  return {
    minBalls: config.minBalls ?? 5,
    maxBalls: isMobile ? 4 : config.maxBalls ?? 8,
    colors: config.colors.length ? config.colors : ['#3b82f6', '#22c55e', '#ef4444'],
    gravity: config.gravity ?? 1,
    radiusRange: config.radiusRange ?? [10, 16],
    restitution: config.restitution ?? 0.85,
    friction: config.friction ?? 0.05,
    frictionAir: config.frictionAir ?? 0.003,
    pixelRatio: Math.min(
      OPTIMAL_PIXEL_RATIO,
      typeof window !== 'undefined' ? window.devicePixelRatio ?? 1 : 1
    ),
    shakeForce: config.shakeForce ?? 0.002,
  };
}

// ---------------------------------------------------------------------------
// Physics scene helpers
// Each of these operates on plain Matter.js primitives so they can be
// unit-reasoned about independently of the React lifecycle around them.
// ---------------------------------------------------------------------------

/** (Re)builds the four static bounding walls for the current canvas size. */
function createWalls(
  Bodies: MatterModule['Bodies'],
  Composite: MatterModule['Composite'],
  world: Matter.World,
  width: number,
  height: number
): Matter.Body[] {
  const half = WALL_THICKNESS / 2;
  const wallOptions: Matter.IChamferableBodyDefinition = {
    isStatic: true,
    collisionFilter: { category: CAT_WALL, mask: CAT_BALL },
    render: { fillStyle: 'transparent' },
  };

  const walls = [
    Bodies.rectangle(width / 2, -half, width, WALL_THICKNESS, wallOptions), // top
    Bodies.rectangle(width / 2, height + half, width, WALL_THICKNESS, wallOptions), // bottom
    Bodies.rectangle(-half, height / 2, WALL_THICKNESS, height, wallOptions), // left
    Bodies.rectangle(width + half, height / 2, WALL_THICKNESS, height, wallOptions), // right
  ];

  Composite.add(world, walls);
  return walls;
}

/** Spawns a random batch of colored balls near the top of the canvas. */
function createBalls(
  cfg: ResolvedPhysicsConfig,
  Bodies: MatterModule['Bodies'],
  Composite: MatterModule['Composite'],
  world: Matter.World,
  width: number,
  height: number
): Matter.Body[] {
  const [rmin, rmax] = cfg.radiusRange;
  const count = randInt(cfg.minBalls, cfg.maxBalls);
  const spawnHeight = Math.floor(height * BALL_SPAWN_HEIGHT_RATIO);

  const balls = Array.from({ length: count }, () => {
    const r = randInt(rmin, rmax);
    const x = randInt(r + WALL_PADDING, width - r - WALL_PADDING);
    const y = randInt(r + WALL_PADDING, Math.max(r + WALL_PADDING, spawnHeight));
    const color = cfg.colors[randInt(0, cfg.colors.length - 1)];

    return Bodies.circle(x, y, r, {
      restitution: cfg.restitution,
      friction: cfg.friction,
      frictionAir: cfg.frictionAir,
      collisionFilter: { category: CAT_BALL, mask: CAT_BALL | CAT_WALL },
      render: {
        fillStyle: color,
        strokeStyle: 'rgba(0,0,0,0.08)',
        lineWidth: 1,
      },
    });
  });

  Composite.add(world, balls);
  return balls;
}

/** Keeps a body fully inside the [0..width] x [0..height] rectangle. */
function clampBallInside(
  Body: MatterModule['Body'],
  ball: Matter.Body,
  width: number,
  height: number
) {
  const radius = (ball as unknown as { circleRadius?: number }).circleRadius ?? 12;
  const bounds = {
    minX: radius + WALL_PADDING,
    maxX: width - radius - WALL_PADDING,
    minY: radius + WALL_PADDING,
    maxY: height - radius - WALL_PADDING,
  };

  const nx = Math.min(bounds.maxX, Math.max(bounds.minX, ball.position.x));
  const ny = Math.min(bounds.maxY, Math.max(bounds.minY, ball.position.y));

  if (nx === ball.position.x && ny === ball.position.y) return;

  Body.setPosition(ball, { x: nx, y: ny });

  const { x: vx, y: vy } = ball.velocity;
  const isOutHorizontal = (ball.position.x <= bounds.minX && vx < 0) || (ball.position.x >= bounds.maxX && vx > 0);
  const isOutVertical = (ball.position.y <= bounds.minY && vy < 0) || (ball.position.y >= bounds.maxY && vy > 0);

  Body.setVelocity(ball, {
    x: isOutHorizontal ? 0 : vx,
    y: isOutVertical ? 0 : vy,
  });
}

/** Lets wheel/touch events pass through the canvas so the page still scrolls. */
function setupScrollPassThrough(canvas: HTMLCanvasElement) {
  canvas.style.touchAction = 'pan-y';
  const opts: AddEventListenerOptions = { passive: true, capture: true };
  const stopPropagation = (e: Event) => e.stopImmediatePropagation();

  const events = ['wheel', 'mousewheel', 'DOMMouseScroll', 'touchmove'] as const;
  events.forEach((type) => canvas.addEventListener(type, stopPropagation, opts));

  return () => {
    events.forEach((type) => canvas.removeEventListener(type, stopPropagation, true));
  };
}

/** Nudges balls with a small force whenever the page is scrolled/wheeled. */
function setupScrollShake(
  Body: MatterModule['Body'],
  balls: Matter.Body[],
  cfg: ResolvedPhysicsConfig,
  pauseRunner: () => void,
  resumeRunner: () => void
) {
  let lastY = window.scrollY;
  let lastT = performance.now();
  let lastShakeT = performance.now();
  let resumeTimeout: ReturnType<typeof setTimeout> | null = null;
  let isPaused = false;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const onScroll = () => {
    if (!isPaused) {
      pauseRunner();
      isPaused = true;
    }
    if (resumeTimeout) clearTimeout(resumeTimeout);
    resumeTimeout = setTimeout(() => {
      isPaused = false;
      resumeRunner();
    }, 140);

    if (prefersReducedMotion) return;

    const now = performance.now();
    if (now - lastShakeT < SCROLL_SHAKE_THROTTLE) return;
    lastShakeT = now;

    const dy = window.scrollY - lastY;
    const dt = Math.max(8, now - lastT);
    lastY = window.scrollY;
    lastT = now;

    const velocity = Math.max(-SCROLL_VELOCITY_CLAMP, Math.min(SCROLL_VELOCITY_CLAMP, dy / dt));
    const forceY = cfg.shakeForce * velocity;
    const forceX = cfg.shakeForce * velocity * (Math.random() * 0.6 - 0.3);

    balls.forEach((ball) => {
      Body.applyForce(ball, ball.position, { x: forceX, y: forceY });
      Body.setAngularVelocity(
        ball,
        ball.angularVelocity + (Math.random() * ANGULAR_VELOCITY_JITTER - ANGULAR_VELOCITY_JITTER / 2)
      );
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('wheel', onScroll, { passive: true });

  return () => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('wheel', onScroll);
    if (resumeTimeout) clearTimeout(resumeTimeout);
  };
}

// ---------------------------------------------------------------------------
// Component: PhysicsCanvas
// Mounts a Matter.js scene (walls + bouncing, scroll-reactive balls) behind
// a centered logo. Matter.js is loaded dynamically since it needs `window`.
// ---------------------------------------------------------------------------

function PhysicsCanvas({
  logoSrc,
  logoAlt,
  config,
  className = 'aspect-square w-full',
  logoClassName,
}: {
  logoSrc: string;
  logoAlt: string;
  config: PhysicsConfig;
  className?: string;
  logoClassName?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    let resizeObs: ResizeObserver | null = null;
    let teardownScrollShake: (() => void) | null = null;
    let teardownScrollPassThrough: (() => void) | null = null;
    let teardownPausePhysics: (() => void) | null = null;
    let teardownVisibility: (() => void) | null = null;
    let teardownPhysics: (() => void) | null = null;
    let teardownResize: (() => void) | null = null;

    (async () => {
      const el = containerRef.current;
      if (!el) return;

      // SSR-safe: load Matter.js only on the client.
      const Matter = await import('matter-js');
      if (!mounted) return;

      const { Engine, Render, Runner, Composite, Bodies, Body, Events } = Matter;
      const cfg = resolveConfig(config);

      const rect = el.getBoundingClientRect();
      let width = Math.max(MIN_DIMENSION, Math.floor(rect.width));
      let height = Math.max(MIN_DIMENSION, Math.floor(rect.height));

      const engine = Engine.create();
      engine.gravity.y = cfg.gravity;

      const render = Render.create({
        element: el,
        engine,
        options: {
          width,
          height,
          background: 'transparent',
          wireframes: false,
          pixelRatio: cfg.pixelRatio,
        },
      });

      const runner = Runner.create();

      let walls = createWalls(Bodies, Composite, engine.world, width, height);
      const balls = createBalls(cfg, Bodies, Composite, engine.world, width, height);

      teardownScrollPassThrough = setupScrollPassThrough(render.canvas);
      let physicsPaused = false;
      let isVisible = true;
      const startPhysics = () => {
        if (!physicsPaused && isVisible) {
          Runner.run(runner, engine);
          Render.run(render);
        }
      };
      const stopPhysics = () => {
        Runner.stop(runner);
        Render.stop(render);
      };
      teardownPhysics = stopPhysics;
      const pausePhysics = () => {
        physicsPaused = true;
        stopPhysics();
      };
      window.addEventListener('pause-skill-physics', pausePhysics);
      teardownPausePhysics = () =>
        window.removeEventListener('pause-skill-physics', pausePhysics);

      teardownScrollShake = setupScrollShake(
        Body,
        balls,
        cfg,
        stopPhysics,
        startPhysics,
      );

      // Clamp every tick so no ball can escape the bounding box.
      Events.on(engine, 'afterUpdate', () => {
        for (const ball of balls) clampBallInside(Body, ball, width, height);
      });

      startPhysics();

      const visibilityObserver = new IntersectionObserver(
        ([entry]) => {
          isVisible = entry.isIntersecting;
          if (isVisible) startPhysics();
          else stopPhysics();
        },
        { threshold: 0.01 },
      );
      visibilityObserver.observe(el);
      teardownVisibility = () => visibilityObserver.disconnect();

      // Resize the scene (debounced) whenever the container changes size.
      let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
      const handleResize = () => {
        if (resizeTimeout) clearTimeout(resizeTimeout);

        resizeTimeout = setTimeout(() => {
          const nextRect = el.getBoundingClientRect();
          width = Math.max(MIN_DIMENSION, Math.floor(nextRect.width));
          height = Math.max(MIN_DIMENSION, Math.floor(nextRect.height));

          render.canvas.width = width * cfg.pixelRatio;
          render.canvas.height = height * cfg.pixelRatio;
          render.canvas.style.width = `${width}px`;
          render.canvas.style.height = `${height}px`;
          render.options.width = width;
          render.options.height = height;

          Composite.remove(engine.world, walls);
          walls = createWalls(Bodies, Composite, engine.world, width, height);

          balls.forEach((ball) => clampBallInside(Body, ball, width, height));
        }, RESIZE_DEBOUNCE);
      };

      resizeObs = new ResizeObserver(handleResize);
      resizeObs.observe(el);
      teardownResize = () => {
        if (resizeTimeout) clearTimeout(resizeTimeout);
      };
    })();

    return () => {
      mounted = false;
      resizeObs?.disconnect();
      teardownScrollShake?.();
      teardownScrollPassThrough?.();
      teardownPausePhysics?.();
      teardownVisibility?.();
      teardownResize?.();
      teardownPhysics?.();
      containerRef.current?.querySelector('canvas')?.remove();
    };
  }, [config]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden rounded-xl border border-white/10 ${className} bg-white/10 dark:bg-white/5 backdrop-blur-md supports-[backdrop-filter]:bg-white/10 [box-shadow:inset_0_1px_0_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.08)]`}
    >
      <Image
        src={logoSrc}
        alt={logoAlt}
        width={160}
        height={96}
        className={`pointer-events-none absolute inset-0 z-10 m-auto object-contain opacity-90 will-change-transform backface-visibility-hidden ${logoClassName ?? ''}`}
        style={{ width: '60%', height: 'auto' }}
        loading="lazy"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const SKILLS: Skill[] = [
  { name: 'Ruby on Rails', src: './RubyonRails.webp', palette: ['#CC0000', '#8B0000', '#FF4D4D', '#660000'] },
  { name: 'HTML', src: './html.webp', palette: ['#E34F26', '#F06529', '#FF8A50', '#FFC2A1'] },
  { name: 'CSS', src: './css.webp', palette: ['#1572B6', '#2965F1', '#5DADE2', '#A9CCE3'] },
  { name: 'TypeScript', src: './Typescript.webp', palette: ['#3178C6', '#235A97', '#5AA9E6', '#A7D3F5'] },
  { name: 'Next.js', src: './Nextjs.webp', palette: ['#000000', '#111827', '#6B7280', '#E5E7EB'] },
  { name: 'Tailwind CSS', src: './Tailwind.webp', palette: ['#06B6D4', '#0891B2', '#67E8F9', '#CFFAFE'] },
  { name: 'PostgreSQL', src: './postgresql.webp', palette: ['#336791', '#2D5A88', '#6699CC', '#B3D4FC'] },
  { name: 'Redis', src: './Redis.png', palette: ['#DC382D', '#A41E11', '#FF6B6B', '#F5B7B1'] },
  { name: 'Vite', src: './Vite.webp', palette: ['#646CFF', '#4F46E5', '#A5B4FC', '#E0E7FF'] },
  { name: 'Docker', src: './Docker.webp', palette: ['#2496ED', '#0B5FFF', '#6FB6FF', '#CFE8FF'] },
  { name: 'Salesforce', src: './Salesforce.png', palette: ['#00A1E0', '#1589EE', '#6EC1FF', '#CFE9FF'] },
  { name: 'Git', src: './Git.webp', palette: ['#F05032', '#BD2C00', '#FF7F50', '#FFD6CC'] },
];

const BASE_PHYSICS_CONFIG: Omit<PhysicsConfig, 'colors'> = {
  minBalls: 3,
  maxBalls: 5,
  gravity: 1,
  radiusRange: [8, 14],
  restitution: 0.85,
  friction: 0.05,
  frictionAir: 0.003,
  shakeForce: 0.002,
};

const SKILL_CONFIGS = SKILLS.map((skill) => ({
  ...BASE_PHYSICS_CONFIG,
  colors: skill.palette,
  ...(skill.options ?? {}),
}));

const POKEMON_GLOW_COLORS: Record<RevealedPokemon['rarity'], string> = {
  common: '#22c55e',
  uncommon: '#38bdf8',
  rare: '#a855f7',
  legendary: '#f59e0b',
};
const EXPERIENCE_BALL_IMAGES = ['/Pokeball.png', '/GreatBall.png'];
const MASTERBALL_IMAGE = '/Masterball.png';

// ---------------------------------------------------------------------------
// Component: Skills
// ---------------------------------------------------------------------------

export default function Skills() {
  const [revealedPokemon, setRevealedPokemon] = useState<RevealedPokemon[]>([]);
  const [visiblePokemon, setVisiblePokemon] = useState<RevealedPokemon[]>([]);
  const [fallbackBallImages, setFallbackBallImages] = useState<string[]>([]);
  const [revealingIndex, setRevealingIndex] = useState<number | null>(null);
  const [loadedPokemonIds, setLoadedPokemonIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [breakingPokemonIds, setBreakingPokemonIds] = useState<Set<number>>(
    () => new Set(),
  );
  const revealTimersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    let revealTimer: ReturnType<typeof setTimeout> | null = null;
    let nextTimer: ReturnType<typeof setTimeout> | null = null;
    const onPokemonRevealed = (event: Event) => {
      const pokemon = (event as CustomEvent<RevealedPokemon[]>).detail;
      if (pokemon?.length !== SKILLS.length) return;

      if (revealTimer) clearTimeout(revealTimer);
      if (nextTimer) clearTimeout(nextTimer);
      setRevealedPokemon(pokemon);
      setVisiblePokemon([]);
      setFallbackBallImages(
        pokemon.map(
          ({ rarity }) =>
            rarity === 'legendary'
              ? MASTERBALL_IMAGE
              : EXPERIENCE_BALL_IMAGES[
                  Math.floor(Math.random() * EXPERIENCE_BALL_IMAGES.length)
                ],
        ),
      );
      setLoadedPokemonIds(new Set());
      setBreakingPokemonIds(new Set());
      revealTimersRef.current.forEach((timer) => clearTimeout(timer));
      revealTimersRef.current.clear();

      const revealNext = (index: number) => {
        if (index >= pokemon.length) {
          setRevealingIndex(null);
          return;
        }

        setRevealingIndex(index);
        revealTimer = setTimeout(() => {
          setVisiblePokemon((current) => [...current, pokemon[index]]);
          nextTimer = setTimeout(() => revealNext(index + 1), 350);
        }, 500);
      };

      revealNext(0);
    };

    window.addEventListener('pokemon-revealed', onPokemonRevealed);
    return () => {
      window.removeEventListener('pokemon-revealed', onPokemonRevealed);
      if (revealTimer) clearTimeout(revealTimer);
      if (nextTimer) clearTimeout(nextTimer);
      revealTimersRef.current.forEach((timer) => clearTimeout(timer));
      revealTimersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    visiblePokemon.forEach((pokemon) => {
      if (loadedPokemonIds.has(pokemon.id)) return;

      const image = new window.Image();
      image.onload = () => {
        setBreakingPokemonIds((current) => new Set(current).add(pokemon.id));
        const timer = setTimeout(() => {
          setLoadedPokemonIds((current) => new Set(current).add(pokemon.id));
          setBreakingPokemonIds((current) => {
            const next = new Set(current);
            next.delete(pokemon.id);
            return next;
          });
          revealTimersRef.current.delete(pokemon.id);
        }, 800);
        revealTimersRef.current.set(pokemon.id, timer);
      };
      image.src = pokemon.image;
    });
  }, [loadedPokemonIds, visiblePokemon]);

  return (
    <section id="skills" className="scroll-mt-16" data-section="skills">
      <div className="sticky top-0 z-20 -mx-6 mb-4 w-screen px-6 py-5 backdrop-blur md:-mx-12 md:px-12 lg:static lg:mb-0 lg:w-auto lg:px-0 lg:py-0 lg:backdrop-blur-none">
        <h2 className="shiny text-xl font-bold uppercase tracking-widest lg:hidden text-start">
          Skills
        </h2>
      </div>

      <div className="flex flex-col gap-4 mb-8">
        <h2 className="shiny hidden text-3xl font-bold lg:block lg:text-start">Skills</h2>
      </div>

      <div className="skills-pokemon-stage">
        <ul role="list" className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:gap-6">
        {SKILLS.map((skill, index) => (
          <li
            key={skill.name}
            className={`relative rounded-xl border border-white/10 transition-shadow hover:shadow-md ${
              revealingIndex === index || visiblePokemon[index]
                ? "skills-card-revealing"
                : ""
            }`}
          >
            <PhysicsCanvas
              logoSrc={skill.src}
              logoAlt={`${skill.name} logo`}
              config={SKILL_CONFIGS[index]}
              className="aspect-square w-full"
              logoClassName="skills-card-logo"
            />

            {(visiblePokemon[index] ||
              (revealingIndex === index && revealedPokemon[index])) && (
              <div
                className="skills-pokemon-overlay"
                aria-label={`Revealed Pokémon: ${
                  visiblePokemon[index]?.name ?? "Poké Ball"
                }`}
              >
                {visiblePokemon[index] &&
                loadedPokemonIds.has(visiblePokemon[index].id) ? (
                  <div
                    className="skills-pokemon-glow"
                    style={{
                      '--pokemon-glow':
                        POKEMON_GLOW_COLORS[visiblePokemon[index].rarity],
                    } as React.CSSProperties}
                  >
                    <img
                      src={visiblePokemon[index].image}
                      alt={`${visiblePokemon[index].name} reveal`}
                      className="skills-pokemon-image"
                      draggable={false}
                    />
                  </div>
                ) : (
                  <div
                    className={`skills-pokeball-break ${
                      visiblePokemon[index] &&
                      breakingPokemonIds.has(visiblePokemon[index].id)
                        ? "is-breaking"
                        : ""
                    }`}
                    role="img"
                    aria-label="Poké Ball"
                  >
                    <img
                      src={fallbackBallImages[index] ?? '/GreatBall.png'}
                      alt=""
                      className="skills-pokeball"
                      draggable={false}
                    />
                    <span className="skills-pokeball-sparks" aria-hidden="true" />
                  </div>
                )}
                {visiblePokemon[index] && (
                  <span className="skills-pokemon-tooltip">
                    {visiblePokemon[index].name}
                  </span>
                )}
              </div>
            )}

            <div className="px-3 py-3 min-h-[3rem] flex items-center justify-center">
              <p className="text-center text-sm font-medium leading-tight break-words whitespace-normal">
                {skill.name}
              </p>
            </div>
          </li>
        ))}
        </ul>
      </div>
    </section>
  );
}