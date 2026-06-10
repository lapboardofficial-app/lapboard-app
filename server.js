const http = require("http");
const path = require("path");
const { mkdir, readFile, stat, writeFile } = require("fs/promises");

const PORT = Number(process.env.PORT || 3010);
const HOST = process.env.HOST || "0.0.0.0";
const DB_PATH = process.env.LAPBOARD_DB_PATH || path.join(__dirname, "data", "lapboard-db.json");
const PUBLIC_DIR = process.env.LAPBOARD_PUBLIC_DIR || path.join(__dirname, "dist");
const SERVE_STATIC = process.env.LAPBOARD_SERVE_STATIC !== "false";
const BODY_LIMIT_BYTES = Number(process.env.LAPBOARD_BODY_LIMIT_BYTES || 2_000_000);
const WRITE_RATE_LIMIT = Number(process.env.LAPBOARD_WRITE_RATE_LIMIT || 120);
const WRITE_RATE_WINDOW_MS = Number(process.env.LAPBOARD_WRITE_RATE_WINDOW_MS || 60_000);
const ALLOWED_ORIGINS = (process.env.LAPBOARD_ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const emptyDb = {
  laps: [],
  media: [],
  teams: [],
  leagueMemberships: []
};
const writeBuckets = new Map();
let dbWriteQueue = Promise.resolve();

function getRequestOrigin(req) {
  return req.headers.origin || "";
}

function getCorsOrigin(req) {
  const origin = getRequestOrigin(req);
  if (!origin) return "";
  if (!ALLOWED_ORIGINS.length) return "*";
  return ALLOWED_ORIGINS.includes(origin) ? origin : "";
}

function withCors(req, headers = {}) {
  const corsOrigin = getCorsOrigin(req);
  return {
    ...(corsOrigin ? { "Access-Control-Allow-Origin": corsOrigin } : {}),
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
    ...headers
  };
}

function sendJson(req, res, status, payload) {
  res.writeHead(status, withCors(req, { "Content-Type": "application/json" }));
  res.end(JSON.stringify(payload));
}

function getClientIp(req) {
  return String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").split(",")[0].trim();
}

function isWriteMethod(method) {
  return method === "POST" || method === "PATCH" || method === "DELETE";
}

function isApiPath(pathname) {
  return pathname === "/api" || pathname.startsWith("/api/");
}

function checkWriteRateLimit(req) {
  if (!isWriteMethod(req.method) || !req.url.startsWith("/api/")) return true;

  const now = Date.now();
  const ip = getClientIp(req);
  const bucket = writeBuckets.get(ip) || { count: 0, resetAt: now + WRITE_RATE_WINDOW_MS };

  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + WRITE_RATE_WINDOW_MS;
  }

  bucket.count += 1;
  writeBuckets.set(ip, bucket);
  return bucket.count <= WRITE_RATE_LIMIT;
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    ".css": "text/css; charset=utf-8",
    ".gif": "image/gif",
    ".html": "text/html; charset=utf-8",
    ".ico": "image/x-icon",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".webp": "image/webp"
  }[ext] || "application/octet-stream";
}

async function sendStaticFile(req, res, requestPath) {
  if (!SERVE_STATIC) return false;

  const decodedPath = decodeURIComponent(requestPath);
  const cleanPath = decodedPath === "/" ? "/index.html" : decodedPath;
  const normalizedPath = path.normalize(cleanPath).replace(/^(\.\.[/\\])+/, "");
  let filePath = path.join(PUBLIC_DIR, normalizedPath);
  const publicRoot = path.resolve(PUBLIC_DIR);

  if (!path.resolve(filePath).startsWith(publicRoot)) {
    sendJson(req, res, 403, { error: "Forbidden." });
    return true;
  }

  try {
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) filePath = path.join(filePath, "index.html");
    const data = await readFile(filePath);
    const immutableAsset = cleanPath.startsWith("/assets/");
    res.writeHead(200, {
      "Content-Type": getContentType(filePath),
      "Cache-Control": immutableAsset ? "public, max-age=31536000, immutable" : "no-cache"
    });
    res.end(req.method === "HEAD" ? undefined : data);
    return true;
  } catch {
    if (isApiPath(requestPath)) return false;

    try {
      const data = await readFile(path.join(PUBLIC_DIR, "index.html"));
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache"
      });
      res.end(req.method === "HEAD" ? undefined : data);
      return true;
    } catch {
      return false;
    }
  }
}

function cleanString(value, maxLength = 180) {
  return String(value || "").trim().slice(0, maxLength);
}

function cleanDate(value) {
  const date = cleanString(value, 16);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date().toISOString().slice(0, 10);
}

