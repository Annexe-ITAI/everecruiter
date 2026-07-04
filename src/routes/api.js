import express from "express";
import { supabase } from "../services/supabase.js";
import { verifySession } from "../services/session.js";

const router = express.Router();

const TOOL_CORP_ID = 98012419;

router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "No token" });
    }

    const token = authHeader.split(" ")[1];
    const session = verifySession(token);

    const { data: character } = await supabase
      .from("characters")
      .select("*")
      .eq("character_id", session.character_id)
      .single();
    
    const corpRes = await fetch(
      `https://esi.evetech.net/latest/corporations/${character.corporation_id}/`
    );
    const corpData = await corpRes.json();

    let allianceData = null;

    if (character.alliance_id) {
      const allianceRes = await fetch(
        `https://esi.evetech.net/latest/alliances/${character.alliance_id}/`
      );
      allianceData = await allianceRes.json();
    }

    const portrait_url = `https://images.evetech.net/characters/${character.character_id}/portrait?size=256`;
    
    const { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("id", session.user_id)
      .single();

    if (!character || !user) {
      return res.status(404).json({ error: "Not found" });
    }

    const isMember = character.corporation_id === TOOL_CORP_ID;

    return res.json({
      user,
      character,
      access: {
        isMember,
        role: isMember ? "member" : "external"
      },
      meta: {
        corporation_name: corpData.name,
        alliance_name: allianceData?.name || null,
        portrait_url
      }
    });

  } catch (err) {
    return res.status(401).json({ error: "Invalid session" });
  }
});

export default router;
