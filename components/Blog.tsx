"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { MoveUpRight, MoveRight, Pin } from "lucide-react";

type DevToUser = {
  name?: string;
  username?: string;
};

type DevBlog = {
  id: number;
  title: string;
  url: string;
  user: DevToUser;
  cover_image: string;
  social_image: string;
  published_timestamp: string;
  positive_reactions_count: number;
  description: string;
};

export function formatDate(isoString: string | number | Date) {
  return new Date(isoString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const PINNED_TITLES: Record<string, string> = {
  "Get Started on Dev.to! A Beginner's Guide to Engage with the Community! 💡":
    `🗺️ Listed as DEV's Official Community Resource Guide"`,
  "I used Google Gemini for the First Time. A Deep Analysis of my Experience so far! ✨":
    `🏆 Winner of the "Google Gemini: Writing Challenge"`,
};

const FALLBACK_IMAGE =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzg0MCIgaGVpZ2h0PSIyMTYwIiB2aWV3Qm94PSIwIDAgMzg0MCAyMTYwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iMzg0MCIgaGVpZ2h0PSIyMTYwIiBmaWxsPSIjMTQxNDE0Ii8+Cjx0ZXh0IHg9IjE5MjAiIHk9IjExODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM2YjcyODAiIGZvbnQtc2l6ZT0iOTYiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmaWxsLW9wYWNpdHk9IjAuNSI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPg==";

function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || typeof window === 'undefined' || window.innerWidth < 768) return;
    
    requestAnimationFrame(() => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      setMousePos({ x, y });

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = (centerY - y) / centerY * 5; 
      const rotateY = (x - centerX) / centerX * 5;
      setRotate({ x: rotateX, y: rotateY });
    });
  };

  const handleMouseLeave = () => {
    requestAnimationFrame(() => {
      setRotate({ x: 0, y: 0 });
      setMousePos({ x: 0, y: 0 });
    });
  };

  return (
    <div 
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ 
        perspective: "1000px",
        transformStyle: "preserve-3d" 
      }}
      className="w-full"
    >
      <div 
        style={{ 
          transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
          transition: "transform 0.1s ease-out",
          willChange: "transform",
          // Pass mouse position to children via CSS variables
          ["--mouse-x" as any]: `${mousePos.x}px`,
          ["--mouse-y" as any]: `${mousePos.y}px`,
        }}
        className={className}
      >
        {children}
      </div>
    </div>
  );
}

