const express = require("express");
const cors = require("cors");
const Razorpay = require("razorpay");

const app = express();

app.use(cors());
app.use(express.json());

const razorpay = new Razorpay({
  key_id: "rzp_test_SYtpc2E3wGGQ0O",
    key_secret: "ZiEVyYyJTI3QOPJnH0rx9nZW"
    });

    // Test route
    app.get("/", (req, res) => {
      res.send("Backend running 🚀");
      });

      // Create payment link
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
                                                              description: "Tournament Payment",
                                                                    reference_id: "USER_" + Date.now()
                                                                        });

                                                                            res.json({
                                                                                  payment_link: paymentLink.short_url
                                                                                      });

                                                                                        } catch (error) {
                                                                                            console.log(error);
                                                                                                res.status(500).json({
                                                                                                      error: error.description || error.message
                                                                                                          });
                                                                                                            }
                                                                                                            });

                                                                                                            app.listen(3000, "0.0.0.0", () => {
                                                                                                              console.log("Server running on port 3000");
                                                                                                              });