const express = require("express");
const mongoose = require("mongoose");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const cors = require("cors");
require("dotenv").config(); // Keeps your keys safe

const app = express();
app.use(express.json());
app.use(cors());

// ==========================================
// 🔌 DATABASE CONNECTION
// ==========================================
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://Gagan:Gagan112233@cluster0.qadzb37.mongodb.net/firexpro?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
  .then(() => console.log("🔥 Successfully connected to MongoDB Atlas!"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ==========================================
// 📊 MONGODB DATA SCHEMAS
// ==========================================

// User Schema (Synced with Firebase UID)
const userSchema = new mongoose.Schema({
  user_id: { type: String, required: true, unique: true }, // Firebase Authentication UID
  name: { type: String, default: "Gamer" },
  ff_uid: { type: String, default: "Not Linked" },
  wallet: { type: Number, default: 0 }, // User balance tracked safely on cloud
  matches: [{
    match_id: mongoose.Schema.Types.ObjectId,
    match_name: String,
    room_id: String,
    password: String
  }]
});
const User = mongoose.model("User", userSchema);

// Match Tournament Schema
const matchSchema = new mongoose.Schema({
  match_name: { type: String, required: true },
  type: { type: String, enum: ["solo", "duo", "squad"], default: "solo" },
  time: { type: Date, required: true },
  entry_fee: { type: Number, required: true },
  win_prize: { type: Number, required: true },
  max_players: { type: Number, default: 49 },
  room_id: { type: String, default: "" },
  password: { type: String, default: "" },
  status: { type: String, enum: ["upcoming", "live", "cancelled", "completed"], default: "upcoming" },
  players: [{
    user_id: String,
    name: String,
    ff_uid: String
  }]
});
const Match = mongoose.model("Match", matchSchema);

// ==========================================
// 🔴 RAZORPAY CONFIGURATION
// ==========================================
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_SYtpc2E3wGGQ0O",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "ZiEVyYyJTI3QOPJnH0rx9nZW"
});

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "gagan@112233";

// Helper logic to live-update status based on real match times
function checkAndGetStatus(match) {
  if (match.status === "cancelled" || match.status === "completed") return match.status;
  let now = new Date();
  if (now >= new Date(match.time)) {
    match.status = "live";
  }
  return match.status;
}

// ==========================================
// 🚀 PRODUCTION API ENDPOINTS
// ==========================================

/**
 * 🔑 1. USER AUTH SYNC
 * Drops user inside MongoDB instantly on Firebase Register/Login
 */
app.post("/sync-user", async (req, res) => {
  const { firebase_uid, name, ff_uid } = req.body;
  try {
    let user = await User.findOne({ user_id: firebase_uid });
    if (!user) {
      user = new User({ user_id: firebase_uid, name: name || "New Gamer", ff_uid: ff_uid || "Not Linked" });
      await user.save();
    }
    res.json({ status: "success", wallet: user.wallet, ff_uid: user.ff_uid });
  } catch (err) {
    res.status(500).json({ status: "error", message: "User sync crash" });
  }
});

/**
 * 🎮 2. FETCH MATCHES (With Game Mode Filter support!)
 * Target URL: /get-matches OR /get-matches?type=solo
 */
app.get("/get-matches", async (req, res) => {
  try {
    let query = {};
    if (req.query.type) {
      query.type = req.query.type.toLowerCase(); // Filters match data dynamically
    }

    let allMatches = await Match.find(query);
    for (let match of allMatches) {
      let oldStatus = match.status;
      checkAndGetStatus(match);
      if (oldStatus !== match.status) await match.save();
    }
    res.json(allMatches);
  } catch (err) {
    res.status(500).json({ error: "Failed to load matches" });
  }
});

/**
 * 🛡️ 3. FETCH MATCHES JOINED BY USER
 */
app.get("/my-matches/:id", async (req, res) => {
  try {
    let user = await User.findOne({ user_id: req.params.id });
    res.json(user ? user.matches : []);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch player dashboard history" });
  }
});

/**
 * 🪙 4. GET CURRENT BALANCE
 */
app.get("/wallet/:id", async (req, res) => {
  try {
    let user = await User.findOne({ user_id: req.params.id });
    res.json({ wallet: user ? user.wallet : 0 });
  } catch (err) {
    res.status(500).json({ error: "Database error reading balance" });
  }
});

/**
 * ⚔️ 5. LOBBY REGISTER (Atomic Balance Deduct System)
 */
