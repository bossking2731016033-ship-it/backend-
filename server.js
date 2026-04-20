const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// =======================
// 🔴 RAZORPAY CONFIG
// =======================

const razorpay = new Razorpay({
  key_id: "rzp_test_SYtpc2E3wGGQ0O",
    key_secret: "ZiEVyYyJTI3QOPJnH0rx9nZW"
    });

    const WEBHOOK_SECRET = "gagan@112233"; // your webhook secret

    // =======================
    // 🔥 USERS (IN MEMORY)
    // =======================

    let users = [
      {
          user_id: "1",
              name: "Player1",
                  ff_uid: "123456789",
                      wallet: 1000, // 🔥 START WITH MONEY FOR TEST
                          matches: []
                            }
                            ];

                            // =======================
                            // 🔥 MATCHES
                            // =======================

                            let matches = [
                              {
                                  id: 1,
                                      match_name: "Solo Battle",
                                          type: "solo",
                                              time: "2030-04-20T19:00:00", // future time
                                                  entry_fee: 50,
                                                      max_players: 49,
                                                          players: [],
                                                              room_id: "123456",
                                                                  password: "abc123",
                                                                      status: "upcoming"
                                                                        }
                                                                        ];

                                                                        // =======================
                                                                        // 🔥 UPDATE MATCH STATUS
                                                                        // =======================

                                                                        function updateMatchStatus(match) {
                                                                          let now = new Date();
                                                                            let matchTime = new Date(match.time);

                                                                              if (match.status === "cancelled") return;

                                                                                if (now < matchTime) match.status = "upcoming";
                                                                                  else match.status = "live";
                                                                                  }

                                                                                  // =======================
                                                                                  // 🔥 GET MATCHES
                                                                                  // =======================

                                                                                  app.get("/get-matches", (req, res) => {
                                                                                    matches.forEach(updateMatchStatus);
                                                                                      res.json(matches);
                                                                                      });

                                                                                      // =======================
                                                                                      // 🔥 WALLET
                                                                                      // =======================

                                                                                      app.get("/wallet/:id", (req, res) => {
                                                                                        let user = users.find(u => u.user_id == req.params.id);
                                                                                          res.json({ wallet: user ? user.wallet : 0 });
                                                                                          });

                                                                                          // =======================
                                                                                          // 🔥 TEST ADD MONEY (IMPORTANT)
                                                                                          // =======================

                                                                                          app.get("/add-money/:id/:amount", (req, res) => {
                                                                                            let user = users.find(u => u.user_id == req.params.id);

                                                                                              if (!user) return res.json({ error: "User not found" });

                                                                                                user.wallet += Number(req.params.amount);

                                                                                                  res.json({
                                                                                                      message: "Money added",
                                                                                                          wallet: user.wallet
                                                                                                            });
                                                                                                            });

                                                                                                            // =======================
                                                                                                            // 🔥 JOIN MATCH
                                                                                                            // =======================

                                                                                                            app.post("/join-match", (req, res) => {

                                                                                                              const { user_id, match_id, ff_uid } = req.body;

                                                                                                                let user = users.find(u => u.user_id == user_id);
                                                                                                                  let match = matches.find(m => m.id == match_id);

                                                                                                                    if (!user || !match) {
                                                                                                                        return res.json({ status: "error", message: "Invalid user or match" });
                                                                                                                          }

                                                                                                                            updateMatchStatus(match);

                                                                                                                              if (match.status !== "upcoming") {
                                                                                                                                  return res.json({ status: "error", message: "Match not joinable" });
                                                                                                                                    }

                                                                                                                                      if (match.players.length >= match.max_players) {
                                                                                                                                          return res.json({ status: "error", message: "Match full" });
                                                                                                                                            }

                                                                                                                                              let already = match.players.find(p => p.user_id == user_id);

                                                                                                                                                if (already) {
                                                                                                                                                    return res.json({
                                                                                                                                                          status: "success",
                                                                                                                                                                message: "Already joined",
                                                                                                                                                                      room_id: match.room_id,
                                                                                                                                                                            password: match.password
                                                                                                                                                                                });
                                                                                                                                                                                  }

                                                                                                                                                                                    if (user.wallet < match.entry_fee) {
                                                                                                                                                                                        return res.json({ status: "error", message: "Low balance" });
                                                                                                                                                                                          }

                                                                                                                                                                                            // deduct money
                                                                                                                                                                                              user.wallet -= match.entry_fee;

                                                                                                                                                                                                // add player
                                                                                                                                                                                                  match.players.push({
                                                                                                                                                                                                      user_id,
                                                                                                                                                                                                          name: user.name,
                                                                                                                                                                                                              ff_uid
                                                                                                                                                                                                                });

                                                                                                                                                                                                                  // save match in user
                                                                                                                                                                                                                    user.matches.push({
                                                                                                                                                                                                                        match_id: match.id,
                                                                                                                                                                                                                            room_id: match.room_id,
                                                                                                                                                                                                                                password: match.password
                                                                                                                                                                                                                                  });

                                                                                                                                                                                                                                    res.json({
                                                                                                                                                                                                                                        status: "success",
                                                                                                                                                                                                                                            message: "Joined",
                                                                                                                                                                                                                                                room_id: match.room_id,
                                                                                                                                                                                                                                                    password: match.password,
                                                                                                                                                                                                                                                        wallet: user.wallet
                                                                                                                                                                                                                                                          });
                                                                                                                                                                                                                                                          });

                                                                                                                                                                                                                                                          // =======================
                                                                                                                                                                                                                                                          // 🔥 MY MATCHES
                                                                                                                                                                                                                                                          // =======================

                                                                                                                                                                                                                                                          app.get("/my-matches/:id", (req, res) => {
                                                                                                                                                                                                                                                            let user = users.find(u => u.user_id == req.params.id);
                                                                                                                                                                                                                                                              res.json(user ? user.matches : []);
                                                                                                                                                                                                                                                              });

                                                                                                                                                                                                                                                              // =======================
                                                                                                                                                                                                                                                              // 🔥 CANCEL MATCH (REFUND)
                                                                                                                                                                                                                                                              // =======================

                                                                                                                                                                                                                                                              app.post("/cancel-match", (req, res) => {

                                                                                                                                                                                                                                                                const { match_id } = req.body;

                                                                                                                                                                                                                                                                  let match = matches.find(m => m.id == match_id);

                                                                                                                                                                                                                                                                    if (!match) return res.json({ error: "Match not found" });

                                                                                                                                                                                                                                                                      match.status = "cancelled";

                                                                                                                                                                                                                                                                        match.players.forEach(p => {
                                                                                                                                                                                                                                                                            let user = users.find(u => u.user_id == p.user_id);
                                                                                                                                                                                                                                                                                if (user) user.wallet += match.entry_fee;
                                                                                                                                                                                                                                                                                  });

                                                                                                                                                                                                                                                                                    res.json({ message: "Match cancelled & refunded" });
                                                                                                                                                                                                                                                                                    });

                                                                                                                                                                                                                                                                                    // =======================
                                                                                                                                                                                                                                                                                    // 🔥 START SERVER
                                                                                                                                                                                                                                                                                    // =======================

                                                                                                                                                                                                                                                                                    app.listen(3000, () => {
                                                                                                                                                                                                                                                                                      console.log("🔥 SERVER RUNNING ON PORT 3000");
                                                                                                                                                                                                                                                                                      });