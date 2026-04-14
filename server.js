const express = require("express");
const Razorpay = require("razorpay");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors());


// 🔴 RAZORPAY SETUP
const razorpay = new Razorpay({
  key_id: "rzp_test_SYtpc2E3wGGQ0O",
    key_secret: "ZiEVyYyJTI3QOPJnH0rx9nZW" // 👉 PUT YOUR SECRET KEY
    });


    // =======================
    // ✅ TEST ROUTE
    // =======================

    app.get("/", (req, res) => {
      res.send("Backend is running 🚀");
      });


      // =======================
      // 🔥 USER SYSTEM (WALLET)
      // =======================

      let users = [
        {
            user_id: "1",
                name: "Player1",
                    wallet: 0
                      }
                      ];


                      // =======================
                      // 🔥 MATCH SYSTEM
                      // =======================

                      let matches = [
                        {
                            id: 1,
                                match_name: "Solo Battle",
                                    type: "solo",
                                        time: "7:00 PM",
                                            entry_fee: 50,
                                                room_id: "123456",
                                                    password: "abc123",
                                                        players: []
                                                          },
                                                            {
                                                                id: 2,
                                                                    match_name: "Duo Clash",
                                                                        type: "duo",
                                                                            time: "8:00 PM",
                                                                                entry_fee: 40,
                                                                                    room_id: "654321",
                                                                                        password: "xyz789",
                                                                                            players: []
                                                                                              }
                                                                                              ];


                                                                                              // =======================
                                                                                              // 🔥 GET MATCHES
                                                                                              // =======================

                                                                                              app.get("/get-matches", (req, res) => {
                                                                                                res.json(matches);
                                                                                                });


                                                                                                // =======================
                                                                                                // 🔥 CREATE PAYMENT LINK
                                                                                                // =======================

                                                                                                app.post("/create-payment-link", async (req, res) => {

                                                                                                  const { amount, user_id } = req.body;

                                                                                                    if (!amount || !user_id) {
                                                                                                        return res.status(400).json({ error: "Missing data" });
                                                                                                          }

                                                                                                            try {

                                                                                                                const paymentLink = await razorpay.paymentLink.create({
                                                                                                                      amount: amount * 100,
                                                                                                                            currency: "INR",
                                                                                                                                  description: "Wallet Deposit",

                                                                                                                                        customer: {
                                                                                                                                                name: "Player",
                                                                                                                                                        email: "player@email.com",
                                                                                                                                                                contact: "9999999999"
                                                                                                                                                                      },

                                                                                                                                                                            // 🔥 IMPORTANT (LINK USER)
                                                                                                                                                                                  notes: {
                                                                                                                                                                                          user_id: user_id
                                                                                                                                                                                                }

                                                                                                                                                                                                    });

                                                                                                                                                                                                        res.json({
                                                                                                                                                                                                              status: "success",
                                                                                                                                                                                                                    payment_link: paymentLink.short_url
                                                                                                                                                                                                                        });

                                                                                                                                                                                                                          } catch (error) {
                                                                                                                                                                                                                              console.log(error);
                                                                                                                                                                                                                                  res.status(500).json({ error: "Payment link failed" });
                                                                                                                                                                                                                                    }

                                                                                                                                                                                                                                    });


                                                                                                                                                                                                                                    // =======================
                                                                                                                                                                                                                                    // 🔥 WEBHOOK (AUTO ADD MONEY)
                                                                                                                                                                                                                                    // =======================

                                                                                                                                                                                                                                    app.post("/razorpay-webhook", (req, res) => {

                                                                                                                                                                                                                                      const event = req.body.event;

                                                                                                                                                                                                                                        if (event === "payment_link.paid") {

                                                                                                                                                                                                                                            const data = req.body.payload.payment_link.entity;

                                                                                                                                                                                                                                                const amount = data.amount_paid / 100;

                                                                                                                                                                                                                                                    const user_id = data.notes.user_id;

                                                                                                                                                                                                                                                        console.log("Payment success:", amount, user_id);

                                                                                                                                                                                                                                                            const user = users.find(u => u.user_id == user_id);

                                                                                                                                                                                                                                                                if (user) {
                                                                                                                                                                                                                                                                      user.wallet += amount;
                                                                                                                                                                                                                                                                            console.log("Wallet updated:", user.wallet);
                                                                                                                                                                                                                                                                                }

                                                                                                                                                                                                                                                                                  }

                                                                                                                                                                                                                                                                                    res.json({ status: "ok" });
                                                                                                                                                                                                                                                                                    });


                                                                                                                                                                                                                                                                                    // =======================
                                                                                                                                                                                                                                                                                    // 🔥 GET WALLET
                                                                                                                                                                                                                                                                                    // =======================

                                                                                                                                                                                                                                                                                    app.get("/wallet/:id", (req, res) => {

                                                                                                                                                                                                                                                                                      const user = users.find(u => u.user_id == req.params.id);

                                                                                                                                                                                                                                                                                        if (!user) {
                                                                                                                                                                                                                                                                                            return res.json({ error: "User not found" });
                                                                                                                                                                                                                                                                                              }

                                                                                                                                                                                                                                                                                                res.json({
                                                                                                                                                                                                                                                                                                    wallet: user.wallet
                                                                                                                                                                                                                                                                                                      });

                                                                                                                                                                                                                                                                                                      });


                                                                                                                                                                                                                                                                                                      // =======================
                                                                                                                                                                                                                                                                                                      // 🔥 JOIN MATCH
                                                                                                                                                                                                                                                                                                      // =======================

                                                                                                                                                                                                                                                                                                      app.post("/join-match", (req, res) => {

                                                                                                                                                                                                                                                                                                        const { user_id, match_id } = req.body;

                                                                                                                                                                                                                                                                                                          const user = users.find(u => u.user_id == user_id);
                                                                                                                                                                                                                                                                                                            const match = matches.find(m => m.id == match_id);

                                                                                                                                                                                                                                                                                                              if (!user || !match) {
                                                                                                                                                                                                                                                                                                                  return res.json({ error: "Invalid data" });
                                                                                                                                                                                                                                                                                                                    }

                                                                                                                                                                                                                                                                                                                      // ❌ Check balance
                                                                                                                                                                                                                                                                                                                        if (user.wallet < match.entry_fee) {
                                                                                                                                                                                                                                                                                                                            return res.json({ error: "Insufficient balance" });
                                                                                                                                                                                                                                                                                                                              }

                                                                                                                                                                                                                                                                                                                                // ❌ Prevent duplicate
                                                                                                                                                                                                                                                                                                                                  const already = match.players.find(p => p.name === user.name);
                                                                                                                                                                                                                                                                                                                                    if (already) {
                                                                                                                                                                                                                                                                                                                                        return res.json({
                                                                                                                                                                                                                                                                                                                                              message: "Already joined",
                                                                                                                                                                                                                                                                                                                                                    room_id: match.room_id,
                                                                                                                                                                                                                                                                                                                                                          password: match.password
                                                                                                                                                                                                                                                                                                                                                              });
                                                                                                                                                                                                                                                                                                                                                                }

                                                                                                                                                                                                                                                                                                                                                                  // ✅ Deduct money
                                                                                                                                                                                                                                                                                                                                                                    user.wallet -= match.entry_fee;

                                                                                                                                                                                                                                                                                                                                                                      // ✅ Add player
                                                                                                                                                                                                                                                                                                                                                                        match.players.push({
                                                                                                                                                                                                                                                                                                                                                                            name: user.name
                                                                                                                                                                                                                                                                                                                                                                              });

                                                                                                                                                                                                                                                                                                                                                                                res.json({
                                                                                                                                                                                                                                                                                                                                                                                    message: "Joined successfully",
                                                                                                                                                                                                                                                                                                                                                                                        room_id: match.room_id,
                                                                                                                                                                                                                                                                                                                                                                                            password: match.password,
                                                                                                                                                                                                                                                                                                                                                                                                wallet: user.wallet
                                                                                                                                                                                                                                                                                                                                                                                                  });

                                                                                                                                                                                                                                                                                                                                                                                                  });


                                                                                                                                                                                                                                                                                                                                                                                                  // =======================
                                                                                                                                                                                                                                                                                                                                                                                                  // 🔥 GET PLAYERS
                                                                                                                                                                                                                                                                                                                                                                                                  // =======================

                                                                                                                                                                                                                                                                                                                                                                                                  app.get("/players/:id", (req, res) => {

                                                                                                                                                                                                                                                                                                                                                                                                    const match = matches.find(m => m.id == req.params.id);

                                                                                                                                                                                                                                                                                                                                                                                                      if (!match) {
                                                                                                                                                                                                                                                                                                                                                                                                          return res.json({ error: "Match not found" });
                                                                                                                                                                                                                                                                                                                                                                                                            }

                                                                                                                                                                                                                                                                                                                                                                                                              res.json(match.players);

                                                                                                                                                                                                                                                                                                                                                                                                              });


                                                                                                                                                                                                                                                                                                                                                                                                              // =======================
                                                                                                                                                                                                                                                                                                                                                                                                              // 🚀 START SERVER
                                                                                                                                                                                                                                                                                                                                                                                                              // =======================

                                                                                                                                                                                                                                                                                                                                                                                                              const PORT = process.env.PORT || 3000;

                                                                                                                                                                                                                                                                                                                                                                                                              app.listen(PORT, () => {
                                                                                                                                                                                                                                                                                                                                                                                                                console.log("Server running on port " + PORT);
                                                                                                                                                                                                                                                                                                                                                                                                                });