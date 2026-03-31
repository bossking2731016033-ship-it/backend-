const express = require("express");
const cors = require("cors");

const app = express();

// Enable CORS (IMPORTANT)
app.use(cors());

// Root route (just for checking)
app.get("/", (req, res) => {
  res.send("Hello my name is Gagan 🚀");
  });

  // API: Get User
  app.get("/api/user", (req, res) => {
    res.json({
        name: "Gagan",
            age: 20
              });
              });

              // API: Get Products
              app.get("/api/products", (req, res) => {
                res.json([
                    { id: 1, name: "Phone", price: 1500 },
                        { id: 2, name: "Laptop", price: 50000 },
                            { id: 3, name: "Headphones", price: 2000 }
                              ]);
                              });

                              // Port setup
                              const PORT = process.env.PORT || 3000;

                              app.listen(PORT, () => {
                                console.log("Server running on port " + PORT);
                                });