const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;

exports.handler = async (event) => {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected correctly to server");

    const db = client.db("test");
    const collection = db.collection("example");

    await collection.deleteMany();
    const result = await collection.insertMany(sampleData);
    console.log(`${result.insertedCount} documents were inserted`);

    const data = await collection.find({}).toArray();
    return {
      statusCode: 200,
      body: data,
    };
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
  }
};

// Sample data to be inserted
const sampleData = [
  { name: "John Doe", age: 30, profession: "Engineer" },
  { name: "Jane Doe", age: 25, profession: "Designer" },
  { name: "Mike Smith", age: 35, profession: "Developer" },
  { name: "Sara Wilson", age: 28, profession: "Manager" },
];
