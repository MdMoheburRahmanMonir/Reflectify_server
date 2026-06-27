const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');
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

const JWKS = createRemoteJWKSet(
	new URL(`https://reflectify-client.vercel.app/api/auth/jwks`)
)
const verifyAdmin = async (req, res, next) => {

	const userToken = req?.headers?.token;
	if (!userToken) {
		return res.status(401).send({ error: "Unauthorized status code" });
	}
	const token = userToken.split(" ")[1];
	if (!token) {
		return res.status(401).send({ error: "Unauthorized status code" });
	}
	try {
		const { payload } = await jwtVerify(token, JWKS)
		if (payload.role !== 'admin') {
			return res.status(403).send({ error: "Unauthorized status code" });
		}
		next()
	} catch (error) {
		console.log(error);
		res.send({ error: "Unauthorized status code" })
	}
}

const verifyUser = async (req, res, next) => {

	const userToken = req?.headers?.token;
	if (!userToken) {
		return res.status(401).send({ error: "Unauthorized status code" });
	}
	const token = userToken.split(" ")[1];
	if (!token) {
		return res.status(401).send({ error: "Unauthorized status code" });
	}
	try {
		const { payload } = await jwtVerify(token, JWKS)
		if (payload.role !== 'user') {
			return res.status(403).send({ error: "Unauthorized status code" });
		}
		next()
	} catch (error) {
		console.log(error);
		res.send({ error: "Unauthorized status code" })
	}
}
const VerifyToken = async (req, res, next) => {

	const userToken = req?.headers?.token;
	if (!userToken) {
		return res.status(401).send({ error: "Unauthorized status code" });
	}
	const token = userToken.split(" ")[1];
	if (!token) {
		return res.status(401).send({ error: "Unauthorized status code" });
	}
	try {
		const { payload } = await jwtVerify(token, JWKS)
		next()
	} catch (error) {
		console.log(error);
		res.send({ error: "Unauthorized status code" })
	}
}



const Token = async (req, res, next) => {
	const userToken = req?.headers?.token;
	console.log(userToken, "Previous Token of usr");
	const token = userToken.split(" ")[1];
	console.log(userToken, 'User Token is This one');
	next()
}


