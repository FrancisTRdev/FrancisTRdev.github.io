"use client";

import { useCallback, useEffect, useRef } from "react";
import Image from "next/image";

type RandomPokemon = {
  id: number;
  name: string;
  image: string;
};

function formatPokemonName(name: string) {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getRandomPokemonId() {
  const maxPokemonId = 1025;
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return (array[0] % maxPokemonId) + 1;
  }
  return Math.floor(Math.random() * maxPokemonId) + 1;
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

  hasProfileEvolvedRef.current = hasProfileEvolved;

  const fetchRandomPokemon = useCallback(async () => {
    if (hasProfileEvolvedRef.current || randomPokemonRef.current) return;

    try {
      const randomId = getRandomPokemonId();
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${randomId}`);

      if (!response.ok) throw new Error("Failed to catch Pokémon.");

      const data = await response.json();
      const pokemonImage =
        data.sprites?.other?.["official-artwork"]?.front_default ||
        data.sprites?.other?.home?.front_default ||
        data.sprites?.front_default;

      if (!pokemonImage) throw new Error("This Pokémon has no available sprite.");

      const pokemon = {
        id: data.id,
        name: formatPokemonName(data.name),
        image: pokemonImage,
      };
      randomPokemonRef.current = pokemon;
      onFetchPokemon(pokemon, false, null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An error occurred";
      onFetchPokemon(null, false, msg);
    }
  }, [onFetchPokemon]);

  useEffect(() => {
    const handleTrigger = () => {
      fetchRandomPokemon();
    };
    window.addEventListener('trigger-pokemon-fetch', handleTrigger);
    return () => window.removeEventListener('trigger-pokemon-fetch', handleTrigger);
  }, [fetchRandomPokemon]);

  return null;
}
