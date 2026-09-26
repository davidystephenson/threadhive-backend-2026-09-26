import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import app from "../../src/app.js";
import Thread from "../../src/models/Thread.js";
import User from "../../src/models/User.js";
import Subreddit from "../../src/models/Subreddit.js";

process.env.JWT_SECRET = "thread-test-secret";
process.env.NODE_ENV = "test";

let mongoServer;
let user;
let subreddit;
let authToken;

const createAuthToken = (userId) =>
  jwt.sign({ userId: userId.toString() }, process.env.JWT_SECRET);

const createThread = (overrides = {}) =>
  Thread.create({
    title: "A test thread",
    content: "Thread content",
    author: user._id,
    subreddit: subreddit._id,
    ...overrides,
  });

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

beforeEach(async () => {
  await Promise.all([
    Thread.deleteMany({}),
    Subreddit.deleteMany({}),
    User.deleteMany({}),
  ]);

  user = await User.create({
    name: "Test User",
    email: "test@example.com",
    password: "hashed-password",
  });
  subreddit = await Subreddit.create({
    name: "testing",
    description: "Testing discussions",
    author: user._id,
  });
  authToken = createAuthToken(user._id);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe("/api/threads", () => {
  describe("authentication", () => {
    it("rejects requests without a bearer token", async () => {
      const response = await request(app).get("/api/threads");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        message: "Authentication required.",
      });
    });

    it("rejects an invalid bearer token", async () => {
      const response = await request(app)
        .get("/api/threads")
        .set("Authorization", "Bearer invalid-token");

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Invalid or expired authentication token.");
    });
  });

  describe("GET /api/threads", () => {
    it("returns threads in reverse chronological order", async () => {
      const olderThread = await createThread({
        title: "Older thread",
        createdAt: new Date("2025-01-01"),
      });
      const newerThread = await createThread({
        title: "Newer thread",
        createdAt: new Date("2025-01-02"),
      });

      const response = await request(app)
        .get("/api/threads")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Threads fetched successfully");
      expect(response.body.data.map((thread) => thread._id)).toEqual([
        newerThread._id.toString(),
        olderThread._id.toString(),
      ]);
      expect(response.body.data[0].author.name).toBe("Test User");
      expect(response.body.data[0].subreddit.name).toBe("testing");
    });

    it("returns not found when no threads exist", async () => {
      const response = await request(app)
        .get("/api/threads")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        message: "No threads found",
      });
    });
  });

  describe("GET /api/threads/:id", () => {
    it("returns a thread with its author and subreddit", async () => {
      const thread = await createThread();

      const response = await request(app)
        .get(`/api/threads/${thread._id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        message: "Thread fetched successfully",
        data: {
          _id: thread._id.toString(),
          title: "A test thread",
          author: { name: "Test User" },
          subreddit: { name: "testing" },
        },
      });
    });

    it("returns not found for a missing thread", async () => {
      const response = await request(app)
        .get(`/api/threads/${new mongoose.Types.ObjectId()}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        message: "Thread not found",
      });
    });
  });

  describe("POST /api/threads", () => {
    it("creates a thread for the authenticated user", async () => {
      const response = await request(app)
        .post("/api/threads")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "New thread",
          content: "A newly created thread",
          subreddit: subreddit._id.toString(),
          author: new mongoose.Types.ObjectId().toString(),
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        success: true,
        message: "Thread created successfully",
        data: {
          title: "New thread",
          content: "A newly created thread",
          author: { name: "Test User" },
          subreddit: { name: "testing", description: "Testing discussions" },
        },
      });

      const persistedThread = await Thread.findOne({ title: "New thread" });
      expect(persistedThread.author.toString()).toBe(user._id.toString());
      expect(persistedThread.subreddit.toString()).toBe(subreddit._id.toString());
    });

    it.each([
      ["title", { content: "Content", subreddit: "507f1f77bcf86cd799439011" }],
      ["content", { title: "Title", subreddit: "507f1f77bcf86cd799439011" }],
      ["subreddit", { title: "Title", content: "Content" }],
    ])("rejects a request missing %s", async (_missingField, body) => {
      const response = await request(app)
        .post("/api/threads")
        .set("Authorization", `Bearer ${authToken}`)
        .send(body);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: "Title, content, and subreddit are required.",
      });
      await expect(Thread.countDocuments()).resolves.toBe(0);
    });
  });

  describe("PUT /api/threads/:id", () => {
    it("updates an existing thread", async () => {
      const thread = await createThread();

      const response = await request(app)
        .put(`/api/threads/${thread._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ title: "Updated title", content: "Updated content" });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        message: "Thread updated successfully",
        data: {
          _id: thread._id.toString(),
          title: "Updated title",
          content: "Updated content",
        },
      });
      await expect(Thread.findById(thread._id)).resolves.toMatchObject({
        title: "Updated title",
        content: "Updated content",
      });
    });

    it("returns not found when updating a missing thread", async () => {
      const response = await request(app)
        .put(`/api/threads/${new mongoose.Types.ObjectId()}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ title: "Updated title" });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        message: "Thred not found",
      });
    });
  });

  describe("DELETE /api/threads/:id", () => {
    it("deletes an existing thread", async () => {
      const thread = await createThread();

      const response = await request(app)
        .delete(`/api/threads/${thread._id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        message: "Thread deleted successfully",
        data: { _id: thread._id.toString() },
      });
      await expect(Thread.exists({ _id: thread._id })).resolves.toBeNull();
    });

    it("returns not found when deleting a missing thread", async () => {
      const response = await request(app)
        .delete(`/api/threads/${new mongoose.Types.ObjectId()}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        message: "Thread not found",
      });
    });
  });
});