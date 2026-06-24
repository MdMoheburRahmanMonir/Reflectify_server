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
		const reportCollection = db.collection('report');


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

		// Like Increment Decrement 👍
		app.patch('/api/like/increment-decrement', async (req, res) => {
			try {
				const { isLike, lessonId, likerId } = req.body;
				if (!lessonId || !likerId) {
					return res.send({ error: "Invalid request, You are trying without login" });
				}
				const id = new ObjectId(lessonId);
				const lesson = await addLessonCollection.findOne({ _id: id })
				if (!lesson) {
					return res.send('Data not exist.')
				}
				if (isLike) {
					const result = await addLessonCollection.updateOne({ _id: id }, { $addToSet: { likes: likerId }, $inc: { likeCount: 1 } })
					res.send(result)
				} else {
					const result = await addLessonCollection.updateOne({ _id: id }, { $pull: { likes: likerId }, $inc: { likeCount: -1 } });
					res.send(result)
				}
				res.send('No action found')

			} catch (error) {
				console.error(error);
				return res.status(500).send({ error: "Server error" });
			}
		})

		// Saved Increment Decrement 🔖
		app.patch('/api/like/saved-unsaved', async (req, res) => {
			try {
				const { isSaved, lessonId, saverId } = req.body;
				if (!lessonId || !saverId) {
					return res.send({ error: "Invalid request, You are trying without login" });
				}
				const id = new ObjectId(lessonId);
				const lesson = await addLessonCollection.findOne({ _id: id })
				if (!lesson) {
					return res.send('Data not exist.')
				}
				if (isSaved) {
					const result = await addLessonCollection.updateOne({ _id: id }, { $addToSet: { savedLesson: saverId }, $inc: { savedCount: 1 } })
					res.send(result)
				} else {
					const result = await addLessonCollection.updateOne({ _id: id }, { $pull: { savedLesson: saverId }, $inc: { savedCount: -1 } });
					res.send(result)
				}
				res.send('No action found')

			} catch (error) {
				console.error(error);
				return res.status(500).send({ error: "Server error" });
			}
		})

		// Report Post Api ®️
		app.post('/api/report/post', async (req, res) => {
			try {
				const { reporterId, reporterEmail, lessonId, reportImage, reportDetails, reportReason } = req.body

				const user = await usersCollection.findOne({ _id: new ObjectId(reporterId) })
				const lessonCollection = await addLessonCollection.findOne({ _id: new ObjectId(lessonId) })
				if (!user) {
					return res.status(403).send({ error: "Unauthorized status code" })
				}
				if (!lessonCollection) {
					return res.status(403).send({ error: "Unauthorized status code" })
				}

				const data = await reportCollection.insertOne(req.body);
				res.send(data)
			} catch (error) {
				console.error(error);
				return res.status(500).send({ error: "Server error" });
			}
		})















		// LessonDetails : Dynamic Page [id]

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




				const data = await addLessonCollection.findOne({ _id: new ObjectId(id) })
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

		// Get Report For admin ®️
		app.get('/api/admin/dashboard/get-report', async (req, res) => {
			try {
				const session = req.headers["session"];
				const userSession = JSON.parse(session)
				if (userSession?.user?.role !== 'admin') {
					return res.status(403).send({ error: "Unauthorized status code" })
				}
				// const { lessonId } = req.query;
				const data = await reportCollection.aggregate([
					{
						$group: {
							_id: "$lessonId",
							lessonTitle: { $first: "$lessonTitle" },
							count: { $sum: 1 }
						}
					},
					{
						$project: {
							_id: 0,
							lessonId: "$_id",
							lessonTitle: 1,
							count: 1
						}
					}
				]).toArray();
				res.send(data)
			} catch (error) {
				console.error(error);
				return res.status(500).send({ error: "Server error" });
			}
		})

		// Get Report details For admin 
		app.get('/api/get-all-report-by-lesson-id/:id', async (req, res) => {
			try {
				const { id } = req.params;
				const data = await reportCollection.find({ lessonId: id }).toArray()
				res.send(data)
			} catch (error) {
				console.error(error);
				return res.status(500).send({ error: "Server error" });
			}
		})

		// Report and lesson both delete. (Manage Lesson)
		app.delete('/api/delete-full-report/:id', async (req, res) => {
			try {
				const { id } = req.params;
				const role = req.body.role;
				if (role !== 'admin') {
					return res.send('You are Normal User')
				}
				const reportDelete = await reportCollection.deleteMany({ lessonId: id });
				const lessonDelete = await addLessonCollection.deleteOne({ _id: new ObjectId(id) })
				res.send({ reportDelete, lessonDelete })
			} catch (error) {
				console.error(error);
				return res.status(500).send({ error: "Server error" });
			}
		})

		// Only Report delete. (Manage Lesson)
		app.delete('/api/delete-report-only/:id', async (req, res) => {
			try {
				const { id } = req.params;
				const role = req.body.role;
				if (role !== 'admin') {
					return res.send('You are Normal User')
				}
				const reportDelete = await reportCollection.deleteMany({ lessonId: id });
				res.send(reportDelete)
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

		// My Favorite lesson for show
		app.get('/api/user/dashboard/my-favorite-lesson/:id', async (req, res) => {
			try {
				const { id } = req.params;
				const data = await addLessonCollection.find({
					savedLesson: id
				}).toArray()
				console.log(data);
				res.send(data)
				
				// if (!data) {
				// 	return res.status(403).send({ error: "Unauthorized status code" })
				// }

				// const lessons = await addLessonCollection
				// 	.find({ userId: id })
				// 	.toArray();

				// res.send(lessons)
			} catch (error) {
				console.error(error);
				return res.status(500).send({ error: "Server error" });
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