export default function Blog() {
  const [articles, setArticles] = useState<DevBlog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isUnmounted = false;
    let currentController: AbortController | null = null;

    const fetchArticles = () => {
      currentController?.abort();
      currentController = new AbortController();

      const url = new URL("https://dev.to/api/articles");
      url.searchParams.set("username", "francistrdev");
      url.searchParams.set("per_page", "1000");
      url.searchParams.set("t", String(Date.now()));

      fetch(url.toString(), {
        cache: "no-store",
        signal: currentController.signal,
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data: DevBlog[]) => {
          if (isUnmounted) return;
          setArticles(data);
          setError(null);
          setLoading(false);
        })
        .catch((err) => {
          if (isUnmounted) return;
          if ((err as any)?.name === "AbortError") return;

          console.error("Failed to fetch articles:", err);
          setError("Unable to load blog posts at the moment.");
          setLoading(false);
        });
    };

    fetchArticles();

    return () => {
      isUnmounted = true;
      currentController?.abort();
    };
  }, []);

  // Loading Skeleton
  if (loading)
    return (
      <section id="blog" className="scroll-mt-16 lg:mt-16">
        <div className="sticky top-0 z-20 -mx-6 mb-4 w-screen bg-background/0 px-6 py-5 backdrop-blur md:-mx-12 md:px-12 lg:sr-only lg:relative lg:top-auto lg:mx-auto lg:w-full lg:px-0 lg:py-0 lg:opacity-0">
          <h2 className="shiny text-xl font-bold uppercase tracking-widest lg:sr-only">
            Blog
          </h2>
        </div>

        <div className="flex flex-col gap-4 mb-8">
          <h2 className="shiny hidden text-3xl font-bold lg:block lg:text-start">
            Blog
          </h2>
        </div>

        <div className="space-y-8">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-48 bg-muted rounded-lg mb-4" />
              <div className="h-6 bg-muted rounded mb-2" />
              <div className="h-4 bg-muted rounded mb-1 w-1/3" />
              <div className="h-4 bg-muted rounded w-3/4" />
            </Card>
          ))}
        </div>
      </section>
    );

  // Error State
  if (error)
    return (
      <section id="blog" className="scroll-mt-16 lg:mt-16">
        <div className="sticky top-0 z-20 -mx-6 mb-4 w-screen bg-background/0 px-6 py-5 backdrop-blur md:-mx-12 md:px-12 lg:sr-only lg:relative lg:top-auto lg:mx-auto lg:w-full lg:px-0 lg:py-0 lg:opacity-0">
          <h2 className="shiny text-xl font-bold uppercase tracking-widest lg:sr-only">
            Blog
          </h2>
        </div>

        <div className="flex flex-col gap-4 mb-8">
          <h2 className="shiny hidden text-3xl font-bold lg:block lg:text-start">
            Blog
          </h2>
        </div>

        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            Unable to load blog posts at the moment.
          </p>
          <p className="text-sm text-muted-foreground">
            Please check back later or visit my Dev.to profile directly.
          </p>
          <a
            href="https://dev.to/francistrdev"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Visit Francis Tran's Dev.to profile"
            className="inline-flex items-center mt-4 text-primary hover:underline"
          >
            Visit Dev.to Profile <MoveRight className="ml-1 h-4 w-4" />
          </a>
        </div>
      </section>
    );

  // Identify most recent top 3 posts (by published date)
  const recentTop3Ids = [...articles]
    .sort(
      (a, b) =>
        new Date(b.published_timestamp).getTime() -
        new Date(a.published_timestamp).getTime()
    )
    .slice(0, 3)
    .map((a) => a.id);

  // Ensure pinned posts appear at the top (stable ordering)
  const sortedArticles = articles
    .map((a, idx) => ({ a, idx, pin: !!PINNED_TITLES[a.title] }))
    .sort((x, y) => {
      if (x.pin === y.pin) return x.idx - y.idx;
      return x.pin ? -1 : 1;
    })
    .map((x) => x.a);

  // Show only recent (top 3) OR pinned
  const filteredArticles = sortedArticles.filter(
    (a) => recentTop3Ids.includes(a.id) || !!PINNED_TITLES[a.title]
  );

  return (
    <section id="blog" className="scroll-mt-16 lg:mt-16" data-section="blog">
      <div className="sticky top-0 z-20 -mx-6 mb-4 w-screen bg-background/0 px-6 py-5 backdrop-blur md:-mx-12 md:px-12 lg:sr-only lg:relative lg:top-auto lg:mx-auto lg:w-full lg:px-0 lg:py-0 lg:opacity-0">
        <h2 className="shiny text-xl font-bold uppercase tracking-widest lg:sr-only">
          Blog
        </h2>
      </div>

      <div className="flex flex-col gap-4 mb-8">
        <h2 className="shiny hidden text-3xl font-bold lg:block lg:text-start">
          Blog
        </h2>
      </div>

      <>
        {filteredArticles.map((a) => {
          const pinLabel = PINNED_TITLES[a.title];

          const imgSrc =
            (a.cover_image && a.cover_image.trim()) ||
            (a.social_image && a.social_image.trim()) ||
            FALLBACK_IMAGE;

          return (
            <a
              key={a.id}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Read blog post: ${a.title}`}
              className="
                group block hover:cursor-pointer
                focus:outline-none
              "
            >
              <TiltCard className="will-change-transform">
                <Card
                  className={`
                    relative overflow-hidden
                    p-6 mb-8 w-full min-h-fit
                    border border-border/60
                    bg-card/70 backdrop-blur
                    shadow-sm
                    transition-all duration-200
                    hover:-translate-y-0.5 hover:shadow-md
                    group-hover:border-primary/60
                    focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2
                    ${pinLabel ? "pinned-border-animation border-transparent" : ""}
                  `}
                  data-pinned={pinLabel ? "true" : "false"}
                  aria-label={pinLabel ? `Pinned: ${pinLabel}` : undefined}
                >
                {pinLabel && (
                  <div className="absolute top-0 left-0 z-10">
                    <span className="
                      inline-flex items-center justify-center gap-2 
                      bg-card/40 backdrop-blur-md 
                      text-white 
                      px-4 py-2 
                      text-[11px] uppercase tracking-widest font-bold 
                      rounded-none
                      pinned-badge-border-animation border-transparent
                      shadow-sm
                      transition-all duration-300
                      [text-shadow:0_1px_0_#000,-1px_0_0_#000,1px_0_0_#000,0_-1px_0_#000]
                    ">
                      <Pin className="h-3.5 w-3.5 stroke-[3px]" />
                      Pinned
                    </span>
                  </div>
                )}
                {/* Mouse-following gradient highlight */}
                <div
                  className="
                    pointer-events-none absolute inset-0
                    opacity-0 transition-opacity duration-300
                    group-hover:opacity-100
                    z-0
                  "
                  style={{
                    background: `radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), var(--shiny-color), transparent 80%)`,
                    opacity: 0.15, // Keep it subtle
                  }}
                />

                <CardHeader className="h-full w-full mb-4 p-0 relative">
                  <Image
                    src={imgSrc}
                    alt={`Cover image for ${a.title}`}
                    width={3840}
                    height={2160}
                    className="
                      bg-[#141414] mt-2
                      border border-muted-foreground/20
                      w-full h-auto rounded-lg
                      will-change-transform backface-visibility-hidden
                      transition-all duration-300
                      group-hover:brightness-110
                    "
                    loading="lazy"
                  />
                </CardHeader>

                <CardContent className="flex flex-col p-0 w-full flex-grow relative">
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-lg text-primary font-bold leading-tight flex-1">
                      <div className="flex flex-col gap-2">
                        {pinLabel && (
                          <span
                            className="
                              inline-flex items-center gap-1 w-fit
                              bg-amber-200/25 text-amber-700 dark:text-amber-300
                              ring-1 ring-amber-300/60 p-2 text-[11px] uppercase tracking-wide rounded-sm
                            "
                            title={pinLabel}
                            aria-label={`Pinned: ${pinLabel}`}
                          >
                            {pinLabel}
                          </span>
                        )}
                        <span className="break-words">{a.title}</span>
                      </div>
                    </div>

                    <MoveUpRight
                      className="
                        text-primary ml-2 inline-block h-5 w-5 shrink-0
                        transition-transform motion-reduce:transition-none
                        group-hover:-translate-y-1 group-hover:translate-x-1
                      "
                    />
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      📅 {formatDate(a.published_timestamp)}
                    </span>
                    <span className="flex items-center gap-1">
                      👍{a.positive_reactions_count}
                    </span>
                  </div>

                  <CardDescription className="text-muted-foreground leading-relaxed">
                    {a.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </TiltCard>
            </a>
          );
        })}
      </>

      <div className="mt-12 flex">
        <a
          className="inline-flex items-center font-medium leading-tight text-foreground hover:text-primary transition-colors group"
          href="https://dev.to/francistrdev"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="border-transparent pb-px transition hover:border-primary motion-reduce:transition-none">
            View All Posts
          </span>
          <MoveRight className="ml-1 inline-block h-5 w-5 shrink-0 -translate-y-px transition-transform group-hover:translate-x-2 group-focus-visible:translate-x-2 motion-reduce:transition-none" />
        </a>
      </div>
    </section>
  );
}
