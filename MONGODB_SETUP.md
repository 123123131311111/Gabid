# MongoDB Atlas on Render

Account profiles, password hashes, match progress, ratings, and session tokens are stored in MongoDB collections. The application reads the connection string only from `MONGODB_URI`; credentials must not be committed to this repository.

## Configure Atlas

1. Rotate the database user's password: the previous credential was pasted into a chat and should be treated as exposed.
2. In Atlas, allow connections from the Render service. For Render plans without fixed outbound IPs, Atlas may require an appropriate network access rule; restrict this as much as the hosting plan allows.
3. Create or select a database user with read/write access to the game's database.

## Configure Render

In the Render service's **Environment** settings, add `MONGODB_URI` and set its value to the new Atlas connection URI. `render.yaml` declares this key as a secret (`sync: false`), so Render will request it instead of storing a credential in the Blueprint.

For a local run, copy `.env.example` to `.env`, put the URI in `.env`, and load environment variables before starting Node (for example with `node --env-file=.env server.js` on supported Node versions). Never commit `.env`.

The Render build command installs Mongoose through `npm install`. If the database is missing or unavailable, the game server can still start, but account API requests return HTTP 503 and can be retried after the database connection is restored.
