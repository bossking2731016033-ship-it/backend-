const express = require("express");
const cors = require("cors");
const Razorpay = require("razorpay");

const app = express();

// ✅ Middleware
app.use(cors());
app.use(express.json());

// ✅ Razorpay setup
const razorpay = new Razorpay({
  key_id: "rzp_test_SXR4QtfMPnVLcO",
    key_secret: "YOUR_SECRET_KEY" // 🔴 PUT YOUR REAL SECRET HERE
    });

    // ✅ Test route
    app.get("/", (req, res) => {
      res.send("Backend running 🚀");
      });

      // 🔥 CREATE PAYMENT LINK API
      app.post("/create-payment-link", async (req, res) => {
        try {
            const { amount } = req.body;

                // ❌ Validation
                    if (!amount) {
                          return res.status(400).json({
                                  error: "Amount required"
                                        });
                                            }

                                                // ✅ Create payment link
                                                    const paymentLink = await razorpay.paymentLink.create({
                                                          amount: amount * 100, // convert ₹ to paisa
                                                                currency: "INR",
                                                                      description: "Tournament Deposit",
                                                                            customer: {
                                                                                    name: "Player",
                                                                                            email: "test@test.com",
                                                                                                    contact: "9999999999"
                                                                                                          },
                                                                                                                notify: {
                                                                                                                        sms: true,
                                                                                                                                email: false
                                                                                                                                      },
                                                                                                                                            reminder_enable: true
                                                                                                                                                });

                                                                                                                                                    // ✅ Send link to app
                                                                                                                                                        res.json({
                                                                                                                                                              payment_link: paymentLink.short_url
                                                                                                                                                                  });

                                                                                                                                                                    } catch (error) {
                                                                                                                                                                        console.log(error);

                                                                                                                                                                            res.status(500).json({
                                                                                                                                                                                  error: "Payment link creation failed"
                                                                                                                                                                                      });
                                                                                                                                                                                        }
                                                                                                                                                                                        });

                                                                                                                                                                                        // 🚀 Start server
                                                                                                                                                                                        app.listen(3000, "0.0.0.0", () => {
                                                                                                                                                                                          console.log("Server running on port 3000");
                                                                                                                                                                                          });const