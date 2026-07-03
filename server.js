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


// 2. CALLBACK FROM EVE
app.get("/auth/eve/callback", async (req, res) => {
  const { code } = req.query;

  try {
    // exchange code for token
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

    const { access_token, refresh_token } = tokenResponse.data;

    // decode character info from EVE
    const verify = await axios.get(
      "https://login.eveonline.com/oauth/verify",
      {
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      }
    );

    const character = verify.data;

    // TEMP: just log for now (we will add Supabase next step)
    console.log("CHARACTER LOGIN:", character);
    console.log("REFRESH TOKEN:", refresh_token);

    // redirect to frontend dashboard
    res.redirect("https://recruit.inextremis.co");

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send("EVE SSO Error");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