async function run() {
	try {
		// Connect the client to the server	(optional starting in v4.7)
		// await client.connect();

		const dbjobs = client.db('jobsdb');
		const collection = dbjobs.collection('jobs')
		const db = client.db('jobportal');
		const usersCollection = db.collection('user');
		const subscriptionCollection = db.collection('subscription');
		const lessonCollection = db.collection('add_lesson');
		const reportCollection = db.collection('report');
		const commentCollection = db.collection('comment');


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
				const [
					featuredLessonsSeed,
					MostSaveLesson,
					TopContributors,
				] = await Promise.all([
					lessonCollection.find({ status: 'approved', privacy: 'public', anyoneCanSee: true }).limit(6).toArray(),
					lessonCollection.aggregate([
						{
							$addFields: {
								savedLessonCount: {
									$size: { $ifNull: ["$savedLesson", []] }
								}
							}
						},
						{
							$sort: { savedLessonCount: -1 }
						},
						{
							$limit: 3
						}
					]).toArray(),
					lessonCollection.aggregate([
						{
							$group: {
								_id: "$userId",
								userName: { $first: "$userName" },
								category: { $first: "$category" },
								userImage: { $first: "$userImage" },
								lessonCount: { $sum: 1 }
							}
						},
						{
							$sort: { lessonCount: -1 }
						},
						{
							$limit: 7
						}
					]).toArray(),
				])

				return res.send({
					featuredLessonsSeed,
					MostSaveLesson,
					TopContributors
				});

			} catch (error) {
				console.error(error);
				return res.status(500).send({ error: "Server error" });
			}
		})

		// Admin get data for user  get Operation  (Manage User)
		app.get('/api/public/lesson/full', async (req, res) => {
			try {
				const data = await lessonCollection.find({}).toArray()
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
				const lesson = await lessonCollection.findOne({ _id: id })
				if (!lesson) {
					return res.send('Data not exist.')
				}
				if (isLike) {
					const result = await lessonCollection.updateOne({ _id: id }, { $addToSet: { likes: likerId }, $inc: { likeCount: 1 } })
					return res.send(result)
				} else {
					const result = await lessonCollection.updateOne({ _id: id }, { $pull: { likes: likerId }, $inc: { likeCount: -1 } });
					return res.send(result)
				}
				return res.send('No action found')

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
				const lesson = await lessonCollection.findOne({ _id: id })
				if (!lesson) {
					return res.send('Data not exist.')
				}
				if (isSaved) {
					const result = await lessonCollection.updateOne({ _id: id }, { $addToSet: { savedLesson: saverId }, $inc: { savedCount: 1 } })
					return res.send(result)
				} else {
					const result = await lessonCollection.updateOne({ _id: id }, { $pull: { savedLesson: saverId }, $inc: { savedCount: -1 } });
					return res.send(result)
				}
				return res.send('No action found')

			} catch (error) {
				console.error(error);
				return res.status(500).send({ error: "Server error" });
			}
		})

		// Report Post Api ®️
		app.post('/api/report/post', async (req, res) => {
			try {
				const { reporterId, reporterEmail, lessonId, reportImage, reportDetails, reportReason } = req.body
				const report = req.body;
				report.reportCreatingTime = new Date();
				const user = await usersCollection.findOne({ _id: new ObjectId(reporterId) })
				const lessonAll = await lessonCollection.findOne({ _id: new ObjectId(lessonId) })
				if (!user) {
					return res.status(403).send({ error: "Unauthorized status code" })
				}
				if (!lessonAll) {
					return res.status(403).send({ error: "Unauthorized status code" })
				}

				const data = await reportCollection.insertOne(report);
				res.send(data)
			} catch (error) {
				console.error(error);
				return res.status(500).send({ error: "Server error" });
			}
		})















		// LessonDetails : Dynamic Page [id]

		// Lesson Details Page Api 
		app.get('/api/lesson/details/:id', VerifyToken, async (req, res) => {
			try {
				const id = req.params.id;
				const BrowserData = req.headers["sessions"]

				const [
					lessonData,
					commentData
				] = await Promise.all([
					lessonCollection.findOne({ _id: new ObjectId(id) }),
					commentCollection.find({ lessonId: id }).sort({ commentTime: -1 }).toArray()
				])

				res.send({ lessonData, commentData });

			} catch (error) {
				console.error(error);
				return res.status(500).send({ error: "Server error" });
			}
		})















		// Admin

		// Admin get data for user  get Operation  (Manage User)
		app.get('/api/admin/dashboard/get-user/:id', verifyAdmin, async (req, res) => {
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
		app.delete('/api/admin/dashboard/delete-user/:id', verifyAdmin, async (req, res) => {
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
		app.patch('/api/admin/dashboard/update-user-role/:id', verifyAdmin, async (req, res) => {
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
		app.patch('/api/admin/dashboard/update-user-plan/:id', verifyAdmin, async (req, res) => {
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
		app.get('/api/admin/dashboard/get-lesson', verifyAdmin, async (req, res) => {
			try {
				const userData = await lessonCollection.find({}).toArray();
				res.send(userData)
			} catch (error) {
				console.error(error);
				return res.status(500).send({ error: "Server error" });
			}
		})

		// Admin Crud Operation for user data DELETE Operation plan (Manage Lesson)
		app.delete('/api/admin/dashboard/delete-lesson/:id', verifyAdmin, async (req, res) => {
			try {
				const id = req.params.id;
				const role = req.body.role;
				if (role === 'user') {
					return res.send('You are Normal User')
				}
				const userData = await lessonCollection.deleteOne({ _id: new ObjectId(id) });
				res.send(userData)
			} catch (error) {
				console.error(error);
				return res.status(500).send({ error: "Server error" });
			}
		})

		// Admin Crud Operation for user data UPDATE Operation plan (Manage Lesson) (Privacy update, post can public or private by admin)
		app.patch('/api/admin/dashboard/status-public-or-private-lesson/:id', verifyAdmin, async (req, res) => {
			try {
				const id = req.params.id;
				const statusValue = req.body.anyoneCanSee;

				const userData = await lessonCollection.updateOne({ _id: new ObjectId(id) }, { $set: { anyoneCanSee: statusValue } });
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

				const userData = await lessonCollection.updateOne({ _id: new ObjectId(id) }, { $set: { status: statusValue } });
				res.send(userData)
			} catch (error) {
				console.error(error);
				return res.status(500).send({ error: "Server error" });
			}
		})

		// Admin Crud Operation for user data UPDATE Operation plan (Manage Lesson) (admin view or not)
		app.patch('/api/admin/dashboard/admin-view/:id', verifyAdmin, async (req, res) => {
			try {
				const id = req.params.id;
				const isView = req.body.isViewAdmin;

				const userData = await lessonCollection.updateOne({ _id: new ObjectId(id) }, { $set: { isViewAdmin: isView } });
				res.send(userData)
			} catch (error) {
				console.error(error);
				return res.status(500).send({ error: "Server error" });
			}
		})

		// Get Report For admin ®️
		app.get('/api/admin/dashboard/get-report', verifyAdmin, async (req, res) => {
			try {

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
		app.get('/api/get-all-report-by-lesson-id/:id', verifyAdmin, async (req, res) => {
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
		app.delete('/api/delete-full-report/:id', verifyAdmin, async (req, res) => {
			try {
				const { id } = req.params;
				const reportDelete = await reportCollection.deleteMany({ lessonId: id });
				const lessonDelete = await lessonCollection.deleteOne({ _id: new ObjectId(id) })
				res.send({ reportDelete, lessonDelete })
			} catch (error) {
				console.error(error);
				return res.status(500).send({ error: "Server error" });
			}
		})

		// Only Report delete. (Manage Lesson)
		app.delete('/api/delete-report-only/:id', verifyAdmin, async (req, res) => {
			try {
				const { id } = req.params;
				console.log(id, 'the id is');
				const reportDelete = await reportCollection.deleteMany({ lessonId: id });
				res.send(reportDelete)
			} catch (error) {
				console.error(error);
				return res.status(500).send({ error: "Server error" });
			}
		})


		// Total user, Total Public lesson, Total Report, Today new lesson
		app.get('/api/admin/dashboard/user-activity', verifyAdmin, async (req, res) => {
			try {
				const session = req.headers.sessions;
				const userSession = JSON.parse(session)
				if (userSession?.user?.role !== 'admin') {
					return res.status(403).send({ error: "Unauthorized status code" })
				}
				const startOfToday = new Date();
				startOfToday.setHours(0, 0, 0, 0);
				const [
					totalUsers,
					publicLessons,
					newLessonsToday,
					reportedLessons,
					topContributors,
					lessonGrowth,
					userGrowth
				] = await Promise.all([
					usersCollection.countDocuments(),

					lessonCollection.countDocuments({
						$and: [
							{ anyoneCanSee: true },
							{ privacy: "public" }
						]
					}),
					lessonCollection.countDocuments({
						createdTime: {
							$gte: startOfToday
						}
					}),
					reportCollection.countDocuments({}),
					lessonCollection.aggregate([
						{
							$group: {
								_id: "$userId",
								userName: { $first: "$userName" },
								lessonCount: { $sum: 1 }
							}
						},
						{
							$sort: { lessonCount: -1 }
						},
						{
							$limit: 5
						}
					]).toArray(),
					lessonCollection.aggregate([
						{
							$match: {
								createdTime: {
									$gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
								}
							}
						},
						{
							$group: {
								_id: {
									$dateToString: {
										format: "%Y-%m-%d",
										date: "$createdTime"
									}
								},
								count: {
									$sum: 1
								}
							}
						},
						{
							$sort: {
								_id: 1
							}
						},
						{
							$project: {
								_id: 0,
								date: "$_id",
								count: 1
							}
						}
					]).toArray(),
					usersCollection.aggregate([
						{
							$match: {
								createdAt: {
									$gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
								}
							}
						},
						{
							$group: {
								_id: {
									$dateToString: {
										format: "%Y-%m-%d",
										date: "$createdAt"
									}
								},
								count: {
									$sum: 1
								}
							}
						},
						{
							$sort: {
								_id: 1
							}
						},
						{
							$project: {
								_id: 0,
								date: "$_id",
								count: 1
							}
						}
					]).toArray()
				]);
				res.send({ totalUsers, publicLessons, newLessonsToday, reportedLessons, topContributors, lessonGrowth, userGrowth })
			} catch (error) {
				console.error(error);
				return res.status(500).send({ error: "Server error" });
			}
		})



















		// user

		// User Add Lessons route api
		app.post('/api/user/dashboard/add-lesson/:id', verifyUser, async (req, res) => {
			try {
				const id = req.params.id;
				const data = req.body
				data.createdTime = new Date();
				const user = await usersCollection.findOne({ _id: new ObjectId(id) })

				if (!user) {
					return res.status(403).send({ error: "Unauthorized status code" })
				}
				const lesson = await lessonCollection.insertOne(data)
				res.send(lesson)
			} catch (error) {
				console.error(error);
				return res.status(500).send({ error: "Server error" });
			}
		})

		// User Fetch Lessons route api
		app.get('/api/user/dashboard/my-lessons/:id', verifyUser, async (req, res) => {
			try {
				const id = req.params.id;
				const user = await usersCollection.findOne({
					_id: new ObjectId(id)
				})

				if (!user) {
					return res.status(403).send({ error: "Unauthorized status code" })
				}

				const lessons = await lessonCollection
					.find({ userId: id })
					.toArray();

				res.send(lessons)
			} catch (error) {
				console.error(error);
				return res.status(500).send({ error: "Server error" });
			}
		})

		// User Fetch Lesson Delete api
		app.delete('/api/user/dashboard/delete-lesson/:id', verifyUser, async (req, res) => {
			try {
				const id = req.params.id;
				const bodyData = req.body;
				const isMatchLessonId = await lessonCollection.findOne({ _id: new ObjectId(id) })
				if (!isMatchLessonId) {
					res.status(403).send({ error: "Something wrong with your Data!" })
				}
				const isMatchUserId = await usersCollection.findOne({ _id: new ObjectId(bodyData.userId) })
				const data = await lessonCollection.deleteOne({ _id: new ObjectId(id) })
				res.send(data)
			} catch (error) {
				console.error(error);
				return res.status(500).send({ error: "Server error" });
			}
		})

		// User Fetch Lesson Update api
		app.patch('/api/user/dashboard/update-lesson/:id', verifyUser, async (req, res) => {
			try {
				const id = req.params.id;
				const bodyData = req.body;
				bodyData.LessonUpdatedTime = new Date();
				const isMatchLessonId = await lessonCollection.findOne({ _id: new ObjectId(id) })
				if (!isMatchLessonId) {
					res.status(403).send({ error: "Something wrong with your Data!" })
				}
				const isMatchUserId = await usersCollection.findOne({ _id: new ObjectId(bodyData.userId) })
				const data = await lessonCollection.updateOne({ _id: new ObjectId(id) }, { $set: bodyData })
				res.send(data)


			} catch (error) {
				console.error(error);
				return res.status(500).send({ error: "Server error." });
			}
		})

		// My Favorite lesson for show
		app.get('/api/user/dashboard/my-favorite-lesson/:id', verifyUser, async (req, res) => {
			try {
				const { id } = req.params;
				const data = await lessonCollection.find({
					savedLesson: id
				}).toArray()
				res.send(data)
			} catch (error) {
				console.error(error);
				return res.status(500).send({ error: "Server error" });
			}
		})

		// Dashboard All summary api
		app.get('/api/user/dashboard/all-summary/:id', verifyUser, async (req, res) => {
			try {
				const { id } = req.params;
				const user = await usersCollection.findOne({ _id: new ObjectId(id) })
				if (!user) {
					return res.status(403).send({ error: "Unauthorized status code" })
				}
				const startOfToday = new Date();
				const [Average, totalLessonCreated, TotalSavedLesson, RecentlyAddedLesson, PublicLike, topContributors] = await Promise.all([
					lessonCollection.aggregate([
						{
							$match: {
								userId: id,
								createdTime: {
									$gte: new Date(
										Date.now() - 7 * 24 * 60 * 60 * 1000
									)
								}
							}
						},
						{
							$group: {
								_id: {
									$dayOfWeek: "$createdTime"
								},
								createdLessons: { $sum: 1 }
							}
						},
						{
							$sort: { _id: 1 }
						}, {
							$project: {
								_id: 0,
								count: "$_id",
								createdLessons: 1
							}
						}
					]).toArray(),

					lessonCollection.countDocuments({ userId: id }),
					lessonCollection.countDocuments({ savedLesson: id }),
					lessonCollection.aggregate([
						{ $match: { userId: id } },
						{ $sort: { createdTime: -1 } },
						{ $limit: 5 }
					]).toArray(),
					lessonCollection.aggregate([
						{
							$match: { userId: id }
						},
						{
							$unwind: "$likes"
						},
						{
							$count: "totalLikes"
						}
					]).toArray(),
					lessonCollection.aggregate([
						{
							$group: {
								_id: "$userId",
								userName: { $first: "$userName" },
								lessonCount: { $sum: 1 }
							}
						},
						{
							$sort: { lessonCount: -1 }
						},
						{
							$limit: 5
						}
					]).toArray()
				])

				res.send({
					Average,
					totalLessonCreated,
					TotalSavedLesson,
					RecentlyAddedLesson,
					PublicLike,
					topContributors
				});

			} catch (error) {
				console.error(error);
				return res.status(500).send({ error: "Server error" });
			}
		})

		// User Add Lessons route api
		app.post('/api/user/comment/post', VerifyToken, async (req, res) => {
			try {
				const data = req.body
				console.log(data);

				const commentPost = await commentCollection.insertOne(data)
				res.send(commentPost)
			} catch (error) {
				console.error(error);
				return res.status(500).send({ error: "Server error" });
			}
		})

		// Dashboard All summary api
		app.get('/api/my-data-for-profile/:id', VerifyToken, async (req, res) => {
			try {
				const { id } = req.params;
				const user = await usersCollection.findOne({ _id: new ObjectId(id) })
				const startOfToday = new Date();
				const [
					publicData,
					publicSession
				] = await Promise.all([
					lessonCollection.aggregate([
						{
							$match: {
								userId: id,
								privacy: 'public'
							}
						},
						{
							$project: {
								_id: 1,
								title: 1,
								description: 1,
								category: 1,
								accessLevel: 1,
								date: "$createdTime",
								likes: "$likeCount",
								lessonPhoto: 1
							}
						},
						{
							$limit: 6
						}
					]).toArray(),
					usersCollection.find({ _id: new ObjectId(id) }).toArray(),
				])

				res.send({
					publicData, publicSession
				});

			} catch (error) {
				console.error(error);
				return res.status(500).send({ error: "Server error" });
			}
		})

		// Profile CoverPhoto Upload.
		app.patch('/api/profile-cover-image-upload/:id', async (req, res) => {
			try {
				const { id } = req.params;
				const { coverImage } = req.body;
				console.log(coverImage, 'The cover Image is');

				const upload = await usersCollection.updateOne({ _id: new ObjectId(id) }, { $set: { coverImage: coverImage } })
			} catch (error) {
				console.error(error);
				return res.status(500).send({ error: "Server error" });
			}
		})
 
		app.get('/api/get-user-cover/:id', async (req, res) => {
			try {
				const { id } = req.params;
				const user = await usersCollection.findOne(
					{ _id: new ObjectId(id) },
					{ projection: { coverImage: 1 } }  
				);
				return res.send({ coverImage: user?.coverImage || '' });
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