// FILE: lib/pokemonApi.ts
// Pokémon TCG API integration — https://api.pokemontcg.io/v2/cards
// Free tier: 1000 req/day, no key required. With key (env POKEMON_TCG_KEY): unlimited.
// We cache results in memory (server-side) and return static fallback if API fails.

export interface PokemonCard {
    id:       string;
    name:     string;
    supertype:string;
    subtypes: string[];
    hp?:      string;
    types?:   string[];
    rarity?:  string;
    images:   { small: string; large: string };
    set:      { name: string; series: string };
    number:   string;
    attacks?: Array<{ name: string; damage: string; cost: string[] }>;
    weaknesses?: Array<{ type: string; value: string }>;
    // Abraxas-injected fields
    priceSol?:   number;
    circuitScore?: number;
    stakeApy?:   number;
  }
  
  export interface PokemonApiResponse {
    data: PokemonCard[];
    totalCount: number;
  }
  
  // Curated IDs of iconic cards that always look great
  const FEATURED_IDS = [
    "base1-4",   // Charizard 1st Ed
    "base1-58",  // Pikachu
    "base1-2",   // Blastoise
    "base1-15",  // Venusaur
    "xy1-54",    // Charizard EX
    "sm115-1",   // Lurantis GX
    "swsh35-1",  // Umbreon VMAX
    "swsh12pt5-GG36", // Lugia V
  ];
  
  // In-memory cache keyed by query
  const cache = new Map<string, { data: PokemonApiResponse; ts: number }>();
  const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  
  export async function fetchPokemonCards(params: {
    query?: string;
    ids?:   string[];
    page?:  number;
    pageSize?: number;
  }): Promise<PokemonApiResponse> {
    const { query, ids, page = 1, pageSize = 12 } = params;
    const q = ids?.length
      ? `id:${ids.join(" OR id:")}`
      : query
      ? `name:${query}*`
      : `rarity:"Rare Holo*" OR rarity:"Rare Ultra*" OR rarity:Illustration`;
  
    const cacheKey = `${q}-${page}-${pageSize}`;
    const cached   = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;
  
    const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&page=${page}&pageSize=${pageSize}&orderBy=-set.releaseDate`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (process.env.POKEMON_TCG_KEY) {
      headers["X-Api-Key"] = process.env.POKEMON_TCG_KEY;
    }
  
    try {
      const res  = await fetch(url, { headers, next: { revalidate: 600 } });
      if (!res.ok) throw new Error(`Pokemon TCG API ${res.status}`);
      const json: PokemonApiResponse = await res.json();
  
      // Inject Abraxas pricing data
      json.data = json.data.map((card, i) => ({
        ...card,
        priceSol:     parseFloat((10 + Math.abs(Math.sin(i * 9301)) * 140).toFixed(1)),
        circuitScore: Math.floor(10 + Math.abs(Math.sin(i * 4729)) * 60),
        stakeApy:     parseFloat((8 + Math.abs(Math.sin(i * 2137)) * 14).toFixed(1)),
      }));
  
      cache.set(cacheKey, { data: json, ts: Date.now() });
      return json;
    } catch {
      // Static fallback — always works
      return buildFallback(pageSize);
    }
  }
  
  export async function fetchFeaturedCards(): Promise<PokemonCard[]> {
    const res = await fetchPokemonCards({ ids: FEATURED_IDS, pageSize: 8 });
    return res.data;
  }
  
  function buildFallback(count: number): PokemonApiResponse {
    const FALLBACK: Array<Omit<PokemonCard, "priceSol" | "circuitScore" | "stakeApy">> = [
      { id:"f-1", name:"Charizard",       supertype:"Pokémon", subtypes:["Stage 2"],  hp:"120", types:["Fire"],     rarity:"Rare Holo",  images:{ small:"https://images.pokemontcg.io/base1/4_hires.png", large:"https://images.pokemontcg.io/base1/4_hires.png" }, set:{ name:"Base Set", series:"Base" }, number:"4" },
      { id:"f-2", name:"Pikachu",          supertype:"Pokémon", subtypes:["Basic"],    hp:"60",  types:["Lightning"], rarity:"Common",     images:{ small:"https://images.pokemontcg.io/base1/58_hires.png", large:"https://images.pokemontcg.io/base1/58_hires.png" }, set:{ name:"Base Set", series:"Base" }, number:"58" },
      { id:"f-3", name:"Blastoise",        supertype:"Pokémon", subtypes:["Stage 2"],  hp:"100", types:["Water"],    rarity:"Rare Holo",  images:{ small:"https://images.pokemontcg.io/base1/2_hires.png", large:"https://images.pokemontcg.io/base1/2_hires.png" }, set:{ name:"Base Set", series:"Base" }, number:"2" },
      { id:"f-4", name:"Mewtwo",           supertype:"Pokémon", subtypes:["Basic"],    hp:"60",  types:["Psychic"],  rarity:"Rare Holo",  images:{ small:"https://images.pokemontcg.io/base1/10_hires.png", large:"https://images.pokemontcg.io/base1/10_hires.png" }, set:{ name:"Base Set", series:"Base" }, number:"10" },
      { id:"f-5", name:"Venusaur",         supertype:"Pokémon", subtypes:["Stage 2"],  hp:"100", types:["Grass"],    rarity:"Rare Holo",  images:{ small:"https://images.pokemontcg.io/base1/15_hires.png", large:"https://images.pokemontcg.io/base1/15_hires.png" }, set:{ name:"Base Set", series:"Base" }, number:"15" },
      { id:"f-6", name:"Gengar",           supertype:"Pokémon", subtypes:["Stage 2"],  hp:"80",  types:["Psychic"],  rarity:"Rare Holo",  images:{ small:"https://images.pokemontcg.io/fossil/5_hires.png", large:"https://images.pokemontcg.io/fossil/5_hires.png" }, set:{ name:"Fossil", series:"Base" }, number:"5" },
    ];
    const data = Array.from({ length: count }, (_, i) => ({
      ...FALLBACK[i % FALLBACK.length],
      id: `f-${i}`,
      priceSol:     parseFloat((10 + Math.abs(Math.sin(i * 9301)) * 140).toFixed(1)),
      circuitScore: Math.floor(10 + Math.abs(Math.sin(i * 4729)) * 60),
      stakeApy:     parseFloat((8 + Math.abs(Math.sin(i * 2137)) * 14).toFixed(1)),
    }));
    return { data, totalCount: count };
  }