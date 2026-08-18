"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ElementType,
} from "react";
import { Button } from "@/components/ui/button";
import { Mail, MailOpen, Github, Linkedin } from "lucide-react";
import { FaDev } from "react-icons/fa";
import { SiLeetcode } from "react-icons/si";
import PokemonProfile from "./PokemonProfile";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NavItem = {
  name: string;
  href: string;
};

type Pokemon = {
  id: number;
  name: string;
  image?: string;
};

type SocialLink = {
  href: string;
  label: string;
  icon: ElementType;
};

// ---------------------------------------------------------------------------
// Hook: useActiveSection
// Tracks which <section id="..."> is currently in view so the side nav
// can highlight the matching link.
// ---------------------------------------------------------------------------

function useActiveSection() {
  const [activeSection, setActiveSection] = useState<string>("");

  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("section[id]")
    );
    const headerOffset = 96;
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        const scrollPos = window.scrollY + headerOffset + 1;
        let current = sections[0]?.id;

        for (const section of sections) {
          if (section.offsetTop <= scrollPos) {
            current = section.id;
          }
        }

        if (current) setActiveSection(current);
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return activeSection;
}

// ---------------------------------------------------------------------------
// Hook: usePokemonCatch
// Drives the "hover to charge, reveal a random Pokémon" profile picture.
// Refs mirror state so the mouse/transition handlers always read fresh
// values without needing to be re-created on every render.
// ---------------------------------------------------------------------------

