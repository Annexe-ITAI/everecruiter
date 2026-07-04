import express from "express";
import axios from "axios";

const router = express.Router();

router.get("/eve", async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).send("Missing code");
    }

    // 1. Exchange code for tokens
    const tokenResponse = await axios.post(
      "https://login.eveonline.com/v2/oauth/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code: code
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

    const character = verifyResponse.data;

    // 3. Save basic result (TEMP: just log for now)
    console.log("CHARACTER:", character);
    console.log("TOKENS:", {
      access_token,
      refresh_token,
      expires_in
    });

    // 4. Redirect to dashboard (temporary)
    return res.redirect("https://recruit.inextremis.co/dashboard");

  } catch (err) {
    console.error(err.response?.data || err.message);
    return res.status(500).send("Callback failed");
  }
});

export default router;
