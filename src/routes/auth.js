import express from "express";
import crypto from "crypto";

const router = express.Router();

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

router.get("/login", (req, res) => {
  const clientId = process.env.EVE_CLIENT_ID;

  const redirectUri =
    "https://everecruiter-api.onrender.com/auth/eve/callback";

  const state = crypto.randomUUID();

  const url =
    "https://login.eveonline.com/v2/oauth/authorize/?" +
    new URLSearchParams({
      response_type: "code",
      redirect_uri: redirectUri,
      client_id: clientId,
      scope: scopes,
      state: state
    });

  res.redirect(url.toString());
});

export default router;
