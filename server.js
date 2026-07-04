const express = require("express");
const axios = require("axios");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(cors({
  origin: "https://recruit.inextremis.co",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.options("*", cors());

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

// =============================
// HEALTH
// =============================
app.get("/", (req, res) => {
  res.send("EVE Recruiter API Running");
});

// =============================
// FULL ESI SCOPES (RESTORED)
// =============================
const SCOPES = [
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

// =============================
// LOGIN
// =============================
app.get("/auth/eve/login", (req, res) => {
  const url =
    "https://login.eveonline.com/v2/oauth/authorize/" +
    `?response_type=code` +
    `&redirect_uri=${encodeURIComponent(EVE_CALLBACK_URL)}` +
    `&client_id=${EVE_CLIENT_ID}` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&state=secure_random_state`;

  res.redirect(url);
});

// =============================
// CALLBACK
// =============================
app.get("/auth/eve/callback", async (req, res) => {
  const { code } = req.query;

  try {
    const tokenRes = await axios.post(
      "https://login.eveonline.com/v2/oauth/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code
      }),
      {
        auth: {
          username: EVE_CLIENT_ID,
          password: EVE_CLIENT_SECRET
        }
      }
    );

    const { access_token, refresh_token, expires_in } = tokenRes.data;

    const verify = await axios.get(
      "https://login.eveonline.com/oauth/verify",
      {
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      }
    );

    const character = verify.data;

    const session_id = crypto.randomUUID();

    const { error } = await supabase.from("sessions").insert({
      session_id,
      user_id: character.CharacterID,
      created_at: new Date().toISOString()
    });

    if (error) {
      console.error("SUPABASE INSERT ERROR:", error);
      return res.status(500).send("Database insert failed");
    }

    return res.redirect(
      `${FRONTEND_URL}/dashboard?session=${session_id}`
    );

  } catch (err) {
    console.error(err.response?.data || err.message);
    return res.status(500).send("OAuth Error");
  }
});

// =============================
// API ME (FIXED)
// =============================
app.get("/api/me", async (req, res) => {
  try {
    const session = req.query.session || req.headers.authorization;

    if (!session) {
      return res.status(401).send("No session");
    }

    const { data } = await supabase
      .from("sessions")
      .select("*")
      .eq("session_id", session)
      .single();

    if (!data) {
      return res.status(401).send("Invalid session");
    }

    res.json({
      main_character: {
        name: data.character_name,
        character_id: data.character_id,
        corporation: "Unknown",
        alliance: null
      },
      alts: []
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// =============================
// START
// =============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
