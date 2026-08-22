// ─────────────────────────────────────────────────────────────────────────
// AI CFO — MongoDB application user bootstrap.
//
// Runs ONCE, the first time the Mongo data directory is initialized
// (docker-entrypoint-initdb.d). It creates a least-privileged user that the
// FastAPI backend uses — the backend has readWrite on the `aicfo` database
// only, and never uses the admin/root credentials.
//
// Credentials come from the container environment (see docker-compose.prod.yml).
// ─────────────────────────────────────────────────────────────────────────

const dbName = "aicfo";
const appDb = db.getSiblingDB(dbName);
const username = process.env.MONGO_APP_USERNAME;
const password = process.env.MONGO_APP_PASSWORD;

if (!username || !password) {
  throw new Error("MONGO_APP_USERNAME / MONGO_APP_PASSWORD must be set");
}

if (appDb.getUser(username) === null) {
  appDb.createUser({
    user: username,
    pwd: password,
    roles: [{ role: "readWrite", db: dbName }],
  });
  print(`[mongo-init] created application user '${username}' on '${dbName}'`);
} else {
  print(`[mongo-init] application user '${username}' already exists on '${dbName}'`);
}