function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function readDb() {
  try {
    const data = JSON.parse(await readFile(DB_PATH, "utf8"));
    return {
      laps: Array.isArray(data.laps) ? data.laps : [],
      media: Array.isArray(data.media) ? data.media : [],
      teams: Array.isArray(data.teams) ? data.teams : [],
      leagueMemberships: Array.isArray(data.leagueMemberships) ? data.leagueMemberships : []
    };
  } catch {
    return { ...emptyDb };
  }
}

async function writeDb(db) {
  dbWriteQueue = dbWriteQueue.then(async () => {
    await mkdir(path.dirname(DB_PATH), { recursive: true });
    await writeFile(DB_PATH, `${JSON.stringify(db, null, 2)}\n`);
  });
  await dbWriteQueue;
}

function upsertById(current, incoming) {
  const items = new Map(current.map((item) => [String(item.id), item]));
  incoming.forEach((item) => items.set(String(item.id), { ...items.get(String(item.id)), ...item }));
  return Array.from(items.values());
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > BODY_LIMIT_BYTES) {
        reject(new Error("Request body is too large."));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Expected JSON request body."));
      }
    });
    req.on("error", reject);
  });
}

function sanitizeLap(lap) {
  const player = cleanString(lap?.player, 80);
  const trackId = cleanString(lap?.trackId, 80);
  const ms = Math.round(Number(lap?.ms));

  if (!player || !trackId || !Number.isFinite(ms) || ms <= 0) return null;

  return {
    id: cleanString(lap.id, 120) || generateId("lap"),
    player,
    trackId,
    kart: cleanString(lap.kart, 120),
    ms,
    date: cleanDate(lap.date),
    lapNumber: Number(lap.lapNumber) || undefined,
    layout: cleanString(lap.layout, 120) || "Main layout",
    visibility: "public"
  };
}

