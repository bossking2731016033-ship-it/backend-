const express = require("express");
const mongoose = require("mongoose");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

// ==========================================
// 🔌 DATABASE CONNECTION
// ==========================================

const MONGO_URI = process.env.MONGO_URI ||
  "mongodb+srv://Gagan:Gagan112233@cluster0.qadzb37.mongodb.net/firexpro?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
  .then(() => console.log("🔥 MongoDB Atlas Connected!"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

// ==========================================
// 📊 SCHEMAS
// ==========================================

// ✅ FIX 1: Added email, mobile, win_prize, transactions fields
const userSchema = new mongoose.Schema({
  user_id:  { type: String, required: true, unique: true },
  name:     { type: String, default: "Gamer" },
  email:    { type: String, default: "" },
  mobile:   { type: String, default: "" },
  ff_uid:   { type: String, default: "Not Linked" },
  wallet:   { type: Number, default: 0 },
  matches:  [{
    match_id:   mongoose.Schema.Types.ObjectId,
    match_name: String,
    type:       String,
    entry_fee:  Number,
    win_prize:  Number,
    room_id:    String,
    password:   String,
    joined_at:  { type: Date, default: Date.now }
  }],
  transactions: [{
    type:       { type: String, enum: ["deposit","withdraw","join","refund","win"] },
    amount:     Number,
    note:       String,
    created_at: { type: Date, default: Date.now }
  }],
  created_at: { type: Date, default: Date.now }
});

const matchSchema = new mongoose.Schema({
  match_name:  { type: String, required: true },
  type:        { type: String, enum: ["solo","duo","squad"], default: "solo" },
  time:        { type: Date, required: true },
  entry_fee:   { type: Number, required: true },
  win_prize:   { type: Number, required: true },
  max_players: { type: Number, default: 49 },
  room_id:     { type: String, default: "" },
  password:    { type: String, default: "" },
  status:      { type: String, enum: ["upcoming","live","cancelled","completed"], default: "upcoming" },
  players:     [{ user_id: String, name: String, ff_uid: String }],
  created_at:  { type: Date, default: Date.now }
});

const User  = mongoose.model("User_Data", userSchema);
const Match = mongoose.model("Match", matchSchema);

// ==========================================
// 🔴 RAZORPAY
// ==========================================

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID     || "rzp_test_SYtpc2E3wGGQ0O",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "ZiEVyYyJTI3QOPJnH0rx9nZW"
});

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "gagan@112233";

// ✅ FIX 2: Status updater now saves to DB properly
async function updateMatchStatus(match) {
  if (match.status === "cancelled" || match.status === "completed") return;
  let newStatus = new Date() >= new Date(match.time) ? "live" : "upcoming";
  if (match.status !== newStatus) {
    match.status = newStatus;
    await match.save();
  }
}

// ✅ FIX 3: Admin route protection
function isAdmin(req, res) {
  const key = req.headers["admin-key"] || req.body.admin_key;
  if (key !== (process.env.ADMIN_KEY || "firexpro_admin_2024")) {
    res.status(403).json({ status: "error", message: "Unauthorized. Admin key required." });
    return false;
  }
  return true;
}

// ==========================================
// 🚀 USER ENDPOINTS
// ==========================================

