"use client";

import { useCallback, useEffect, useRef } from "react";

type RandomPokemon = {
  id: number;
  name: string;
  image: string;
};

const MAX_POKEMON_ID = 1025;
const pokemonCache = new Map<number, RandomPokemon>();
let pokemonRequest: Promise<RandomPokemon> | null = null;

function formatPokemonName(name: string) {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getRandomPokemonId() {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return (array[0] % MAX_POKEMON_ID) + 1;
  }
  return Math.floor(Math.random() * MAX_POKEMON_ID) + 1;
}

async function preloadPokemonImage(imageUrl: string) {
  const image = new window.Image();
  image.src = imageUrl;

  if (image.decode) {
    await image.decode();
    return;
  }

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("This Pokémon sprite could not be loaded."));
  });
}

async function fetchPokemon(signal: AbortSignal) {
  const randomId = getRandomPokemonId();
  const cachedPokemon = pokemonCache.get(randomId);
  if (cachedPokemon) return cachedPokemon;

  const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${randomId}`, {
    signal,
    cache: "force-cache",
  });

  if (!response.ok) throw new Error("Failed to catch Pokémon.");

  const data = await response.json();
  const pokemonImage =
    data.sprites?.other?.["official-artwork"]?.front_default ||
    data.sprites?.other?.home?.front_default ||
    data.sprites?.front_default;

  if (!pokemonImage) throw new Error("This Pokémon has no available sprite.");

  await preloadPokemonImage(pokemonImage);

  const pokemon = {
    id: data.id,
    name: formatPokemonName(data.name),
    image: pokemonImage,
  };
  pokemonCache.set(randomId, pokemon);
  return pokemon;
}

export default function PokemonProfile({
  hasProfileEvolved,
  onFetchPokemon,
}: {
  hasProfileEvolved: boolean;
  onFetchPokemon: (pokemon: RandomPokemon | null, loading: boolean, error: string | null) => void;
}) {
  const randomPokemonRef = useRef<RandomPokemon | null>(null);
  const hasProfileEvolvedRef = useRef(hasProfileEvolved);
  const abortControllerRef = useRef<AbortController | null>(null);

  hasProfileEvolvedRef.current = hasProfileEvolved;

  const fetchRandomPokemon = useCallback(async () => {
    if (hasProfileEvolvedRef.current || randomPokemonRef.current) return;

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    onFetchPokemon(null, true, null);

    try {
      const request = pokemonRequest ?? fetchPokemon(abortController.signal);
      pokemonRequest = request;
      const pokemon = await request;
      pokemonRequest = null;
      randomPokemonRef.current = pokemon;
      onFetchPokemon(pokemon, false, null);
    } catch (err) {
      pokemonRequest = null;
      if (err instanceof DOMException && err.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "An error occurred";
      onFetchPokemon(null, false, msg);
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, [onFetchPokemon]);

  useEffect(() => {
    const handleTrigger = () => {
      fetchRandomPokemon();
    };
    window.addEventListener('trigger-pokemon-fetch', handleTrigger);
    return () => {
      window.removeEventListener("trigger-pokemon-fetch", handleTrigger);
      abortControllerRef.current?.abort();
    };
  }, [fetchRandomPokemon]);

  return null;
}
