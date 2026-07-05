import axios from "axios";
import { supabase } from "./supabase.js";

const TOKEN_URL = "https://login.eveonline.com/v2/oauth/token";

export async function getValidAccessToken(character_id) {
  const { data: tokenData } = await supabase
    .from("auth_tokens")
    .select("*")
    .eq("character_id", character_id)
    .single();

  if (!tokenData) return null;

  const now = Date.now();
  const expiresAt = new Date(tokenData.token_expires_at).getTime();

  // If token still valid → use it
  if (expiresAt > now + 60_000) {
    return tokenData.access_token;
  }

  // Otherwise refresh it
  const refreshed = await refreshAccessToken(tokenData.refresh_token);

  if (!refreshed) return null;

  await supabase
    .from("auth_tokens")
    .update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token || tokenData.refresh_token,
      token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000),
      updated_at: new Date()
    })
    .eq("character_id", character_id);

  return refreshed.access_token;
}

async function refreshAccessToken(refresh_token) {
  try {
    const res = await axios.post(
      TOKEN_URL,
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token
      }),
      {
        auth: {
          username: process.env.EVE_CLIENT_ID,
          password: process.env.EVE_CLIENT_SECRET
        },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    return res.data;
  } catch (err) {
    console.error("EVE token refresh failed:", err.response?.data || err.message);
    return null;
  }
}
