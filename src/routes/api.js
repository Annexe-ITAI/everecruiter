import express from "express";
import { supabase } from "../services/supabase.js";

const router = express.Router();

// TEMP: simple identity lookup (we improve later with sessions)
router.get("/me", async (req, res) => {
  try {
    // For now we identify user by character_id passed in query
    const { character_id } = req.query;

    if (!character_id) {
      return res.status(400).json({ error: "Missing character_id" });
    }

    // Get character
    const { data: character } = await supabase
      .from("characters")
      .select("*")
      .eq("character_id", character_id)
      .single();

    if (!character) {
      return res.status(404).json({ error: "Character not found" });
    }

    // Get user
    const { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("id", character.user_id)
      .single();

    return res.json({
      user,
      character
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
