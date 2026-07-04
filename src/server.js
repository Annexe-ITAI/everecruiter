import express from "express";
import authRoutes from "./routes/auth.js";
import callbackRoutes from "./routes/callback.js";

const app = express();

app.use(express.json());

app.use("/auth/eve", authRoutes);
app.use("/auth/eve/callback", callbackRoutes);

app.get("/", (req, res) => {
  res.send("EVE Recruiter API is running");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
