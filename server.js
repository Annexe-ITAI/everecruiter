const { createClient } = require("@supabase/supabase-js");
const express = require("express");
const axios = require("axios");
const crypto = require("crypto");

const app = express();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const {
  EVE_CLIENT_ID,
  EVE_CLIENT_SECRET,
  EVE_CALLBACK_URL,
  FRONTEND_URL
} = process.env;

// =========================
// HEALTH CHECK
// =========================

app.get("/", (req, res) => {
  res.send("EVE Recruiter API Running");
});

// =========================
// LOGIN
// =========================

app.get("/auth/eve/login", (req, res) => {
  const scopes = [
    "publicData",
    "esi-location.read_location.v1",
    "esi-mail.read_mail.v1",
    "esi-wallet.read_character_wallet.v1",
    "esi-clones.read_clones.v1",
    "esi-characters.read_contacts.v1",
    "esi-assets.read_assets.v1",
    "esi-characters.read_chat_channels.v1",
    "esi-characters.read_standings.v1",
    "esi-industry.read_character_jobs.v1",
    "esi-markets.read_character_orders.v1",
    "esi-characters.read_corporation_roles.v1",
    "esi-contracts.read_character_contracts.v1",
    "esi-clones.read_implants.v1",
    "esi-corporations.read_contacts.v1",
    "esi-corporations.read_standings.v1",
    "esi-characters.read_titles.v1"
  ].join(" ");

  const url =
    "https://login.eveonline.com/v2/oauth/authorize/" +
    `?response_type=code` +
    `&redirect_uri=${encodeURIComponent(EVE_CALLBACK_URL)}` +
    `&client_id=${EVE_CLIENT_ID}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&state=secure_random_state`;

  res.redirect(url);
});

// =========================
// CALLBACK
// =========================

app.get("/auth/eve/callback", async (req, res) => {
  const { code } = req.query;

  try {
    const tokenResponse = await axios.post(
      "https://login.eveonline.com/v2/oauth/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code: code
      }),
      {
        auth: {
          username: EVE_CLIENT_ID,
          password: EVE_CLIENT_SECRET
        }
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    const verify = await axios.get(
      "https://login.eveonline.com/oauth/verify",
      {
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      }
    );

    const character = verify.data;

    const character_id = character.CharacterID;
    const character_name = character.CharacterName;

    let { data: existingChar } = await supabase
      .from("characters")
      .select("*")
      .eq("character_id", character_id)
      .single();

    let user_id;

    if (!existingChar) {
      let { data: anyUser } = await supabase
        .from("users")
        .select("*")
        .limit(1)
        .single();

      if (!anyUser) {
        const { data: newUser } = await supabase
          .from("users")
          .insert({})
          .select()
          .single();

        user_id = newUser.id;
      } else {
        user_id = anyUser.id;
      }

      let { data: mainCharCheck } = await supabase
        .from("characters")
        .select("*")
        .eq("user_id", user_id);

      const is_main = !mainCharCheck || mainCharCheck.length === 0;

      await supabase.from("characters").insert({
        character_id,
        user_id,
        character_name,
        corporation_id: character.CorporationID,
        alliance_id: character.AllianceID || null,
        is_main
      });
    } else {
      user_id = existingChar.user_id;

      await supabase
        .from("characters")
        .update({
          character_name,
          corporation_id: character.CorporationID,
          alliance_id: character.AllianceID || null
        })
        .eq("character_id", character_id);
    }

    await supabase.from("auth_tokens").upsert({
      character_id,
      access_token,
      refresh_token,
      token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString()
    });

    const session_id = crypto.randomUUID();

    await supabase.from("sessions").insert({
      session_id,
      user_id
    });

    res.redirect(`${FRONTEND_URL}/dashboard?session=${session_id}`);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send("EVE Callback Error");
  }
});

// =========================
// API ME
// =========================

app.get("/api/me", async (req, res) => {
  try {
    const session_id = req.query.session;

    if (!session_id) {
      return res.status(401).send("No session");
    }

    // 1. SESSION (SAFE)
    const { data: sessions } = await supabase
      .from("sessions")
      .select("*")
      .eq("session_id", session_id);

    const session = sessions?.[0];

    if (!session) {
      return res.status(401).send("Invalid session");
    }

    // 2. CHARACTERS (SAFE)
    const { data: characters } = await supabase
      .from("characters")
      .select("*")
      .eq("user_id", session.user_id);

    if (!characters || characters.length === 0) {
      return res.status(404).send("No characters found");
    }

    const mainChar =
      characters.find(c => c.is_main) || characters[0];

    const alts = characters;

    // 3. RESPONSE
    res.json({
      main_character: {
        character_id: mainChar.character_id,
        name: mainChar.character_name,
        corporation: mainChar.corporation_id,
        alliance: mainChar.alliance_id
      },
      alts: alts.map(c => ({
        name: c.character_name,
        corporation: c.corporation_id
      })),
      discord: {
        linked: false
      }
    });

  } catch (err) {
    console.error("API /me error:", err);
    res.status(500).send("Server error");
  }
});

// =========================
// START SERVER
// =========================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