function usePokemonCatch() {
  const [isCharging, setIsCharging] = useState(false);
  const [hasCompletedProgress, setHasCompletedProgress] = useState(false);
  const [hasEvolved, setHasEvolved] = useState(false);
  const [pokemon, setPokemon] = useState<Pokemon | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasCompletedProgressRef = useRef(false);
  const hasEvolvedRef = useRef(false);
  const pokemonRef = useRef<Pokemon | null>(null);
  const isLoadingRef = useRef(false);
  const hasRequestedRef = useRef(false);

  useEffect(() => {
    hasCompletedProgressRef.current = hasCompletedProgress;
  }, [hasCompletedProgress]);

  useEffect(() => {
    hasEvolvedRef.current = hasEvolved;
  }, [hasEvolved]);

  useEffect(() => {
    pokemonRef.current = pokemon;
  }, [pokemon]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  const requestFetch = useCallback(() => {
    if (
      hasEvolvedRef.current ||
      pokemonRef.current ||
      isLoadingRef.current ||
      hasRequestedRef.current
    ) {
      return;
    }
    hasRequestedRef.current = true;
    window.dispatchEvent(new CustomEvent("trigger-pokemon-fetch"));
  }, []);

  const reveal = useCallback((candidate?: Pokemon | null) => {
    const target = candidate ?? pokemonRef.current;
    if (!target || hasEvolvedRef.current) return;

    setPokemon(target);
    setHasCompletedProgress(true);
    setHasEvolved(true);
    setIsCharging(false);
    setIsLoading(false);
    setError(null);

    pokemonRef.current = target;
    hasCompletedProgressRef.current = true;
    hasEvolvedRef.current = true;
    isLoadingRef.current = false;
  }, []);

  const onMouseEnter = useCallback(() => {
    if (hasEvolvedRef.current) return;

    setError(null);
    setIsCharging(true);

    // Kick off the fetch as soon as hover starts so the Pokémon is
    // ready by the time the progress ring finishes charging.
    requestFetch();
  }, [requestFetch]);

  const onMouseLeave = useCallback(() => {
    // Once progress has completed, let the reveal flow finish on its own.
    if (hasEvolvedRef.current || hasCompletedProgressRef.current) return;

    setIsCharging(false);
    setHasCompletedProgress(false);
  }, []);

  const onFetchResult = useCallback(
    (result: Pokemon | null, loading: boolean, fetchError: string | null) => {
      setIsLoading(loading);
      setError(fetchError);

      if (fetchError) {
        hasRequestedRef.current = false;
      }

      if (result) {
        setPokemon(result);
        pokemonRef.current = result;
        hasRequestedRef.current = false;

        // If the progress ring already finished charging, reveal as soon
        // as the data arrives. Otherwise `reveal` runs from
        // `onTransitionEnd` once the ring completes.
        if (hasCompletedProgressRef.current && !hasEvolvedRef.current) {
          reveal(result);
        }
      }
    },
    [reveal]
  );

  const onTransitionEnd = useCallback(
    (event: React.TransitionEvent<HTMLDivElement>) => {
      if (event.currentTarget !== event.target) return;
      if (
        event.propertyName !== "--profile-border-progress" ||
        hasEvolvedRef.current ||
        !isCharging
      ) {
        return;
      }

      setHasCompletedProgress(true);
      hasCompletedProgressRef.current = true;

      if (pokemonRef.current) {
        reveal(pokemonRef.current);
      } else {
        requestFetch();
      }
    },
    [isCharging, requestFetch, reveal]
  );

  return {
    isCharging,
    hasEvolved,
    pokemon,
    isLoading,
    error,
    handlers: { onMouseEnter, onMouseLeave, onTransitionEnd, onFetchResult },
  };
}

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const NAV_ITEMS: NavItem[] = [
  { name: "Skills", href: "#skills" },
  { name: "Projects", href: "#projects" },
  { name: "Experiences", href: "#experiences" },
  { name: "Blog", href: "#blog" },
];

const SOCIAL_LINKS: SocialLink[] = [
  { href: "https://github.com/FrancisTRdev", label: "GitHub", icon: Github },
  {
    href: "https://linkedin.com/in/francistran6832",
    label: "LinkedIn",
    icon: Linkedin,
  },
  { href: "https://dev.to/francistrdev", label: "Dev.to", icon: FaDev },
  {
    href: "https://leetcode.com/u/FrancisTRdev/",
    label: "LeetCode",
    icon: SiLeetcode,
  },
];

const EMAIL_HREF = "mailto:xst-tran6832@stthomas.edu";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Nav({
  showPicker,
  setShowPicker,
}: {
  showPicker: boolean;
  setShowPicker: (val: boolean) => void;
}) {
  const activeSection = useActiveSection();
  const {
    isCharging,
    hasEvolved,
    pokemon,
    isLoading,
    error,
    handlers,
  } = usePokemonCatch();

  const underlineOnRevealClass = hasEvolved
    ? "bg-[linear-gradient(to_right,var(--shiny-color),var(--shiny-color))] bg-left-bottom bg-no-repeat bg-[length:100%_2px] drop-shadow-[0_0_6px_var(--shiny-color)] transition-[background-size,filter] duration-700 ease-out"
    : "bg-[linear-gradient(to_right,var(--shiny-color),var(--shiny-color))] bg-left-bottom bg-no-repeat bg-[length:0%_2px] transition-[background-size,filter] duration-700 ease-out";

  const profileImageSrc = hasEvolved
    ? pokemon?.image || "/GreatBall.png"
    : "/GreatBall.png";

  const profileImageAlt =
    hasEvolved && pokemon
      ? `Random Pokémon revealed: ${pokemon.name}`
      : "Poké Ball. Hover until the progress bar fills to reveal a random Pokémon.";

  const getNavItemClasses = (href: string) => {
    const isActive = activeSection === href.substring(1);

    return {
      linkClass: isActive ? "active" : "",
      indicatorClass: `nav-indicator mr-4 h-px w-8 bg-slate-600 transition-all ${isActive
          ? "active w-16 bg-foreground h-2"
          : "group-hover:w-16 group-hover:bg-foreground group-hover:h-px"
        }`,
      textClass: `nav-text text-xs font-bold uppercase tracking-widest ${isActive
          ? "text-foreground"
          : "text-slate-500 group-hover:text-foreground"
        }`,
    };
  };

  return (
    <header className="lg:sticky lg:top-0 lg:flex lg:max-h-screen lg:w-1/2 lg:flex-col lg:justify-between lg:py-20 flex flex-col lg:gap-4">
      <div className="flex flex-col gap-4 lg:pr-20 mt-2 px-6 lg:px-0 items-center lg:items-start text-center lg:text-start">
        <div className="flex w-full flex-col-reverse items-center justify-center gap-4 sm:w-auto lg:flex-row sm:gap-5 lg:justify-start">
          <h1 className="text-center text-5xl font-bold leading-tight drop-shadow-[0_0_15px_rgba(0,204,255,0.5)] sm:text-4xl lg:text-start">
            Francis Tran
          </h1>

          <div className="profile-catch-wrapper">
            <div
              className={`profile-image-ring h-10 w-10 lg:h-[3.25rem] lg:w-[3.25rem] ${isCharging ? "profile-image-ring-charging" : ""
                } ${hasEvolved ? "profile-image-ring-evolved" : ""}`}
              aria-label={profileImageAlt}
              onMouseEnter={handlers.onMouseEnter}
              onMouseLeave={handlers.onMouseLeave}
              onTransitionEnd={handlers.onTransitionEnd}
            >
              <img
                src={profileImageSrc}
                alt={profileImageAlt}
                className={`profile-image ${hasEvolved ? "profile-image-pokemon" : "profile-image-pokeball"
                  }`}
                draggable={false}
              />

              {!hasEvolved && isLoading && (
                <span className="profile-loading-dot" aria-hidden="true" />
              )}
            </div>

            {hasEvolved && pokemon && (
              <span className="profile-catch-label">
                #{pokemon.id} {pokemon.name}
              </span>
            )}

            {!hasEvolved && error && (
              <span className="profile-catch-error">{error}</span>
            )}
          </div>

          <PokemonProfile
            hasProfileEvolved={hasEvolved}
            onFetchPokemon={handlers.onFetchResult}
          />
        </div>

        <h2 className="text-2xl shiny drop-shadow-[0_0_10px_rgba(206,245,255,0.6)] flex items-center gap-3 text-center lg:text-start">
          <span className="custom-cursor">Full-Stack Developer</span>
        </h2>

        <p className="text-md text-muted-foreground text-center lg:text-start">
          Software Engineering student with{" "}
          <span className={underlineOnRevealClass}>
            4+ years of experience
          </span>
          . Open-source{" "}
          <span className={underlineOnRevealClass}>
            contributor on Forem (dev.to)
          </span>
          , a platform supporting a community of{" "}
          <span className={underlineOnRevealClass}>4M+ developers</span> and
          backed by organizations such as{" "}
          <span className={underlineOnRevealClass}>Google and GitHub</span>.
        </p>

        <ul className="flex flex-wrap gap-4 mt-4 justify-center lg:justify-start">
          <li>
            <a href={EMAIL_HREF} target="_blank" rel="noopener noreferrer">
              <Button
                variant="outline"
                size="icon"
                className="relative group flex items-center justify-center overflow-hidden"
                aria-label="Email Francis Tran"
              >
                <div className="relative h-[1.2rem] w-[1.2rem] flex items-center justify-center">
                  <Mail className="h-[1.2rem] w-[1.2rem] transition-all duration-300 opacity-100 group-hover:opacity-0 pointer-events-none" />
                  <MailOpen className="h-[1.2rem] w-[1.2rem] absolute transition-all duration-300 opacity-0 group-hover:opacity-100 pointer-events-none" />
                </div>
              </Button>
            </a>
          </li>

          {SOCIAL_LINKS.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <a href={href} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="icon" aria-label={label}>
                  <Icon className="h-[1.2rem] w-[1.2rem]" />
                </Button>
              </a>
            </li>
          ))}

          <li>
            <div
              onClick={() => setShowPicker(!showPicker)}
              aria-label="Toggle holiday theme selector"
              className="group cursor-pointer"
            >
              <Button
                variant="outline"
                size="icon"
                className="relative group flex items-center justify-center overflow-visible"
              >
                <div
                  className={`cube-button ${showPicker ? "opened" : ""}`}
                  aria-hidden="true"
                >
                  <div className="cube">
                    <span className="face front">🎉</span>
                    <span className="face back">🎄</span>
                    <span className="face left">🍀</span>
                    <span className="face top">🐣</span>
                    <span className="face bottom">❤️</span>
                    <span className="face right">🎃</span>
                  </div>
                </div>
              </Button>
            </div>
          </li>
        </ul>

        <nav className="lg:block hidden mt-4">
          <ul className="flex flex-col w-max text-start gap-6 uppercase text-xs font-medium">
            {NAV_ITEMS.map((item) => {
              const { linkClass, indicatorClass, textClass } =
                getNavItemClasses(item.href);

              return (
                <li key={item.name} className="group">
                  <a href={item.href} className={`py-3 ${linkClass}`}>
                    <span className={indicatorClass}></span>
                    <span className={textClass}>{item.name}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
