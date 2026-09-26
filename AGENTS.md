# ThreadHive Backend

## Project Shape

- This is an ESM Node.js REST API built with Express and Mongoose. Use `.js` extensions in local imports.
- Request flow is `routes -> controllers -> services -> models`.
- [src/app.js](src/app.js) owns middleware and route mounting. [main.js](main.js) loads environment variables, connects to MongoDB, and starts the server through [server.js](server.js).
- Keep controllers thin: validate request input, read authenticated user data, call a service, and return the established response envelope.
- Keep database queries and business rules in `src/services/`; keep schemas in `src/models/`; keep URL and middleware composition in `src/routes/`.

## Commands

Run from the repository root:

```bash
npm install
npm run dev       # nodemon main.js
npm start         # node main.js
npm test          # vitest run
npm run populate  # clears and repopulates MongoDB collections
npm run format    # prettier --write .
```

The app requires a reachable MongoDB instance and environment variables described in [.env.example](.env.example). Do not print, commit, or expose values from `.env`.

## Implementation Conventions

- Use `async`/`await` for handlers and services. Always let rejected promises reach [src/middleware/errorHandler.js](src/middleware/errorHandler.js); do not add repetitive controller `try/catch` blocks.
- Create application errors with [src/utils/createAppError.js](src/utils/createAppError.js), supplying an appropriate HTTP status. The error middleware formats failures as `{ success: false, message }` and includes a stack only in development.
- Successful handlers use `{ success: true, message, data }` and the status code appropriate to the operation.
- Validate required fields and request shape before calling services. Validate resource relationships and persistence outcomes in services.
- Preserve Mongoose validators, timestamps, and explicit population/select behavior when changing models or queries. Use reverse chronological sorting for feed-like results unless the endpoint requires another order.
- Keep changes scoped to the requested behavior. Do not change models just to implement route behavior unless a concrete schema defect requires it.

## Auth And Security

- Authentication is intended to use JWTs and `req.user.userId`; treat [src/middleware/authHandler.js](src/middleware/authHandler.js), [src/routes/auth.js](src/routes/auth.js), [src/controllers/authController.js](src/controllers/authController.js), and [src/services/authService.js](src/services/authService.js) as incomplete until their implementations are verified.
- Check route protection and ownership/authorization for every mutation. Do not trust an author or user id supplied by the request body when authenticated context is available.
- Preserve the existing Helmet, CORS, and rate-limit middleware in [src/app.js](src/app.js). Never hard-code JWT secrets or database credentials.

## Verification

- Before declaring an endpoint change complete, exercise success, missing or malformed input, unauthorized access, nonexistent resources, and database/service failure paths as applicable.
- For mutations, verify the persisted result with a follow-up read and verify the response status and `{ success, message, data }` shape.
- Use Vitest, Supertest, and `mongodb-memory-server` for automated coverage. There are currently no test files in the repository, so add focused tests when changing behavior rather than assuming `npm test` covers it.
- Check syntax and diagnostics after edits, and report any external MongoDB or environment prerequisite that prevented live verification.

## Existing AI Workflows And References

- Use [resources/backend-testing-agent.agent.md](resources/backend-testing-agent.agent.md) for Vitest/Supertest test generation guidance.
- Use [resources/readme-generator.agent.md](resources/readme-generator.agent.md) for README work; do not duplicate README content in agent instructions.
- The assignment context and requested workflow are in [resources/prompts.md](resources/prompts.md). Design and requirements references are [WK4_MLS_Design_Doc.pdf](WK4_MLS_Design_Doc.pdf) and [WK4_MLS_Problem_Statement.pdf](WK4_MLS_Problem_Statement.pdf).