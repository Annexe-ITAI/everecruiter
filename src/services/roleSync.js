import { supabase } from "./supabase.js";
import { getValidAccessToken } from "./eveAuth.js";

export async function syncCharacterRoles(character_id) {
  if (!character_id) return;

  const accessToken = await getValidAccessToken(character_id);
  if (!accessToken) return;

  const res = await fetch(
    `https://esi.evetech.net/latest/characters/${character_id}/roles/`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!res.ok) return;

  const data = await res.json();
  const roles = data.roles || [];

  await supabase.from("character_roles").upsert({
    character_id,
    roles,
    updated_at: new Date()
  });

  return roles;
}