function sanitizeMedia(entry) {
  const title = cleanString(entry?.title, 140);
  const owner = cleanString(entry?.owner, 80);
  const url = cleanString(entry?.url, 500);

  if (!title || !owner || !/^https?:\/\//i.test(url)) return null;

  return {
    id: cleanString(entry.id, 120) || generateId("media"),
    owner,
    title,
    url,
    type: "link",
    createdAt: cleanDate(entry.createdAt)
  };
}

function sanitizeTeam(team) {
  const name = cleanString(team?.name, 100);
  const owner = cleanString(team?.owner, 80);
  const members = Array.isArray(team?.members)
    ? [...new Set(team.members.map((member) => cleanString(member, 80)).filter(Boolean))]
    : [];

  if (!name || !owner) return null;

  return {
    id: cleanString(team.id, 120) || generateId("team"),
    name,
    description: cleanString(team.description, 300),
    owner,
    members: members.length ? members : [owner],
    createdAt: cleanDate(team.createdAt)
  };
}

function sanitizeLeagueMembership(membership) {
  const player = cleanString(membership?.player, 80);
  const leagueId = cleanString(membership?.leagueId, 120);
  const trackId = cleanString(membership?.trackId, 120);

  if (!player || !leagueId || !trackId) return null;

  return {
    id: cleanString(membership.id, 160) || generateId("league-member"),
    player,
    leagueId,
    trackId,
    joinedAt: cleanDate(membership.joinedAt)
  };
}

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (ALLOWED_ORIGINS.length && getRequestOrigin(req) && !getCorsOrigin(req)) {
    sendJson(req, res, 403, { error: "Origin is not allowed." });
    return;
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204, withCors(req));
    res.end();
    return;
  }

  if (!checkWriteRateLimit(req)) {
    sendJson(req, res, 429, { error: "Too many write requests. Try again in a minute." });
    return;
  }

  if ((req.method === "GET" || req.method === "HEAD") && !isApiPath(url.pathname) && await sendStaticFile(req, res, url.pathname)) {
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/health") {
    sendJson(req, res, 200, {
      ok: true,
      persistence: DB_PATH ? "file" : "memory",
      ...(IS_PRODUCTION ? {} : { dbPath: DB_PATH })
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api") {
    sendJson(req, res, 200, {
      name: "LapBoard API",
      status: "running",
      endpoints: ["/api/health", "/api/bootstrap"],
      staticFrontend: SERVE_STATIC
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/bootstrap") {
    sendJson(req, res, 200, await readDb());
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/laps") {
    const body = await readBody(req);
    const rawLaps = Array.isArray(body.laps) ? body.laps : [body.lap || body];
    const laps = rawLaps.map(sanitizeLap).filter(Boolean);

    if (!laps.length) {
      sendJson(req, res, 400, { error: "No valid public laps supplied." });
      return;
    }

    const db = await readDb();
    db.laps = upsertById(db.laps, laps).sort((a, b) => new Date(`${b.date}T12:00:00`) - new Date(`${a.date}T12:00:00`));
    await writeDb(db);
    sendJson(req, res, 200, { laps });
    return;
  }

  const lapDeleteMatch = url.pathname.match(/^\/api\/laps\/([^/]+)$/);
  if (req.method === "DELETE" && lapDeleteMatch) {
    const db = await readDb();
    db.laps = db.laps.filter((lap) => String(lap.id) !== decodeURIComponent(lapDeleteMatch[1]));
    await writeDb(db);
    sendJson(req, res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/media") {
    const body = await readBody(req);
    const entry = sanitizeMedia(body.entry || body);

    if (!entry) {
      sendJson(req, res, 400, { error: "Expected a title, owner, and http(s) video URL." });
      return;
    }

    const db = await readDb();
    db.media = upsertById(db.media, [entry]).sort((a, b) => String(b.id).localeCompare(String(a.id)));
    await writeDb(db);
    sendJson(req, res, 200, { entry });
    return;
  }

  const mediaDeleteMatch = url.pathname.match(/^\/api\/media\/([^/]+)$/);
  if (req.method === "DELETE" && mediaDeleteMatch) {
    const db = await readDb();
    db.media = db.media.filter((entry) => String(entry.id) !== decodeURIComponent(mediaDeleteMatch[1]));
    await writeDb(db);
    sendJson(req, res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/teams") {
    const body = await readBody(req);
    const team = sanitizeTeam(body.team || body);

    if (!team) {
      sendJson(req, res, 400, { error: "Expected a team name and owner." });
      return;
    }

    const db = await readDb();
    const duplicate = db.teams.some((item) => item.name.toLowerCase() === team.name.toLowerCase() && item.id !== team.id);
    if (duplicate) {
      sendJson(req, res, 409, { error: "That team already exists." });
      return;
    }

    db.teams = upsertById(db.teams, [team]).sort((a, b) => a.name.localeCompare(b.name));
    await writeDb(db);
    sendJson(req, res, 200, { team });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/league-memberships") {
    const body = await readBody(req);
    const membership = sanitizeLeagueMembership(body.membership || body);

    if (!membership) {
      sendJson(req, res, 400, { error: "Expected player, leagueId, and trackId." });
      return;
    }

    const db = await readDb();
    db.leagueMemberships = upsertById(db.leagueMemberships, [membership])
      .sort((a, b) => a.leagueId.localeCompare(b.leagueId) || a.trackId.localeCompare(b.trackId) || a.player.localeCompare(b.player));
    await writeDb(db);
    sendJson(req, res, 200, { membership });
    return;
  }

  const leagueMembershipDeleteMatch = url.pathname.match(/^\/api\/league-memberships\/([^/]+)$/);
  if (req.method === "DELETE" && leagueMembershipDeleteMatch) {
    const db = await readDb();
    db.leagueMemberships = db.leagueMemberships.filter((membership) => String(membership.id) !== decodeURIComponent(leagueMembershipDeleteMatch[1]));
    await writeDb(db);
    sendJson(req, res, 200, { ok: true });
    return;
  }

  const teamActionMatch = url.pathname.match(/^\/api\/teams\/([^/]+)\/(join|leave)$/);
  if (req.method === "PATCH" && teamActionMatch) {
    const [, encodedTeamId, action] = teamActionMatch;
    const body = await readBody(req);
    const username = cleanString(body.username, 80);

    if (!username) {
      sendJson(req, res, 400, { error: "Expected username." });
      return;
    }

    const db = await readDb();
    const teamId = decodeURIComponent(encodedTeamId);
    const team = db.teams.find((item) => String(item.id) === teamId);

    if (!team) {
      sendJson(req, res, 404, { error: "Team not found." });
      return;
    }

    const members = Array.isArray(team.members) ? team.members : [];
    team.members = action === "join"
      ? [...new Set([...members, username])]
      : members.filter((member) => member.toLowerCase() !== username.toLowerCase());

    await writeDb(db);
    sendJson(req, res, 200, { team });
    return;
  }

  const teamDeleteMatch = url.pathname.match(/^\/api\/teams\/([^/]+)$/);
  if (req.method === "DELETE" && teamDeleteMatch) {
    const db = await readDb();
    db.teams = db.teams.filter((team) => String(team.id) !== decodeURIComponent(teamDeleteMatch[1]));
    await writeDb(db);
    sendJson(req, res, 200, { ok: true });
    return;
  }

  sendJson(req, res, 404, { error: "Not found." });
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    console.error(error);
    sendJson(req, res, 500, { error: error.message || "Server error." });
  });
});

function shutdown(signal) {
  console.log(`Received ${signal}; shutting down LapBoard server.`);
  server.close(() => process.exit(0));
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

server.listen(PORT, HOST, () => {
  console.log(`LapBoard server running at http://${HOST}:${PORT}`);
  console.log(`Database file: ${DB_PATH}`);
  if (SERVE_STATIC) console.log(`Serving frontend from: ${PUBLIC_DIR}`);
  if (ALLOWED_ORIGINS.length) console.log(`Allowed origins: ${ALLOWED_ORIGINS.join(", ")}`);
});