// POST /sync-user — Register or Login sync
app.post("/sync-user", async (req, res) => {
  const { firebase_uid, name, email, mobile, ff_uid } = req.body;
  try {
    if (!firebase_uid) return res.status(400).json({ status: "error", message: "firebase_uid required" });
    let user = await User.findOne({ user_id: firebase_uid });
    if (!user) {
      user = new User({ user_id: firebase_uid, name: name||"Gamer", email: email||"", mobile: mobile||"", ff_uid: ff_uid||"Not Linked" });
      await user.save();
      return res.json({ status: "success", message: "Account created", is_new: true, wallet: user.wallet, ff_uid: user.ff_uid, name: user.name, email: user.email });
    }
    res.json({ status: "success", message: "User loaded", is_new: false, wallet: user.wallet, ff_uid: user.ff_uid, name: user.name, email: user.email, mobile: user.mobile });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// GET /profile/:id — Get user profile
app.get("/profile/:id", async (req, res) => {
  try {
    let user = await User.findOne({ user_id: req.params.id });
    if (!user) return res.status(404).json({ status: "error", message: "User not found" });
    res.json({ status: "success", user_id: user.user_id, name: user.name, email: user.email, mobile: user.mobile, ff_uid: user.ff_uid, wallet: user.wallet });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// POST /update-profile — Update name, mobile, ff_uid
app.post("/update-profile", async (req, res) => {
  const { firebase_uid, name, mobile, ff_uid } = req.body;
  try {
    let user = await User.findOne({ user_id: firebase_uid });
    if (!user) return res.status(404).json({ status: "error", message: "User not found" });
    if (name)   user.name   = name;
    if (mobile) user.mobile = mobile;
    if (ff_uid) user.ff_uid = ff_uid;
    await user.save();
    res.json({ status: "success", message: "Profile updated" });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// GET /wallet/:id — Get wallet balance
app.get("/wallet/:id", async (req, res) => {
  try {
    let user = await User.findOne({ user_id: req.params.id });
    res.json({ wallet: user ? user.wallet : 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /transactions/:id — Transaction history
app.get("/transactions/:id", async (req, res) => {
  try {
    let user = await User.findOne({ user_id: req.params.id });
    if (!user) return res.status(404).json({ status: "error", message: "User not found" });
    res.json(user.transactions || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /get-matches — Get all matches (with ?type=solo/duo/squad filter)
app.get("/get-matches", async (req, res) => {
  try {
    let query = {};
    if (req.query.type) query.type = req.query.type.toLowerCase();
    let allMatches = await Match.find(query).sort({ time: 1 });
    for (let match of allMatches) await updateMatchStatus(match);
    let result = allMatches.map(m => ({
      _id:          m._id,
      match_name:   m.match_name,
      type:         m.type,
      time:         m.time,
      entry_fee:    m.entry_fee,
      win_prize:    m.win_prize,
      max_players:  m.max_players,
      slots_left:   m.max_players - m.players.length,
      total_joined: m.players.length,
      room_id:      m.room_id,
      password:     m.password,
      status:       m.status
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /match/:id — Get single match details
app.get("/match/:id", async (req, res) => {
  try {
    let match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ status: "error", message: "Match not found" });
    await updateMatchStatus(match);
    res.json(match);
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// GET /my-matches/:id — Matches joined by user
app.get("/my-matches/:id", async (req, res) => {
  try {
    let user = await User.findOne({ user_id: req.params.id });
    res.json(user ? user.matches : []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /join-match — Join a tournament match
app.post("/join-match", async (req, res) => {
  const { user_id, match_id, ff_uid } = req.body;
  try {
    if (!user_id || !match_id) return res.status(400).json({ status: "error", message: "user_id and match_id required" });
    let user  = await User.findOne({ user_id });
    let match = await Match.findById(match_id);
    if (!user)  return res.status(404).json({ status: "error", message: "User not found" });
    if (!match) return res.status(404).json({ status: "error", message: "Match not found" });
    await updateMatchStatus(match);
    if (match.status !== "upcoming") return res.status(400).json({ status: "error", message: "Match registration closed" });
    if (match.players.length >= match.max_players) return res.status(400).json({ status: "error", message: "Match is full" });
    let alreadyJoined = match.players.find(p => p.user_id === user_id);
    if (alreadyJoined) return res.json({ status: "success", message: "Already joined", room_id: match.room_id, password: match.password, slots_left: match.max_players - match.players.length, wallet: user.wallet });
    if (user.wallet < match.entry_fee) return res.status(400).json({ status: "error", message: "Insufficient balance. Please deposit." });
    user.wallet -= match.entry_fee;
    match.players.push({ user_id, name: user.name, ff_uid: ff_uid || user.ff_uid });
    user.matches.push({ match_id: match._id, match_name: match.match_name, type: match.type, entry_fee: match.entry_fee, win_prize: match.win_prize, room_id: match.room_id, password: match.password });
    user.transactions.push({ type: "join", amount: match.entry_fee, note: `Joined ${match.match_name}` });
    await user.save();
    await match.save();
    res.json({ status: "success", message: "Joined successfully!", room_id: match.room_id, password: match.password, wallet: user.wallet, slots_left: match.max_players - match.players.length });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// POST /withdraw — Withdraw from wallet
app.post("/withdraw", async (req, res) => {
  const { user_id, amount } = req.body;
  try {
    if (!user_id || !amount) return res.status(400).json({ status: "error", message: "user_id and amount required" });
    let withdrawAmount = Number(amount);
    if (withdrawAmount < 100) return res.status(400).json({ status: "error", message: "Minimum withdrawal is ₹100" });
    let user = await User.findOne({ user_id });
    if (!user) return res.status(404).json({ status: "error", message: "User not found" });
    if (user.wallet < withdrawAmount) return res.status(400).json({ status: "error", message: "Insufficient balance" });
    user.wallet -= withdrawAmount;
    user.transactions.push({ type: "withdraw", amount: withdrawAmount, note: "Wallet withdrawal" });
    await user.save();
    res.json({ status: "success", message: `₹${withdrawAmount} withdrawal request placed`, wallet: user.wallet });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// POST /create-order — Razorpay deposit order
app.post("/create-order", async (req, res) => {
  const { user_id, amount } = req.body;
  try {
    if (!user_id || !amount) return res.status(400).json({ status: "error", message: "user_id and amount required" });
    const order = await razorpay.orders.create({ amount: Number(amount)*100, currency: "INR", receipt: `rcpt_${user_id}_${Date.now()}`, notes: { user_id } });
    res.json({ status: "success", order_id: order.id, amount: order.amount, key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_SYtpc2E3wGGQ0O" });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// POST /razorpay-webhook — Auto wallet top-up after payment
app.post("/razorpay-webhook", async (req, res) => {
  const shasum = crypto.createHmac("sha256", WEBHOOK_SECRET);
  shasum.update(JSON.stringify(req.body));
  const digest = shasum.digest("hex");
  if (digest !== req.headers["x-razorpay-signature"]) return res.status(400).json({ status: "error", message: "Invalid signature" });
  if (req.body.event === "payment.captured") {
    const payment = req.body.payload.payment.entity;
    const userId  = payment.notes.user_id;
    const amount  = payment.amount / 100;
    try {
      let user = await User.findOne({ user_id: userId });
      if (user) {
        user.wallet += amount;
        user.transactions.push({ type: "deposit", amount, note: "Razorpay deposit" });
        await user.save();
        console.log(`✅ ₹${amount} added to ${userId}`);
      }
    } catch (err) { console.error("Wallet update error:", err); }
  }
  res.json({ status: "ok" });
});

// ==========================================
// 🛠️ ADMIN ENDPOINTS (Header: admin-key: firexpro_admin_2024)
// ==========================================

// POST /admin/create-match
app.post("/admin/create-match", async (req, res) => {
  if (!isAdmin(req, res)) return;
  try {
    const newMatch = new Match(req.body);
    await newMatch.save();
    res.json({ status: "success", message: "Match created!", match_id: newMatch._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/update-room — Set room ID + password
app.post("/admin/update-room", async (req, res) => {
  if (!isAdmin(req, res)) return;
  const { match_id, room_id, password } = req.body;
  try {
    let match = await Match.findById(match_id);
    if (!match) return res.status(404).json({ status: "error", message: "Match not found" });
    match.room_id  = room_id;
    match.password = password;
    await match.save();
    res.json({ status: "success", message: "Room details updated!" });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// POST /admin/complete-match
app.post("/admin/complete-match", async (req, res) => {
  if (!isAdmin(req, res)) return;
  try {
    let match = await Match.findById(req.body.match_id);
    if (!match) return res.status(404).json({ status: "error", message: "Match not found" });
    match.status = "completed";
    await match.save();
    res.json({ status: "success", message: "Match completed!" });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// POST /admin/cancel-match — Cancel + refund all players
app.post("/admin/cancel-match", async (req, res) => {
  if (!isAdmin(req, res)) return;
  const { match_id } = req.body;
  try {
    let match = await Match.findById(match_id);
    if (!match || match.status === "cancelled") return res.status(400).json({ error: "Invalid or already cancelled" });
    for (let player of match.players) {
      let user = await User.findOne({ user_id: player.user_id });
      if (user) {
        user.wallet += match.entry_fee;
        user.transactions.push({ type: "refund", amount: match.entry_fee, note: `Refund: ${match.match_name} cancelled` });
        user.matches = user.matches.filter(m => m.match_id?.toString() !== match._id.toString());
        await user.save();
      }
    }
    match.status  = "cancelled";
    match.players = [];
    await match.save();
    res.json({ status: "success", message: "Match cancelled. All players refunded." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/give-prize — Award prize to winner
app.post("/admin/give-prize", async (req, res) => {
  if (!isAdmin(req, res)) return;
  const { winner_user_id, prize_amount, match_name } = req.body;
  try {
    let user = await User.findOne({ user_id: winner_user_id });
    if (!user) return res.status(404).json({ status: "error", message: "Winner not found" });
    user.wallet += Number(prize_amount);
    user.transactions.push({ type: "win", amount: Number(prize_amount), note: `Prize won in ${match_name||"tournament"}` });
    await user.save();
    res.json({ status: "success", message: `₹${prize_amount} given to ${user.name}`, wallet: user.wallet });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// GET /admin/users
app.get("/admin/users", async (req, res) => {
  if (!isAdmin(req, res)) return;
  try {
    let users = await User.find().select("-transactions -matches");
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/matches
app.get("/admin/matches", async (req, res) => {
  if (!isAdmin(req, res)) return;
  try {
    res.json(await Match.find().sort({ time: -1 }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 🚀 START SERVER
// ==========================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 FireXpro Server running on port ${PORT}`);
});
