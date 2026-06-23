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
		// await client.connect();

		const dbjobs = client.db('jobsdb');
		const collection = dbjobs.collection('jobs')
		const db = client.db('jobportal');
		const usersCollection = db.collection('user');
		const subscriptionCollection = db.collection('subscription');
		const addLessonCollection = db.collection('add_lesson');


		// Other Collection Data for showing purpose 
		app.get('/api/jobs', async (req, res) => {
			const jobsData = await collection.find().toArray();
			res.send(jobsData);
		})





		// Subscription

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







		// Home

		// Admin get data for user  get Operation  (Manage User)
		app.get('/api/public/lesson', async (req, res) => {
			try {


				const data = await addLessonCollection.find({ status: 'approved', privacy: 'public', anyoneCanSee: true }).toArray()
				res.send(data);

			} catch (error) {
				console.error(error);
				return res.status(500).send({ error: "Server error" });
			}
		})





		// LessonDetails

		// Lesson Details Page Api 
		app.get('/api/lesson/details/:id', async (req, res) => {
			try {
				const id = req.params.id;
				const BrowserData = req.headers["session"]
				const session = JSON.parse(BrowserData)
				console.log(session.user.role);
				if (!session?.user) {
					return res.send("UnAuthorize access")					
				}

				 


				const data = await addLessonCollection.findOne({_id: new ObjectId(id)}) 
				res.send(data);

			} catch (error) {
				console.error(error);
				return res.status(500).send({ error: "Server error" });
			}
		})













		// Admin

		// Admin get data for user  get Operation  (Manage User)
		app.get('/api/admin/dashboard/get-user/:id', async (req, res) => {
			try {
				const id = req.params.id;
				const user = await usersCollection.findOne({
					_id: new ObjectId(id)
				})
				if (!user) {
					return res.status(403).send({ error: "Unauthorized status code" })
				}
				const userData = await usersCollection.find({}).toArray();
				res.send(userData)

			} catch (error) {
				console.error(error);
				return res.status(500).send({ error: "Server error" });
			}
		})

		// Admin Crud Operation for user data DELETE Operation (Manage User)
		app.delete('/api/admin/dashboard/delete-user/:id', async (req, res) => {
			try {
				const id = req.params.id;

				const userData = await usersCollection.deleteOne({ _id: new ObjectId(id) });
				res.send(userData)

			} catch (error) {
				console.error(error);
				return res.status(500).send({ error: "Server error" });
			}
		})

		// Admin Crud Operation for user data UPDATE Operation role (Manage User)
		app.patch('/api/admin/dashboard/update-user-role/:id', async (req, res) => {
			try {
				const id = req.params.id;
				const bodyData = req.body.role;
				const myIdFromCLient = req.body.myId;
				const user = await usersCollection.findOne({ _id: new ObjectId(myIdFromCLient) })

				if (user.role === 'user' || user._id.toString() === id) {
					return res.send("You can't change your role")
				}
				const userData = await usersCollection.updateOne({ _id: new ObjectId(id) }, { $set: { role: bodyData } });
				res.send(userData)

			} catch (error) {
				console.error(error);
				return res.status(500).send({ error: "Server error" });
			}
		})

		// Admin Crud Operation for user data UPDATE Operation plan (Manage User)
		app.patch('/api/admin/dashboard/update-user-plan/:id', async (req, res) => {
			try {
				const id = req.params.id;
				const bodyData = req.body.plan;
				const myIdFromCLient = req.body.myId;
				const user = await usersCollection.findOne({ _id: new ObjectId(myIdFromCLient) })

				if (user.role === 'user') {
					return res.send("You can't change your role")
				}
				const userData = await usersCollection.updateOne({ _id: new ObjectId(id) }, { $set: { plan: bodyData } });
				res.send(userData)

			} catch (error) {
				console.error(error);
				return res.status(500).send({ error: "Server error" });
			}
		})


		// Admin Crud Operation for user data UPDATE Operation plan (Manage Lesson)
		app.get('/api/admin/dashboard/get-lesson', async (req, res) => {
			try {
				const userData = await addLessonCollection.find({}).toArray();
				res.send(userData)
			} catch (error) {
				console.error(error);
				return res.status(500).send({ error: "Server error" });
			}
		})

		// Admin Crud Operation for user data DELETE Operation plan (Manage Lesson)
		app.delete('/api/admin/dashboard/delete-lesson/:id', async (req, res) => {
			try {
				const id = req.params.id;
				const role = req.body.role;
				if (role === 'user') {
					return res.send('You are Normal User')
				}
				const userData = await addLessonCollection.deleteOne({ _id: new ObjectId(id) });
				res.send(userData)
			} catch (error) {
				console.error(error);
				return res.status(500).send({ error: "Server error" });
			}
		})

		// Admin Crud Operation for user data UPDATE Operation plan (Manage Lesson) (Privacy update, post can public or private by admin)
		app.patch('/api/admin/dashboard/status-public-or-private-lesson/:id', async (req, res) => {
			try {
				const id = req.params.id;
				const statusValue = req.body.anyoneCanSee;
				console.log(typeof statusValue);

				const userData = await addLessonCollection.updateOne({ _id: new ObjectId(id) }, { $set: { anyoneCanSee: statusValue } });
				res.send(userData)
			} catch (error) {
				console.error(error);
				return res.status(500).send({ error: "Server error" });
			}
		})
		// Admin Crud Operation for user data UPDATE Operation plan (Manage Lesson) (Status Update how permit post active)
		app.patch('/api/admin/dashboard/status-update/:id', async (req, res) => {
			try {
				const id = req.params.id;
				const statusValue = req.body.status;
				console.log(typeof statusValue);

				const userData = await addLessonCollection.updateOne({ _id: new ObjectId(id) }, { $set: { status: statusValue } });
				res.send(userData)
			} catch (error) {
				console.error(error);
				return res.status(500).send({ error: "Server error" });
			}
		})

		// Admin Crud Operation for user data UPDATE Operation plan (Manage Lesson) (admin view or not)
		app.patch('/api/admin/dashboard/admin-view/:id', async (req, res) => {
			try {
				const id = req.params.id;
				const isView = req.body.isViewAdmin;
				console.log(typeof isView);

				const userData = await addLessonCollection.updateOne({ _id: new ObjectId(id) }, { $set: { isViewAdmin: isView } });
				res.send(userData)
			} catch (error) {
				console.error(error);
				return res.status(500).send({ error: "Server error" });
			}
		})










		// user

		// User Add Lessons route api
		app.post('/api/user/dashboard/add-lesson/:id', async (req, res) => {
			try {
				const id = req.params.id;
				const data = req.body
				data.createdTime = new Date();
				const user = await usersCollection.findOne({ _id: new ObjectId(id) })

				if (!user) {
					return res.status(403).send({ error: "Unauthorized status code" })
				}
				const lesson = await addLessonCollection.insertOne(data)
				res.send(lesson)
			} catch (error) {
				console.error(error);
				return res.status(500).send({ error: "Server error" });
			}
		})

		// User Fetch Lessons route api
		app.get('/api/user/dashboard/my-lessons/:id', async (req, res) => {
			try {
				const id = req.params.id;
				const user = await usersCollection.findOne({
					_id: new ObjectId(id)
				})

				if (!user) {
					return res.status(403).send({ error: "Unauthorized status code" })
				}

				const lessons = await addLessonCollection
					.find({ userId: id })
					.toArray();

				res.send(lessons)
			} catch (error) {
				console.error(error);
				return res.status(500).send({ error: "Server error" });
			}
		})

		// User Fetch Lesson Delete api
		app.delete('/api/user/dashboard/delete-lesson/:id', async (req, res) => {
			try {
				const id = req.params.id;
				const bodyData = req.body;
				const isMatchLessonId = await addLessonCollection.findOne({ _id: new ObjectId(id) })
				if (!isMatchLessonId) {
					res.status(403).send({ error: "Something wrong with your Data!" })
				}
				const isMatchUserId = await usersCollection.findOne({ _id: new ObjectId(bodyData.userId) })
				if (isMatchUserId) {
					console.log('User true');
				}
				const data = await addLessonCollection.deleteOne({ _id: new ObjectId(id) })
				res.send(data)
			} catch (error) {
				console.error(error);
				return res.status(500).send({ error: "Server error" });
			}
		})

		// User Fetch Lesson Update api
		app.patch('/api/user/dashboard/update-lesson/:id', async (req, res) => {
			try {
				const id = req.params.id;
				const bodyData = req.body;
				const isMatchLessonId = await addLessonCollection.findOne({ _id: new ObjectId(id) })
				if (!isMatchLessonId) {
					res.status(403).send({ error: "Something wrong with your Data!" })
				}
				const isMatchUserId = await usersCollection.findOne({ _id: new ObjectId(bodyData.userId) })
				if (isMatchUserId) {
					console.log('User true');
				}

				const data = await addLessonCollection.updateOne({ _id: new ObjectId(id) }, { $set: bodyData })
				res.send(data)


			} catch (error) {
				console.error(error);
				return res.status(500).send({ error: "Server error." });
			}
		})

















		app.use((req, res) => {
			res.send('You are searching invalid route.')
		})
		// Send a ping to confirm a successful connection
		// await client.db("admin").command({ ping: 1 });
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