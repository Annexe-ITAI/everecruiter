import express from "express";
import { supabase } from "../services/supabase.js";
import { verifySession } from "../services/session.js";
import { getCorporation, getAlliance, getPortrait, getCharacterRoles } from "../services/esi.js";

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

    // -----------------------------
    // USER
    // -----------------------------
    const { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("id", session.user_id)
      .single();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // -----------------------------
    // ALL CHARACTERS
    // -----------------------------
    const { data: characters } = await supabase
      .from("characters")
      .select("*")
      .eq("user_id", session.user_id);

    if (!characters || characters.length === 0) {
      return res.status(404).json({ error: "No characters found" });
    }

    // -----------------------------
    // ENRICH CHARACTERS
    // -----------------------------
      const enrichedCharacters = await Promise.all(
        characters.map(async (char) => {
          const corporation = await getCorporation(char.corporation_id);
          const alliance = await getAlliance(char.alliance_id);
      
          const roles = await getCharacterRoles(char.character_id);
          
          // normalize roles safely
          const normalizedRoles = (roles || []).map(r =>
            r.replace(/-/g, "_").replace(/\s/g, "_")
          );
          
          const isDirector = normalizedRoles.includes("Director");
          const isPersonnelManager =
            normalizedRoles.includes("Personnel_Manager");
          
          let roleLabel = "Member";
          
          if (isDirector && isPersonnelManager) {
            roleLabel = "Director / Personnel Manager";
          } else if (isDirector) {
            roleLabel = "Director";
          } else if (isPersonnelManager) {
            roleLabel = "Personnel Manager";
          }
          
          console.log("CHAR ROLES:", char.character_id, roles);
          console.log("ROLE LABEL:", roleLabel);
          
          const isMember = char.corporation_id === TOOL_CORP_ID;
      
          return {
            character_id: char.character_id,
            character_name: char.character_name,
            corporation_id: char.corporation_id,
            alliance_id: char.alliance_id,
            is_main: char.is_main,
      
            portrait_url: getPortrait(char.character_id, 128),
      
            corporation_name: corporation?.name || "Unknown",
            alliance_name: alliance?.name || null,
      
            is_member: isMember,
            recruitment_status: char.recruitment_status || "new",
      
            role_label: roleLabel
          };
        })
      );

    // -----------------------------
    // MAIN CHARACTER
    // -----------------------------
    const main_character =
      enrichedCharacters.find(c => c.is_main) || enrichedCharacters[0];

    return res.json({
      user,
      main_character,
      characters: enrichedCharacters,
      access: {
        isMember: main_character.is_member,
        role: main_character.is_member ? "member" : "external"
      }
    });

  } catch (err) {
    console.error(err);
    return res.status(401).json({ error: "Invalid session" });
  }
});

export default router;
