const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();

// =============================
// MIDDLEWARE
// =============================
app.use(cors({
  origin: "https://recruit.inextremis.co",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.options("*", cors());

// =============================
// SUPABASE
// =============================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// =============================
// ENV
// =============================
const {
  EVE_CLIENT_ID,
  EVE_CLIENT_SECRET,
  EVE_CALLBACK_URL,
  FRONTEND_URL
} = process.env;

// =============================
// HEALTH CHECK
// =============================
app.get("/", (req, res) => {
  res.send("EVE Recruiter API Running");
});

// =============================
// TEST ROUTE
// =============================
app.get("/ping", (req, res) => {
  console.log("PING HIT");
  res.send("pong");
});

// =============================
// START LOGIN FLOW
// =============================
app.get("/auth/eve/login", (req, res) => {
  const scopes = [
    "publicData",
    "esi-location.read_location.v1",
    "esi-mail.read_mail.v1"
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

// =============================
// CALLBACK
// =============================
app.get("/auth/eve/callback", async (req, res) => {
  const { code } = req.query;

  try {
    const tokenResponse = await axios.post(
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

    // store minimal session for now
    await supabase.from("sessions").upsert({
      character_id,
      access_token,
      refresh_token,
      expires_at: new Date(Date.now() + expires_in * 1000)
    });

    res.redirect(`${FRONTEND_URL}/dashboard`);

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send("OAuth Error");
  }
});

// =============================
// START SERVER
// =============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
