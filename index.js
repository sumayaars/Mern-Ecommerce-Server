const express = require("express");
const jwt = require("jsonwebtoken");
const cookie = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const app = express();
const dotenv = require("dotenv");
dotenv.config();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: "http://localhost:5173", // Your frontend URL
    credentials: true,
  })
);
app.use(express.json());
app.use(cookie()); // Use cookie parser middleware to handle cookies
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

const uri =`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@fullstack-ecom.ysvnolz.mongodb.net/?retryWrites=true&w=majority&appName=Fullstack-ecom`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
      await client.db("admin").command({ ping: 1 });
       console.log("Pinged your deployment. You successfully connected to MongoDB!");
    //db collections
    const productsCollection = client
      .db("Fullstack-ecom")
      .collection("products");

     const usersCollection = client
     .db("Fullstack-ecom")
     .collection("users");
    // prodcts api
      // prodcts api
       const verifyJwt = (req, res, next) => {
      const token = req.cookies["jwt-token"];
      console.log("JWT Token:", token);

      if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(403).json({ error: "Forbidden" });
        }
        req.user = decoded;
        next();
      });
    }; // middleware for JWT verification
    const verifyAdmin = async (req, res, next) => {
      const email = req.user.email;
      console.log("User from admin:", email);
      if (!email) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      // Check if the user is an admin
      // isAdmin = true or role:admin
      const query = { email: email };
      const userdb = usersCollection.findOne(query);
      const user = await userdb;
      console.log("User from admin query:", user);

      if (!user) {
        return res.status(404).json({ error: "user not found" });
      }
      let isAdmin;
      console.log(isAdmin, "is admin");
      if (user) {
        console.log("checking user", user);
        isAdmin = user.isAdmin;
      }

      if (!isAdmin) {
        return res.status(403).json({ error: "Forbidden" });
      }
      next();
    }; // middleware for admin verification

    app.post("/jwt", async (req, res) => {
        try {
        const { email } = req.body;
        
       // console.log("Generating JWT for email:", email);
        if (!email) {
          return res.status(400).json({ error: "Email is required" });
        }
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: "1h",
        });
        res.cookie("jwt-token", token, {
          httpOnly: true,
          secure: false, // Set to true if using HTTPS
        });
        res.status(200).json({ token });
      } catch (error) {
        console.error("Error generating JWT:", error);
        res.status(500).json({ error: "Failed to generate JWT" });
      }
    });
    app.post("/logout", (req, res) => {
      res.clearCookie("jwt-token", {
        httpOnly: true,
        secure: false,
      });
      res.json({ message: "Logged out successfully" });
    });
    app.post("/products", verifyJwt, verifyAdmin, async (req, res) => {
      try {
        const product = req.body;
        console.log("Adding product:", product);
        const result = await productsCollection.insertOne(product);
        res.status(201).json({
          status: "success",
          message: "Product added successfully",
          data: result,
        });
      } catch (error) {
        console.log(error);
        res.status(500).json({
          status: "error",
          message: "Failed to add product",
          error: error.message,
        });
      }
    });

    app.get("/products", async (req, res) => {
      try {
        const query = {};
        const productdb = productsCollection.find(query);
        const products = await productdb.toArray();
        res.send({
          status: "success",
          message: "Products fetched successfully",
          data: products,
        });
      } catch (error) {
        console.log(error);
        res.status(500).json({
          status: "error",
          message: "Failed to fetch products",
          error: error.message,
        });
      }
    });
    // Product update API (PATCH)
    app.patch("/products/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const options = { upsert: true };
        const data = req.body;
        const updateData = {
          $set: {
            name: data.name,
            price: data.price,
            stock: data.stock, // Use stock instead of quantity
            description: data.description,
            image: data.image,
            category: data.category,
          },
        };

        const result = await productsCollection.updateOne(
          filter,
          updateData,
          options
        );
        res.status(200).json({
          status: "success",
          message: "Product updated successfully",
          data: result,
        });
      } catch (error) {
        console.log(error);
        res.status(500).json({
          status: "error",
          message: "Failed to update product",
          error: error.message,
        });
      }
    });

    // product delete api

    app.delete("/products/:id", async (req, res) => {
      try {
          // const token = req.headers.authorization.split(" ")[1];
        const id = req.params.id;
         console.log("Deleting product with ID:", id);
        const filter = { _id: new ObjectId(id) };
        const result = await productsCollection.deleteOne(filter);
          console.log("Delete result:", result);
        if (result.deletedCount === 1) {
          res.status(200).json({
            status: "success",
            message: "Product deleted successfully",
            data: result,
          });
        } else {
          res.status(404).json({
            status: "error",
            message: "Product not found",
          });
        }
      } catch (error) {
        console.log(error);
        res.status(500).json({
          status: "error",
          message: "Failed to delete product",
          error: error.message,
        });
      }
    });
     // usersApi API
    app.post("/users", async (req, res) => {
      try {
        const user = req.body;
        console.log("Attempting to insert user:", user);
        const result = await usersCollection.insertOne(user);
        console.log("Insert result:", result);
        res.status(201).json({
          status: "success",
          message: "User added successfully",
          data: result,
        });
      } catch (error) {
        console.log("User insert error:", error);
        res.status(500).json({
          status: "error",
          message: "Failed to add user",
          error: error.message,
        });
      }
    });
    app.get("/users/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const query = { email: email };
        const userdb = usersCollection.find(query);
        const users = await userdb.toArray();
        res.send({
          status: "success",
          message: "Users fetched successfully",
          data: users,
        });
      } catch (error) {
        console.log(error);
        res.status(500).json({
          status: "error",
          message: "Failed to fetch users",
          error: error.message,
        });
      }
    });
    // check isAdmin API
    app.post("/users/admin/:email", async (req, res) => {
      try {
        const email = req.params.email;
        console.log("Checking admin status for email:", email);

        const query = { email: email };
        const user = await usersCollection.findOne(query);
        if (user && user.isAdmin) {
          res.status(200).json({ isAdmin: true });
        } else {
          res.status(200).json({ isAdmin: false });
        }
      } catch (error) {
        console.log(error);
        res.status(500).json({
          status: "error",
          message: "Failed to check admin status",
          error: error.message,
        });
      }
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});