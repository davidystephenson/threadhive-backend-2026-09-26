# ThreadHive Backend

ThreadHive Backend is an Express and MongoDB REST API for a community discussion platform. It provides authenticated users with a Reddit-style workflow for creating subreddits, publishing threads, commenting, and voting.

## Features

- User registration and login with bcrypt password hashing.
- JSON Web Token authentication with 24-hour tokens.
- Subreddit creation and retrieval with related threads.
- Thread creation, listing, retrieval, updating, and deletion.
- Comment creation and retrieval by thread.
- Upvotes, downvotes, and vote totals for threads and comments.
- Reverse-chronological thread and subreddit feeds.
- Helmet security headers, CORS, JSON body parsing, and rate limiting.
- Centralized JSON error responses.

## Tech Stack

- **Runtime:** Node.js with ECMAScript modules
- **Server:** Express 5
- **Database:** MongoDB with Mongoose
- **Authentication:** JSON Web Tokens and bcryptjs
- **Testing:** Vitest, Supertest, and MongoDB Memory Server
- **Development tools:** Nodemon and Prettier

## Architecture

The API follows a layered request flow:

```text
HTTP request
    -> routes
    -> authentication middleware and controllers
    -> services
    -> Mongoose models
    -> MongoDB
```

Controllers handle request input and response envelopes. Services contain database queries and application rules. Models define the User, Subreddit, Thread, and Comment collections.

## Project Structure

```text
.
├── main.js                 # Loads environment variables, connects to MongoDB, starts the app
├── server.js               # HTTP server lifecycle
├── db.js                   # MongoDB connection helpers
├── src/
│   ├── app.js              # Express app, middleware, and route mounting
│   ├── controllers/        # Request handlers
│   ├── middleware/         # JWT authentication and error handling
│   ├── models/             # Mongoose schemas
│   ├── routes/             # API route definitions
│   ├── services/           # Database access and business logic
│   ├── scripts/            # Database population and seed data
│   └── utils/              # Shared application utilities
├── tests/                  # Vitest and Supertest tests
├── .env.example            # Environment variable template
└── package.json            # Scripts and dependencies
```

## Getting Started

### Prerequisites

- Node.js and npm
- A reachable MongoDB instance

### Installation

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local environment file:

   ```bash
   cp .env.example .env
   ```

3. Update `.env` with values for your local MongoDB instance and a private JWT secret.

### Environment Variables

| Variable      | Description                                                     | Example                                |
| ------------- | --------------------------------------------------------------- | -------------------------------------- |
| `MONGODB_URI` | MongoDB connection string                                       | `mongodb://localhost:27017/w04Express` |
| `PORT`        | Port used by the HTTP server                                    | `5000`                                 |
| `JWT_SECRET`  | Secret used to sign and verify JWTs                             | `replace-with-a-long-random-secret`    |
| `NODE_ENV`    | Runtime environment; enables stack traces in development errors | `development`                          |

Do not commit `.env` or expose `JWT_SECRET`.

### Running the App

Start the development server with automatic restarts:

```bash
npm run dev
```

Start the application normally:

```bash
npm start
```

With the example configuration, the API is available at `http://localhost:5000`.

### Seed Data

The population script connects to `MONGODB_URI`, clears the User, Subreddit, Thread, and Comment collections, and inserts the sample data from `src/scripts/seed-data.js`.

```bash
npm run populate
```

This command is destructive. Use it only against a development or disposable database.

### Tests and Formatting

Run the test suite:

```bash
npm test
```

Format the project with Prettier:

```bash
npm run format
```

The thread endpoint tests use an in-memory MongoDB server and do not require a running external MongoDB instance.

## API

### Authentication

Register or log in to receive a token:

```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "password": "correct horse battery staple"
}
```

Registration requires a valid email and a password of at least eight characters. The response contains a `token` and a public `user` object.

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "ada@example.com",
  "password": "correct horse battery staple"
}
```

Use the returned token on protected endpoints:

```http
Authorization: Bearer <token>
```

### Endpoint Reference

All endpoints except registration and login require a valid bearer token.

| Method   | Route                            | Description                                  | Auth |
| -------- | -------------------------------- | -------------------------------------------- | ---- |
| `POST`   | `/api/auth/register`             | Register a user and return a JWT             | No   |
| `POST`   | `/api/auth/login`                | Authenticate a user and return a JWT         | No   |
| `GET`    | `/api/threads`                   | List threads, newest first                   | Yes  |
| `GET`    | `/api/threads/:id`               | Get one thread with its author and subreddit | Yes  |
| `POST`   | `/api/threads`                   | Create a thread                              | Yes  |
| `PUT`    | `/api/threads/:id`               | Update a thread                              | Yes  |
| `DELETE` | `/api/threads/:id`               | Delete a thread                              | Yes  |
| `GET`    | `/api/subreddits`                | List subreddits                              | Yes  |
| `POST`   | `/api/subreddits`                | Create a subreddit                           | Yes  |
| `GET`    | `/api/subreddits/:id`            | Get a subreddit and its threads              | Yes  |
| `GET`    | `/api/comments/thread/:threadId` | List comments for a thread                   | Yes  |
| `POST`   | `/api/comments`                  | Add a comment to a thread                    | Yes  |
| `POST`   | `/api/threads/:id/upvote`        | Upvote a thread                              | Yes  |
| `POST`   | `/api/threads/:id/downvote`      | Downvote a thread                            | Yes  |
| `POST`   | `/api/comments/:id/upvote`       | Upvote a comment                             | Yes  |
| `POST`   | `/api/comments/:id/downvote`     | Downvote a comment                           | Yes  |

### Request Bodies

Create a thread:

```json
{
  "title": "How do I learn Node.js?",
  "content": "I am new to backend development.",
  "subreddit": "<subreddit-id>"
}
```

Create a subreddit:

```json
{
  "name": "node",
  "description": "Node.js news and discussions"
}
```

Create a comment:

```json
{
  "thread": "<thread-id>",
  "content": "Check out the Node.js documentation."
}
```

The authenticated user is taken from the JWT for new threads, subreddits, and comments; clients should not use the request body to set the author or user.

### Response Format

Successful responses use this envelope:

```json
{
  "success": true,
  "message": "Thread fetched successfully",
  "data": {}
}
```

Errors use the following shape:

```json
{
  "success": false,
  "message": "Authentication required."
}
```

When `NODE_ENV=development`, error responses also include a `stack` property.

## Data Model

- **User:** name, unique email, hashed password, and timestamps.
- **Subreddit:** unique name, description, author, and timestamps.
- **Thread:** title, content, author, subreddit, vote arrays, vote totals, and timestamps.
- **Comment:** thread, user, content, vote arrays, vote total, and timestamps.

Votes are tracked per user. A new vote removes the user from the opposite vote list and recalculates the upvote, downvote, and net `voteCount` values.

## Screenshots

This repository contains an API service and does not include a graphical frontend, so screenshots are not applicable.

## License

This project is licensed under the ISC license specified in `package.json`.
