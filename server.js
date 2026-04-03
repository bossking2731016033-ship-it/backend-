const express = require("express");
const cors = require("cors");
const Razorpay = require("razorpay");

const app = express();

app.use(cors());
app.use(express.json());

const razorpay = new Razorpay({
  key_id: "rzp_test_SXR4QtfMPnVLcO",
    key_secret: "ZiEVyYyJTI3QOPJnH0rx9nZW"
    });

    // Test route
    app.get("/", (req, res) => {
      res.send("Backend running 🚀");
      });

      // 🔥 CREATE PAYMENT LINK
      app.post("/create-payment-link", async (req, res) => {
        try {
            const { amount } = req.body;

                if (!amount) {
                      return res.status(400).json({
                              error: "Amount required"
                                    });
                                        }

                                            const paymentLink = await razorpay.paymentLink.create({
                                                  amount: amount * 100,
                                                        currency: "INR",
                                                              description: "Tournament Deposit",
                                                                    reference_id: "USER_" + Date.now()
                                                                        });

                                                                            res.json({
                                                                                  payment_link: paymentLink.short_url,
                                                                                        link_id: paymentLink.id
                                                                                            });

                                                                                              } catch (error) {
                                                                                                  console.log(error);
                                                                                                      res.status(500).json({
                                                                                                            error: error.description || error.message
                                                                                                                });
                                                                                                                  }
                                                                                                                  });

                                                                                                                  // 🔥 VERIFY PAYMENT
                                                                                                                  app.get("/verify-payment/:id", async (req, res) => {
                                                                                                                    try {
                                                                                                                        const linkId = req.params.id;

                                                                                                                            const link = await razorpay.paymentLink.fetch(linkId);

                                                                                                                                if (link.status === "paid") {
                                                                                                                                      res.json({
                                                                                                                                              success: true,
                                                                                                                                                      amount: link.amount / 100
                                                                                                                                                            });
                                                                                                                                                                } else {
                                                                                                                                                                      res.json({
                                                                                                                                                                              success: false,
                                                                                                                                                                                      status: link.status
                                                                                                                                                                                            });
                                                                                                                                                                                                }

                                                                                                                                                                                                  } catch (error) {
                                                                                                                                                                                                      res.status(500).json({
                                                                                                                                                                                                            error: error.message
                                                                                                                                                                                                                });
                                                                                                                                                                                                                  }
                                                                                                                                                                                                                  });

                                                                                                                                                                                                                  app.listen(3000, "0.0.0.0", () => {
                                                                                                                                                                                                                    console.log("Server running 🚀");
                                                                                                                                                                                                                    });