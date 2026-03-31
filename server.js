const express = require("express");
const cors = require("cors");
const Razorpay = require("razorpay");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Razorpay setup
const razorpay = new Razorpay({
  key_id: "rzp_test_SXR4QtfMPnVLcO",
    key_secret:  "SBOHiyN4ca2qnr0NAwN52am4" // ⚠️ put your secret here
    });

    // ✅ Home route
    app.get("/", (req, res) => {
      res.send("Backend is working 🚀");
      });

      // ✅ API test route
      app.get("/api", (req, res) => {
        res.json({ message: "API is working 🚀" });
        });

        // ✅ User API
        app.get("/api/user", (req, res) => {
          res.json({
              name: "Gagan",
                  age: 20
                    });
                    });

                    // ✅ Products API
                    app.get("/api/products", (req, res) => {
                      res.json([
                          { id: 1, name: "Phone", price: 1500 },
                              { id: 2, name: "Laptop", price: 50000 },
                                  { id: 3, name: "Headphones", price: 2000 }
                                    ]);
                                    });

                                    // ✅ Razorpay create order API
                                    app.post("/create-order", async (req, res) => {
                                      const options = {
                                          amount: 50000, // ₹500 in paise
                                              currency: "INR",
                                                  receipt: "order_rcptid_11"
                                                    };

                                                      try {
                                                          const order = await razorpay.orders.create(options);
                                                              res.json(order);
                                                                } catch (err) {
                                                                    console.log(err);
                                                                        res.status(500).send("Error creating order");
                                                                          }
                                                                          });

                                                                          // ✅ Port setup
                                                                          const PORT = process.env.PORT || 5000;

                                                                          app.listen(PORT, () => {
                                                                            console.log(`Server running on port ${PORT}`);
                                                                            });