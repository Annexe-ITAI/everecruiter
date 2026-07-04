import express from "express";
import { supabase } from "../services/supabase.js";
import { verifySession } from "../services/session.js";

const router = express.Router();

router.get("/me", async (req, res) => {
  try {
    const token = req.cookies.session;

    if (!token) {
      return res.status(401).json({ error: "No session" });
    }

    const session = verifySession(token);

    const { data: character } = await supabase
      .from("characters")
      .select("*")
      .eq("character_id", session.character_id)
      .single();

    const { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("id", session.user_id)
      .single();

    return res.json({ user, character });

  } catch (err) {
    return res.status(401).json({ error: "Invalid session" });
  }
});

export default router;
