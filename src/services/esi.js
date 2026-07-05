import { supabase } from "./supabase.js";

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

// -------------------------
// 🔥 FIXED ROLE FETCH (CRITICAL)
// -------------------------
export async function getCharacterRoles(character_id) {
  if (!character_id) return [];

  const { data } = await supabase
    .from("auth_tokens")
    .select("access_token, token_expires_at")
    .eq("character_id", character_id)
    .single();

  if (!data?.access_token) return [];

  const res = await fetch(
    `https://esi.evetech.net/latest/characters/${character_id}/roles/`,
    {
      headers: {
        Authorization: `Bearer ${data.access_token}`
      }
    }
  );

  if (!res.ok) return [];

  const json = await res.json();

  return json.roles || [];
}
