const { MongoClient, ServerApiVersion } = require("mongodb");
const express = require("express");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "cred/.env") });

const username = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const dbName = process.env.MONGO_DB_NAME;
const collectionName = process.env.MONGO_COLLECTION;

const uri = `mongodb+srv://${username}:${password}@cluster0.qj0ib.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Command-line argument validation
if (process.argv.length !== 3) {
  console.log("Usage: node summerCampServer.js <portNum>");
  process.exit(1);
}
const portNumber = process.argv[2];

// MongoDB setup
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });

const databaseAndCollection = { db: dbName, collection: collectionName };

// MongoDB Functions
async function insertApplicant(client, databaseAndCollection, newApplicant) {//for insert
  const result = await client
    .db(databaseAndCollection.db)
    .collection(databaseAndCollection.collection)
    .insertOne(newApplicant);
  console.log(`Applicant entry created with id ${result.insertedId}`);
}
//For Review 
async function findApplicantByEmail(client, databaseAndCollection, email) {
  return await client
    .db(databaseAndCollection.db)
    .collection(databaseAndCollection.collection)
    .findOne({ email: email });
}
//for GPA
async function findApplicantsByGPA(client, databaseAndCollection, GPA) {
  const cursor = client
    .db(databaseAndCollection.db)
    .collection(databaseAndCollection.collection)
    .find({ gpa: { $gte: GPA } });
  const results = await cursor.toArray();

  let table = "<table border='1'><tr><th>Name</th><th>GPA</th></tr>";
  if (results) {
    results.forEach((entry) => {
      table += `<tr><td>${entry.name}</td><td>${entry.gpa.toFixed(
        1
      )}</td></tr>`;
    });
  }
  table += "</table>"; // Close the table

  return table;
}
//For remove
async function deleteAllApplicants(client, databaseAndCollection) {
  const result = await client
    .db(databaseAndCollection.db)
    .collection(databaseAndCollection.collection)
    .deleteMany({});
  return result.deletedCount;
}
// Express app setup
const app = express();
app.use(express.urlencoded({ extended: true }));
app.set("views", path.join(__dirname, "templates"));
app.set("view engine", "ejs");

//main function
async function main() {
  try {
    //connect
    await client.connect();
    // Routes
    app.get("/", (req, res) => {
      res.render("index");
    });

    app.get("/apply", (req, res) => {
      res.render("apply");
    });

    app.post("/processApplication", async (req, res) => {
      const { name, email, gpa, background } = req.body;
      const newApplicant = {
        name,
        email,
        gpa: parseFloat(gpa),
        background,
      };
      
      let insert_sucess = await insertApplicant(
        client,
        databaseAndCollection,
        newApplicant
      );
      res.render("processApplication", {newApplicant});
    });

    app.get("/reviewApplication", (req, res) => {
      res.render("reviewApplication");
    });

    app.get("/processReviewApplication", async (req, res) => {
      const email = req.query.email;
      const applicant = await findApplicantByEmail(
        client,
        databaseAndCollection,
        email
      );
      
      if (applicant) {
        res.render("processReviewApplication", { applicant});
      } else {
        res.send("<p>No applicant found </p>");
      }
    });

    app.get("/adminGFA", (req, res) => {
      res.render("adminGFA");
    });

    app.post("/processAdminGFA", async (req, res) => {
      const GPA = parseFloat(req.body.gpa); 
      const table_gpa = await findApplicantsByGPA(
        client,
        databaseAndCollection,
        GPA
      );
      res.render("processAdminGFA", { table_gpa });
    });

    app.get("/adminRemove", (req, res) => {
      res.render("adminRemove");
    });

    app.post("/processAdminRemove", async (req, res) => {
      const deletedCount = await deleteAllApplicants(
        client,
        databaseAndCollection
      );
      const timestamp = new Date().toLocaleString();
      res.render("processAdminRemove", { deletedCount, timestamp });
    });
    // Start the Express server
    app.listen(portNumber, () => {
      console.log(`Web server is running at http://localhost:${portNumber}`);
      process.stdout.write(prompt);
    });

    // Command-line interface interpreter
    const prompt = "Stop to shutdown the server: ";
    process.stdin.setEncoding("utf8");

    process.stdin.on("readable", () => {
      const dataInput = process.stdin.read();
      if (dataInput !== null) {
        const command = dataInput.trim();
        if (command === "stop") {
          console.log("Shutting down the server");
          process.exit(0);
        } else {
          console.log(`Invalid command: ${command}`);
        }
        process.stdout.write(prompt);
        process.stdin.resume();
      }
    });
  }catch (err) {
    console.error("Error MongoDB", err);
    process.exit(1); // Exit the process 
  }
}
// Call the main function
main();
