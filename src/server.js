import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import callbackRoutes from "./routes/callback.js";
import apiRoutes from "./routes/api.js";
import cookieParser from "cookie-parser";
import applyRoutes from "./routes/apply.js";


const app = express();

app.use(express.json());
app.use(cors({
  origin: "https://recruit.inextremis.co",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.options("*", cors());

app.use("/auth/eve", authRoutes);
app.use("/auth/eve/callback", callbackRoutes);
app.use("/api", apiRoutes);

app.use(cookieParser());
app.use("/api/apply", applyRoutes);

app.get("/", (req, res) => {
  res.send("EVE Recruiter API is running");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
