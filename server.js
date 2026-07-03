const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const express = require("express");
const axios = require("axios");

const app = express();

const {
  EVE_CLIENT_ID,
  EVE_CLIENT_SECRET,
  EVE_CALLBACK_URL
} = process.env;

// basic health check
app.get("/", (req, res) => {
  res.send("EVE Recruiter API Running");
});


// 1. START LOGIN FLOW
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


app.get("/auth/eve/callback", async (req, res) => {
  const { code } = req.query;

  try {
    // =========================
    // 1. Exchange code for tokens
    // =========================
    const tokenResponse = await axios.post(
      "https://login.eveonline.com/v2/oauth/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code: code
      }),
      {
        auth: {
          username: process.env.EVE_CLIENT_ID,
          password: process.env.EVE_CLIENT_SECRET
        }
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // =========================
    // 2. Verify character
    // =========================
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

    // =========================
    // 3. Check if character exists
    // =========================
    let { data: existingChar } = await supabase
      .from("characters")
      .select("*")
      .eq("character_id", character_id)
      .single();

    let user_id;

    // =========================
    // 4. CREATE OR LINK USER
    // =========================
    if (!existingChar) {
      // check if any user exists
      let { data: anyUser } = await supabase
        .from("users")
        .select("*")
        .limit(1)
        .single();

      if (!anyUser) {
        // FIRST EVER USER
        const { data: newUser } = await supabase
          .from("users")
          .insert({})
          .select()
          .single();

        user_id = newUser.id;
      } else {
        user_id = anyUser.id;
      }

      // is this first character?
      let { data: mainCharCheck } = await supabase
        .from("characters")
        .select("*")
        .eq("user_id", user_id);

      const is_main = mainCharCheck.length === 0;

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

      // update corp changes
      await supabase
        .from("characters")
        .update({
          character_name,
          corporation_id: character.CorporationID,
          alliance_id: character.AllianceID || null
        })
        .eq("character_id", character_id);
    }

    // =========================
    // 5. Store tokens
    // =========================
    await supabase.from("auth_tokens").upsert({
      character_id,
      access_token,
      refresh_token,
      token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
      scopes: process.env.EVE_SCOPES
    });

    // =========================
    // 6. Log sync run
    // =========================
    await supabase.from("sync_runs").insert({
      character_id,
      started_at: new Date(),
      status: "login"
    });

    // =========================
    // 7. Redirect to frontend
    // =========================
    res.redirect("https://recruit.inextremis.co/dashboard.html");

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send("EVE Callback Error");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
