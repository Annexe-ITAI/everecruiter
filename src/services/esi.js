import { supabase } from "./supabase.js";
import { getValidAccessToken } from "./eveAuth.js";

// -------------------------
// CORPORATION CACHE
// -------------------------
export async function getCorporation(corporation_id) {
  if (!corporation_id) return null;

  const { data: cached } = await supabase
    .from("corporations")
    .select("*")
    .eq("corporation_id", corporation_id)
    .single();

  if (cached) return cached;

  const res = await fetch(
    `https://esi.evetech.net/latest/corporations/${corporation_id}/`
  );

  if (!res.ok) return null;

  const data = await res.json();

  await supabase.from("corporations").insert({
    corporation_id,
    name: data.name,
    ticker: data.ticker || null,
    alliance_id: data.alliance_id || null,
    member_count: data.member_count || null,
    updated_at: new Date()
  });

  return data;
}

// -------------------------
// ALLIANCE CACHE
// -------------------------
export async function getAlliance(alliance_id) {
  if (!alliance_id) return null;

  const { data: cached } = await supabase
    .from("alliances")
    .select("*")
    .eq("alliance_id", alliance_id)
    .single();

  if (cached) return cached;

  const res = await fetch(
    `https://esi.evetech.net/latest/alliances/${alliance_id}/`
  );

  if (!res.ok) return null;

  const data = await res.json();

  await supabase.from("alliances").insert({
    alliance_id,
    name: data.name,
    ticker: data.ticker || null,
    updated_at: new Date()
  });

  return data;
}

// -------------------------
// PORTRAIT
// -------------------------
export function getPortrait(character_id, size = 256) {
  return `https://images.evetech.net/characters/${character_id}/portrait?size=${size}`;
}

