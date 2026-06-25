# Reflectify Server

This repository contains the backend API server for the Reflectify application. It is built with Express.js and MongoDB, and exposes REST endpoints for subscriptions, lesson management, reporting, admin moderation, and user dashboard operations.

## Table of Contents

- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Server Architecture](#server-architecture)
- [Collections Used](#collections-used)
- [API Endpoints](#api-endpoints)
  - [Public APIs](#public-apis)
  - [Subscription APIs](#subscription-apis)
  - [Like / Save APIs](#like--save-apis)
  - [Report APIs](#report-apis)
  - [Lesson APIs](#lesson-apis)
  - [Admin APIs](#admin-apis)
  - [User APIs](#user-apis)
- [Notes](#notes)

## Getting Started

1. Clone the repository.
2. Install dependencies:

```bash
cd reflectify-server
npm install
```

3. Create a `.env` file from `.env.example` and fill in your values.
4. Start the server:

```bash
npm run dev
```

By default the server listens on `PORT` from `.env`.

## Environment Variables

Create a `.env` file in `reflectify-server` with the following values:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority
PORT=5000
```

`MONGODB_DB` is optional in the example but the server uses the database names `jobportal` and `jobsdb`.

## Available Scripts

- `npm run dev` - start the server with `nodemon` for development.
- `npm start` - run the production server.

## Server Architecture

- `index.js` contains the Express application and all route definitions.
- `dotenv` loads environment variables.
- `cors` enables cross-origin requests.
- `express.json()` parses JSON request bodies.
- `mongodb` is used for data storage and query operations.

## Collections Used

- `jobs` (in database `jobsdb`)
- `user` (in database `jobportal`)
- `subscription` (in database `jobportal`)
- `add_lesson` (in database `jobportal`)
- `report` (in database `jobportal`)

## API Endpoints

### Public APIs

- `GET /api/jobs`
  - Returns all job records from the `jobs` collection.

- `GET /api/public/lesson`
  - Returns all approved public lessons that are visible to anyone.

- `GET /api/public/lesson/full`
  - Returns all lessons from the `add_lesson` collection.

### Subscription APIs

- `POST /api/subscription/update/:id`
  - Updates a users plan.
  - Request body:
    - `plan` (required)
    - `id` (subscription transaction id or reference)
    - `userEmail`

### Like / Save APIs

- `PATCH /api/like/increment-decrement`
  - Toggles like state for a lesson.
  - Request body:
    - `isLike` (boolean)
    - `lessonId`
    - `likerId`

- `PATCH /api/like/saved-unsaved`
  - Toggles saved state for a lesson.
  - Request body:
    - `isSaved` (boolean)
    - `lessonId`
    - `saverId`

### Report APIs

- `POST /api/report/post`
  - Create a report for a lesson.
  - Request body:
    - `reporterId`
    - `reporterEmail`
    - `lessonId`
    - `reportImage`
    - `reportDetails`
    - `reportReason`

### Lesson APIs

- `GET /api/lesson/details/:id`
  - Returns a lesson by ID.
  - The route expects a request header `session` containing JSON session data.

### Admin APIs

- `GET /api/admin/dashboard/get-user/:id`
  - Returns all users if the requesting user exists.

- `DELETE /api/admin/dashboard/delete-user/:id`
  - Deletes a user by ID.

- `PATCH /api/admin/dashboard/update-user-role/:id`
  - Updates a users role.
  - Request body:
    - `role`
    - `myId`

- `PATCH /api/admin/dashboard/update-user-plan/:id`
  - Updates a users plan.
  - Request body:
    - `plan`
    - `myId`

- `GET /api/admin/dashboard/get-lesson`
  - Returns all lessons.

- `DELETE /api/admin/dashboard/delete-lesson/:id`
  - Deletes a lesson by ID.
  - Request body:
    - `role`

- `PATCH /api/admin/dashboard/status-public-or-private-lesson/:id`
  - Sets whether a lesson can be viewed by anyone.
  - Request body:
    - `anyoneCanSee`

- `PATCH /api/admin/dashboard/status-update/:id`
  - Updates lesson approval status.
  - Request body:
    - `status`

- `PATCH /api/admin/dashboard/admin-view/:id`
  - Updates admin view state for a lesson.
  - Request body:
    - `isViewAdmin`

- `GET /api/admin/dashboard/get-report`
  - Returns aggregated report counts by lesson.
  - Expects request header `session` containing JSON session data with `user.role === 'admin'`.

- `GET /api/get-all-report-by-lesson-id/:id`
  - Returns all report documents for a given lesson ID.

- `DELETE /api/delete-full-report/:id`
  - Deletes reports and the lesson by lesson ID.
  - Request body:
    - `role`

- `DELETE /api/delete-report-only/:id`
  - Deletes only reports for a lesson ID.
  - Request body:
    - `role`

### User APIs

- `POST /api/user/dashboard/add-lesson/:id`
  - Create a new lesson for the logged-in user.
  - Request body should contain lesson fields.

- `GET /api/user/dashboard/my-lessons/:id`
  - Returns lessons created by a specific user.

- `DELETE /api/user/dashboard/delete-lesson/:id`
  - Deletes a lesson by ID.
  - Request body should contain `userId` to validate the user.

- `PATCH /api/user/dashboard/update-lesson/:id`
  - Updates a lesson by ID.
  - Request body should contain the updated lesson properties and `userId`.

- `GET /api/user/dashboard/my-favorite-lesson/:id`
  - Returns lessons saved by a specific user.

## Notes

- Some routes expect a `session` header containing serialized JSON session data.
- Admin routes use role checks in the request body or session object.
- The server currently uses two MongoDB databases: `jobsdb` for jobs and `jobportal` for application data.
- Invalid routes return the message `You are searching invalid route.`

If you need the API docs updated with examples or request payloads for each endpoint, I can add a [Postman-style reference section](#) too.