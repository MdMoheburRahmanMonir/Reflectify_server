const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT;
app.use(cors());
app.use(express.json());

const MONGODB_URI = process.env.MONGO_DB_URI;



// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(MONGODB_URI, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	}
});

async function run() {
	try {
		// Connect the client to the server	(optional starting in v4.7)
		await client.connect();

		const dbjobs = client.db('jobsdb');
		const collection = dbjobs.collection('jobs')
		const db = client.db('jobportal');
		const usersCollection = db.collection('user');
		const subscriptionCollection = db.collection('subscription');

		app.get('/api/jobs', async (req, res) => {
			const jobsData = await collection.find().toArray();
			res.send(jobsData);
		})
		// Subscription update route
		app.post('/api/subscription/update/:id', async (req, res) => {
			try {
				const userId = req.params.id;
				const { plan, id, userEmail } = req.body;

				if (!plan) {
					return res.status(400).json({ error: 'Plan is required' });
				}
				const objectId = new ObjectId(userId);

				await usersCollection.updateOne({ _id: objectId }, { $set: { plan } });

				await subscriptionCollection.insertOne({ plan, id, userEmail, createdAt: new Date() })

				return res.send({ success: true, message: "Subscription updated successfully" })


			} catch (error) {
				console.error(error);
				return res.status(500).send({ error: "Server error" });
			}
		})






		app.use((req, res) => {
			res.send('Hello world')
		})
		// Send a ping to confirm a successful connection
		await client.db("admin").command({ ping: 1 });
		console.log("Pinged your deployment. You successfully connected to MongoDB!");
	} finally {
		// Ensures that the client will close when you finish/error
		// await client.close();
	}
}
run().catch(console.dir);


app.listen(port, () => {
	console.log(`Example app listening on port ${port}`)
})