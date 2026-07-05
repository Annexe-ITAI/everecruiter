import express from "express";
import { supabase } from "../services/supabase.js";
import { verifySession } from "../services/session.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No token" });

    const token = authHeader.split(" ")[1];
    const session = verifySession(token);

    const { character_id } = req.body || {};

    // fallback: apply using main character
    const { data: character } = await supabase
      .from("characters")
      .select("*")
      .eq("user_id", session.user_id)
      .eq("is_main", true)
      .single();

    if (!character) {
      return res.status(404).json({ error: "Character not found" });
    }

    // update recruitment status
    await supabase
      .from("characters")
      .update({
        recruitment_status: "applied",
        updated_at: new Date()
      })
      .eq("character_id", character.character_id);

    return res.json({ success: true });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Apply failed" });
  }
});

export default router;