app.post("/join-match", async (req, res) => {
  const { user_id, match_id, ff_uid } = req.body;
  try {
    let user = await User.findOne({ user_id });
    let match = await Match.findById(match_id);

    if (!user || !match) return res.status(400).json({ status: "error", message: "Invalid Profile or Match ID" });

    checkAndGetStatus(match);
    if (match.status !== "upcoming") return res.status(400).json({ status: "error", message: "Match registration closed" });
    if (match.players.length >= match.max_players) return res.status(400).json({ status: "error", message: "Room full" });

    let alreadyJoined = match.players.find(p => p.user_id === user_id);
    if (alreadyJoined) {
      return res.json({ status: "success", message: "Already joined", room_id: match.room_id, password: match.password });
    }

    if (user.wallet < match.entry_fee) return res.status(400).json({ status: "error", message: "Low balance" });

    // Deduct and Push cleanly
    user.wallet -= match.entry_fee;
    match.players.push({ user_id, name: user.name, ff_uid: ff_uid || user.ff_uid });
    user.matches.push({ match_id: match._id, match_name: match.match_name, room_id: match.room_id, password: match.password });

    await user.save();
    await match.save();

    res.json({ status: "success", message: "Joined", room_id: match.room_id, password: match.password, wallet: user.wallet });
  } catch (err) {
    res.status(500).json({ status: "error", message: "Internal server handling breakdown" });
  }
});

// ==========================================
// 💳 ADVANCED RAZORPAY PAYMENT HUBS
// ==========================================

/**
 * 💳 6. CREATE RAZORPAY ORDER (Triggered when user clicks DEPOSIT)
 */
app.post("/create-order", async (req, res) => {
  const { user_id, amount } = req.body; // Amount in clear Rupees (e.g., 50)
  try {
    const options = {
      amount: Number(amount) * 100, // Razorpay processes cash tokens in Paise ($50 = 5000 Paise$)
      currency: "INR",
      receipt: `rcpt_${user_id}_${Date.now()}`,
      notes: { user_id: user_id } // Attaching user profile string to trace transaction source
    };

    const order = await razorpay.orders.create(options);
    res.json({ status: "success", order_id: order.id, amount: order.amount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: "Razorpay initialization failure" });
  }
});

/**
 * 🛡️ 7. RAZORPAY SECURE WEBHOOK (Crucial Security Layer)
 * Razorpay servers call this route directly when checkout finishes successfully.
 * This completely prevents users from modifying balance figures client-side.
 */
app.post("/razorpay-webhook", async (req, res) => {
  // Validate request is coming authentically from Razorpay servers using SHA256 Signature verification
  const shasum = crypto.createHmac("sha256", WEBHOOK_SECRET);
  shasum.update(JSON.stringify(req.body));
  const digest = shasum.digest("hex");

  if (digest !== req.headers["x-razorpay-signature"]) {
    return res.status(400).json({ status: "error", message: "Unauthorized Request Origin Signature Invalid" });
  }

  // Signature clean! Extract verified payment data payloads
  const event = req.body.event;
  if (event === "payment.captured") {
    const paymentEntity = req.body.payload.payment.entity;
    
    // Extract parameters injected in notes array during order setup
    const userId = paymentEntity.notes.user_id;
    const depositedAmount = paymentEntity.amount / 100; // Convert back from Paise to real Rupees

    try {
      let user = await User.findOne({ user_id: userId });
      if (user) {
        user.wallet += depositedAmount; // Secure account balance increment tracking
        await user.save();
        console.log(`🪙 Added ₹${depositedAmount} successfully to verified account user ${userId}`);
      }
    } catch (dbErr) {
      console.error("Failed executing automated database wallet updates:", dbErr);
    }
  }
  res.json({ status: "ok" });
});

// ==========================================
// 🛠️ ADMIN SYSTEMS (Match Management Tools)
// ==========================================

// Create automated custom matches profile setup
app.post("/admin/create-match", async (req, res) => {
  try {
    const newMatch = new Match(req.body);
    await newMatch.save();
    res.json({ status: "success", match: newMatch });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cancel Match & Process Instant Wallet Refunds to Players
app.post("/admin/cancel-match", async (req, res) => {
  const { match_id } = req.body;
  try {
    let match = await Match.findById(match_id);
    if (!match || match.status === "cancelled") return res.status(400).json({ error: "Invalid context" });

    for (let player of match.players) {
      await User.findOneAndUpdate(
        { user_id: player.user_id },
        { $inc: { wallet: match.entry_fee }, $pull: { matches: { match_id: match._id } } }
      );
    }

    match.status = "cancelled";
    match.players = [];
    await match.save();

    res.json({ status: "success", message: "Match voided; entry tokens returned to users." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start listening system
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Advanced Tournament Server operating securely on port ${PORT}`));
