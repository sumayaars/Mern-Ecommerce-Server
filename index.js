const express = require("express");

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const app = express();
const dotenv = require("dotenv");
dotenv.config();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

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

    // prodcts api

    app.post("/products", async (req, res) => {
      try {
        const product = req.body;
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
      // product update api
      //put
      //patch  filter, options, document, update
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
              stock: data.quantity,
              description: data.description,
              image: data.image,
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
    });

    // product delete api

    app.delete("/products/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const result = await productsCollection.deleteOne(filter);
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
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});