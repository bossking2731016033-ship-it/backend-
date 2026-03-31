const express = require("express");
const app = express();

// Root route
app.get("/", (req, res) => {
  res.send("Hello my name is Gagan 🚀");
  });

  // API route
  app.get("/api", (req, res) => {
    res.json({ message: "API is working 🚀" });
    });

    // User API
    app.get("/user", (req, res) => {
      res.json({
          name: "Gagan",
              age: 20,
                  role: "Developer"
                    });
                    });

                    // Products API
                    app.get("/products", (req, res) => {
                      res.json([
                          { id: 1, name: "Phone", price: 15000 },
                              { id: 2, name: "Laptop", price: 50000 },
                                  { id: 3, name: "Headphones", price: 2000 }
                                    ]);
                                    });

                                    // Port setup
                                    const PORT = process.env.PORT || 5000;

                                    app.listen(PORT, () => {
                                      console.log(`Server running on port ${PORT}`);
                                      });