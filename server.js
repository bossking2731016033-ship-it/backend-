const express = require("express");
const Razorpay = require("razorpay");
const cors = require("cors");

const app = express();

// Middlewares
app.use(express.json());
app.use(cors());

// Razorpay instance
const razorpay = new Razorpay({
  key_id: "rzp_test_SXR4QtfMPnVLcO",
    key_secret: "SBSBOHiyN4ca2qnr0NAwN52am4" // 🔴 PUT YOUR SECRET KEY HERE
    });

    // Test route
    app.get("/", (req, res) => {
      res.send("Backend is running 🚀");
      });

      // 🔥 CREATE PAYMENT LINK API
      app.post("/create-payment-link", async (req, res) => {
        const { amount } = req.body;

          // Check amount
            if (!amount) {
                return res.status(400).json({ error: "Amount required" });
                  }

                    try {
                        const paymentLink = await razorpay.paymentLink.create({
                              amount: amount * 100, // convert to paise
                                    currency: "INR",
                                          description: "Deposit Payment",
                                                customer: {
                                                        name: "User",
                                                                email: "user@email.com",
                                                                        contact: "9999999999"
                                                                              },
                                                                                    notify: {
                                                                                            sms: true,
                                                                                                    email: false
                                                                                                          },
                                                                                                                reminder_enable: true
                                                                                                                    });

                                                                                                                        // Send short URL to app
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

                                                                                                                                                            // Server start
                                                                                                                                                            const PORT = process.env.PORT || 3000;

                                                                                                                                                            app.listen(PORT, () => {
                                                                                                                                                              console.log("Server running on port " + PORT);
                                                                                                                                                              });const