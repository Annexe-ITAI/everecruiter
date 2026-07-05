import { supabase } from "./supabase.js";

// -------------------------
// CORPORATION CACHE
// -------------------------
export async function getCorporation(corporation_id) {
  if (!corporation_id) return null;

  // 1. Check cache
  const { data: cached } = await supabase
    .from("corporations")
    .select("*")
    .eq("corporation_id", corporation_id)
    .single();

  if (cached) return cached;

  // 2. Fetch from ESI
  const res = await fetch(
    `https://esi.evetech.net/latest/corporations/${corporation_id}/`
  );

  if (!res.ok) return null;

  const data = await res.json();

  // 3. Store in DB
  await supabase.from("corporations").insert({
    corporation_id,
    name: data.name,
    ticker: data.ticker || null,
    alliance_id: data.alliance_id || null,
    member_count: data.member_count || null,
    updated_at: new Date()
  });

  return {
    corporation_id,
    name: data.name,
    ticker: data.ticker || null,
    alliance_id: data.alliance_id || null,
    member_count: data.member_count || null
  };
}

// -------------------------
// ALLIANCE CACHE
// -------------------------
export async function getAlliance(alliance_id) {
  if (!alliance_id) return null;

  // 1. Check cache
  const { data: cached } = await supabase
    .from("alliances")
    .select("*")
    .eq("alliance_id", alliance_id)
    .single();

  if (cached) return cached;

  // 2. Fetch from ESI
  const res = await fetch(
    `https://esi.evetech.net/latest/alliances/${alliance_id}/`
  );

  if (!res.ok) return null;

  const data = await res.json();

  // 3. Store in DB
  await supabase.from("alliances").insert({
    alliance_id,
    name: data.name,
    ticker: data.ticker || null,
    updated_at: new Date()
  });

  return {
    alliance_id,
    name: data.name,
    ticker: data.ticker || null
  };
}

// -------------------------
// CHARACTER PORTRAIT
// -------------------------
export function getPortrait(character_id, size = 256) {
  if (!character_id) return null;

  return `https://images.evetech.net/characters/${character_id}/portrait?size=${size}`;
}
  // -----------------------
  // CORPORATION ROLES
  // -----------------------
  export async function getCharacterRoles(character_id) {
  if (!character_id) return [];

  const res = await fetch(
    `https://esi.evetech.net/latest/characters/${character_id}/roles/`
  );

  if (!res.ok) return [];

  const data = await res.json();
  return data.roles || [];
}
