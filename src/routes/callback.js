import express from "express";
import axios from "axios";
import { supabase } from "../services/supabase.js";
import { createSession } from "../services/session.js";

const router = express.Router();

const TOOL_CORP_ID = 98012419;

router.get("/", async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).send("Missing code");
    }

    // 1. Exchange code for tokens
    const tokenResponse = await axios.post(
      "https://login.eveonline.com/v2/oauth/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code
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

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // 2. Verify character
    const verifyResponse = await axios.get(
      "https://login.eveonline.com/oauth/verify",
      {
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      }
    );

    const character_id = verifyResponse.data.CharacterID;
    const character_name = verifyResponse.data.CharacterName;

    // 3. Get corp info
    const charInfo = await axios.get(
      `https://esi.evetech.net/latest/characters/${character_id}/`
    );

    const corporation_id = charInfo.data.corporation_id;
    const alliance_id = charInfo.data.alliance_id || null;

    // 4. Create / find user
    let { data: existingCharacter } = await supabase
      .from("characters")
      .select("*")
      .eq("character_id", character_id)
      .single();

    let user_id;

    if (!existingCharacter) {
      const { data: newUser } = await supabase
        .from("users")
        .insert({
          recruitment_status:
            corporation_id === TOOL_CORP_ID
              ? "member"
              : "external_applicant"
        })
        .select()
        .single();

      user_id = newUser.id;

      await supabase.from("characters").insert({
        character_id,
        user_id,
        character_name,
        corporation_id,
        alliance_id,
        is_main: true
      });
    } else {
      user_id = existingCharacter.user_id;

      await supabase
        .from("characters")
        .update({
          character_name,
          corporation_id,
          alliance_id
        })
        .eq("character_id", character_id);
    }

    // 5. Store tokens
    await supabase.from("auth_tokens").upsert({
      character_id,
      access_token,
      refresh_token,
      token_expires_at: new Date(Date.now() + expires_in * 1000),
      updated_at: new Date()
    });

    // 6. Session
    const sessionToken = createSession({
      character_id,
      user_id
    });


    // 7. Redirect
    return res.redirect(
      `https://recruit.inextremis.co/dashboard?token=${sessionToken}`
    );

  } catch (err) {
    console.error("Callback error:", err.response?.data || err.message);
    return res.status(500).send("Authentication failed");
  }
});

export default router;
