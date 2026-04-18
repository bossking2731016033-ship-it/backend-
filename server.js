const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());


// 🔴 RAZORPAY
const razorpay = new Razorpay({
  key_id: "rzp_test_SYtpc2E3wGGQ0O",
    key_secret: "ZiEVyYyJTI3QOPJnH0rx9nZW"
    });

    const WEBHOOK_SECRET = "https://backend-3yxr.onrender.com/razorpay-webhook";


    // =======================
    // 🔥 USERS
    // =======================

    let users = [
      {
          user_id: "1",
              name: "Player1",
                  ff_uid: "123456789",
                      wallet: 0,
                          matches: [] // ✅ MY MATCHES
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
                                              time: "2027-12-31T23:59:00",
                                                  entry_fee: 50,
                                                      max_players: 49,
                                                          players: [],
                                                              room_id: "123456",
                                                                  password: "abc123",
                                                                      status: "upcoming"
                                                                        }
                                                                        ];


                                                                        // =======================
                                                                        // 🔥 UPDATE STATUS AUTO
                                                                        // =======================

                                                                        function updateMatchStatus(match) {
                                                                          let now = new Date();
                                                                            let matchTime = new Date(match.time);

                                                                              if (match.status === "cancelled") return;

                                                                                if (now < matchTime) match.status = "upcoming";
                                                                                  else if (now >= matchTime) match.status = "live";
                                                                                  }


                                                                                  // =======================
                                                                                  // 🔥 GET MATCHES
                                                                                  // =======================

                                                                                  app.get("/get-matches", (req, res) => {

                                                                                    matches.forEach(updateMatchStatus);

                                                                                      res.json(matches);
                                                                                      });


                                                                                      // =======================
                                                                                      // 🔥 CREATE PAYMENT LINK
                                                                                      // =======================

                                                                                      app.post("/create-payment-link", async (req, res) => {

                                                                                        const { amount, user_id } = req.body;

                                                                                          try {
                                                                                              const link = await razorpay.paymentLink.create({
                                                                                                    amount: amount * 100,
                                                                                                          currency: "INR",
                                                                                                                description: "Wallet Deposit",
                                                                                                                      notes: { user_id }
                                                                                                                          });

                                                                                                                              res.json({ payment_link: link.short_url });

                                                                                                                                } catch {
                                                                                                                                    res.json({ error: "Payment failed" });
                                                                                                                                      }
                                                                                                                                      });


                                                                                                                                      // =======================
                                                                                                                                      // 🔥 SECURE WEBHOOK
                                                                                                                                      // =======================

                                                                                                                                      app.post("/razorpay-webhook", (req, res) => {

                                                                                                                                        const secret = WEBHOOK_SECRET;

                                                                                                                                          const shasum = crypto.createHmac("sha256", secret);
                                                                                                                                            shasum.update(JSON.stringify(req.body));
                                                                                                                                              const digest = shasum.digest("hex");

                                                                                                                                                if (digest !== req.headers["x-razorpay-signature"]) {
                                                                                                                                                    return res.status(400).send("Invalid signature");
                                                                                                                                                      }

                                                                                                                                                        if (req.body.event === "payment_link.paid") {

                                                                                                                                                            const data = req.body.payload.payment_link.entity;
                                                                                                                                                                const amount = data.amount_paid / 100;
                                                                                                                                                                    const user_id = data.notes.user_id;

                                                                                                                                                                        let user = users.find(u => u.user_id == user_id);

                                                                                                                                                                            if (user) user.wallet += amount;
                                                                                                                                                                              }

                                                                                                                                                                                res.json({ status: "ok" });
                                                                                                                                                                                });


                                                                                                                                                                                // =======================
                                                                                                                                                                                // 🔥 WALLET
                                                                                                                                                                                // =======================

                                                                                                                                                                                app.get("/wallet/:id", (req, res) => {
                                                                                                                                                                                  let user = users.find(u => u.user_id == req.params.id);
                                                                                                                                                                                    res.json({ wallet: user ? user.wallet : 0 });
                                                                                                                                                                                    });


                                                                                                                                                                                    // =======================
                                                                                                                                                                                    // 🔥 JOIN MATCH
                                                                                                                                                                                    // =======================

                                                                                                                                                                                    app.post("/join-match", (req, res) => {

                                                                                                                                                                                      const { user_id, match_id, ff_uid } = req.body;

                                                                                                                                                                                        let user = users.find(u => u.user_id == user_id);
                                                                                                                                                                                          let match = matches.find(m => m.id == match_id);

                                                                                                                                                                                            if (!user || !match) return res.json({ error: "Invalid" });

                                                                                                                                                                                              updateMatchStatus(match);

                                                                                                                                                                                                // ❌ STATUS CHECK
                                                                                                                                                                                                  if (match.status !== "upcoming") {
                                                                                                                                                                                                      return res.json({ error: "Match not joinable" });
                                                                                                                                                                                                        }

                                                                                                                                                                                                          // ❌ SLOT
                                                                                                                                                                                                            if (match.players.length >= match.max_players) {
                                                                                                                                                                                                                return res.json({ error: "Match Full" });
                                                                                                                                                                                                                  }

                                                                                                                                                                                                                    // ❌ ALREADY JOIN
                                                                                                                                                                                                                      let already = match.players.find(p => p.user_id == user_id);
                                                                                                                                                                                                                        if (already) {
                                                                                                                                                                                                                            return res.json({
                                                                                                                                                                                                                                  message: "Already joined",
                                                                                                                                                                                                                                        room_id: match.room_id,
                                                                                                                                                                                                                                              password: match.password
                                                                                                                                                                                                                                                  });
                                                                                                                                                                                                                                                    }

                                                                                                                                                                                                                                                      // ❌ BALANCE
                                                                                                                                                                                                                                                        if (user.wallet < match.entry_fee) {
                                                                                                                                                                                                                                                            return res.json({
                                                                                                                                                                                                                                                              status:"failed",
                                                                                                                                                                                                                                                                message: "Low balance" });
                                                                                                                                                                                                                                                            }

                                                                                                                                                                                                                                                                // ✅ DEDUCT
                                                                                                                                                                                                                                                                  user.wallet -= match.entry_fee;

                                                                                                                                                                                                                                                                    // ✅ SAVE PLAYER
                                                                                                                                                                                                                                                                      match.players.push({
                                                                                                                                                                                                                                                                          user_id,
                                                                                                                                                                                                                                                                              name: user.name,
                                                                                                                                                                                                                                                                                  ff_uid
                                                                                                                                                                                                                                                                                    });

                                                                                                                                                                                                                                                                                      // ✅ SAVE MY MATCH
                                                                                                                                                                                                                                                                                        user.matches.push({
                                                                                                                                                                                                                                                                                            match_id: match.id,
                                                                                                                                                                                                                                                                                                room_id: match.room_id,
                                                                                                                                                                                                                                                                                                    password: match.password
                                                                                                                                                                                                                                                                                                      });

                                                                                                                                                                                                                                                                                                        res.json({
                                                                                                                                                                                                                                                                                                          status:"success",  //
                                                                                                                                                                                                                                                                                                            message:"joined",
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
                                                                                                                                                                                                                                                                                                                              // 🔥 REFUND SYSTEM
                                                                                                                                                                                                                                                                                                                              // =======================

                                                                                                                                                                                                                                                                                                                              app.post("/cancel-match", (req, res) => {

                                                                                                                                                                                                                                                                                                                                const { match_id } = req.body;

                                                                                                                                                                                                                                                                                                                                  let match = matches.find(m => m.id == match_id);

                                                                                                                                                                                                                                                                                                                                    if (!match) return res.json({ error: "Not found" });

                                                                                                                                                                                                                                                                                                                                      match.status = "cancelled";

                                                                                                                                                                                                                                                                                                                                        // refund all players
                                                                                                                                                                                                                                                                                                                                          match.players.forEach(p => {
                                                                                                                                                                                                                                                                                                                                              let user = users.find(u => u.user_id == p.user_id);
                                                                                                                                                                                                                                                                                                                                                  if (user) user.wallet += match.entry_fee;
                                                                                                                                                                                                                                                                                                                                                    });

                                                                                                                                                                                                                                                                                                                                                      res.json({ message: "Match cancelled & refunded" });
                                                                                                                                                                                                                                                                                                                                                      });


                                                                                                                                                                                                                                                                                                                                                      // =======================
                                                                                                                                                                                                                                                                                                                                                      // 🔥 ADMIN ADD MATCH
                                                                                                                                                                                                                                                                                                                                                      // =======================

                                                                                                                                                                                                                                                                                                                                                      app.post("/add-match", (req, res) => {

                                                                                                                                                                                                                                                                                                                                                        const { name, type, time, fee } = req.body;

                                                                                                                                                                                                                                                                                                                                                          let newMatch = {
                                                                                                                                                                                                                                                                                                                                                              id: matches.length + 1,
                                                                                                                                                                                                                                                                                                                                                                  match_name: name,
                                                                                                                                                                                                                                                                                                                                                                      type: type,
                                                                                                                                                                                                                                                                                                                                                                          time: time,
                                                                                                                                                                                                                                                                                                                                                                              entry_fee: fee,
                                                                                                                                                                                                                                                                                                                                                                                  max_players: 49,
                                                                                                                                                                                                                                                                                                                                                                                      players: [],
                                                                                                                                                                                                                                                                                                                                                                                          room_id: "000000",
                                                                                                                                                                                                                                                                                                                                                                                              password: "0000",
                                                                                                                                                                                                                                                                                                                                                                                                  status: "upcoming"
                                                                                                                                                                                                                                                                                                                                                                                                    };

                                                                                                                                                                                                                                                                                                                                                                                                      matches.push(newMatch);

                                                                                                                                                                                                                                                                                                                                                                                                        res.json({ message: "Match added" });
                                                                                                                                                                                                                                                                                                                                                                                                        });


                                                                                                                                                                                                                                                                                                                                                                                                        // =======================
                                                                                                                                                                                                                                                                                                                                                                                                        // 🚀 SERVER
                                                                                                                                                                                                                                                                                                                                                                                                        // =======================

                                                                                                                                                                                                                                                                                                                                                                                                        app.listen(3000, () => {
                                                                                                                                                                                                                                                                                                                                                                                                          console.log("🔥 FULL SERVER RUNNING");
                                                                                                                                                                                                                                                                                                                                                                                                          });