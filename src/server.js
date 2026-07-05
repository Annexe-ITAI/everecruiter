import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.js";
import callbackRoutes from "./routes/callback.js";
import apiRoutes from "./routes/api.js";
import applyRoutes from "./routes/apply.js";

const app = express();

// --------------------
// CORE MIDDLEWARE (ORDER MATTERS)
// --------------------
app.use(express.json());
app.use(cookieParser());

// --------------------
// CORS
// --------------------
const corsOptions = {
  origin: "https://recruit.inextremis.co",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// --------------------
// ROUTES
// --------------------
app.use("/auth/eve", authRoutes);
app.use("/auth/eve/callback", callbackRoutes);
app.use("/api/apply", applyRoutes);
app.use("/api", apiRoutes);

// --------------------
// HEALTH CHECK
// --------------------
app.get("/", (req, res) => {
  res.send("EVE Recruiter API is running");
});

// --------------------
// START SERVER
// --------------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
