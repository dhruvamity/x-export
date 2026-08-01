const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = Number(process.env.PORT || 8000);
const host = process.env.HOST || "127.0.0.1";
const model = process.env.NVIDIA_MODEL || "nvidia/llama-3.3-nemotron-super-49b-v1.5";

loadDotEnv();

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (req.method === "POST" && url.pathname === "/api/clarity") {
      await handleClarity(req, res);
      return;
    }
    if (req.method === "GET" && url.pathname === "/firebase-config.js") {
      serveFirebaseConfig(res);
      return;
    }
    if (req.method === "GET" || req.method === "HEAD") {
      serveStatic(url.pathname, req.method, res);
      return;
    }
    sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Server error" });
  }
});

server.listen(port, host, () => {
  console.log(`Kensho portal running at http://${host}:${port}/index.html`);
});

function loadDotEnv() {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

async function handleClarity(req, res) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    sendJson(res, 503, { error: "Set NVIDIA_API_KEY in .env or your shell, then run node server.js." });
    return;
  }

  const body = await readJson(req);
  const prompt = buildPrompt(body);
  const endpoint = `${process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1"}/chat/completions`;
  const nvidiaRes = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: "/no_think\nYou return only strict JSON. Do not include markdown, analysis text, or chain-of-thought."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      top_p: 0.9,
      max_tokens: 1800
    })
  });

  const data = await nvidiaRes.json();
  if (!nvidiaRes.ok) {
    sendJson(res, nvidiaRes.status, { error: data.error && data.error.message ? data.error.message : "NVIDIA request failed" });
    return;
  }

  const text = extractText(data);
  const parsed = parseJson(text);
  sendJson(res, 200, sanitizeAiResponse(parsed));
}

function buildPrompt(body) {
  const answers = body && body.state ? body.state : {};
  const questions = body && body.questions ? body.questions : {};
  return [
    "You are a private clarity mirror for a one-day life reset protocol inspired by identity change, anti-vision, vision MVP, cybernetic feedback loops, and life-as-game planning.",
    "The user must do their own contemplation. Do not answer for them, invent desires, flatter them, moralize, diagnose, or give medical/legal/financial advice.",
    "Your job: reflect their own words more clearly, detect repeated patterns/fears/contradictions/hidden goals, ask harder follow-up questions when an answer is vague, compress messy writing into planning language, and create a tomorrow schedule only from their stated inputs.",
    "Be direct, precise, and warm. Prefer concrete behavior over abstract identity claims.",
    "Return only valid JSON. No markdown. No prose outside JSON.",
    "Schema:",
    JSON.stringify({
      reflection: "One short paragraph reflecting what their answers reveal.",
      patterns: ["Repeated behavior, motive, or theme."],
      fears: ["Fear implied by their writing."],
      contradictions: ["Where words and behavior appear mismatched."],
      hiddenGoals: ["Unconscious goal the behavior may be serving."],
      followUps: { field_key: "One sharper question tailored to that specific answer." },
      stageFocus: {
        excavation: "One sentence on what to examine next.",
        interrupts: "One sentence on what to notice during the day.",
        synthesis: "One sentence on what to compress tonight.",
        game: "One sentence on how to make the plan playable.",
        map: "One sentence on what the map should help them remember."
      },
      clarity: {
        antiVision: "Compressed from their answers, not invented.",
        vision: "Compressed from their answers, not invented.",
        enemy: "Internal pattern or belief.",
        mission: "One-year lens.",
        project: "One-month project.",
        dailyLevers: "2-3 daily actions.",
        constraints: "Rules they should not violate."
      },
      tomorrowSchedule: [{ time: "07:30", action: "Concrete timeblocked action from their stated plan." }],
      mapSummary: "A compact summary of the final clarity map."
    }),
    "Questions:",
    JSON.stringify(questions),
    "Current stage:",
    String(body && body.stage ? body.stage : "unknown"),
    "User answers:",
    JSON.stringify(answers)
  ].join("\n\n");
}

function sanitizeAiResponse(input) {
  const fallback = {};
  const data = input && typeof input === "object" ? input : fallback;
  return {
    reflection: stringValue(data.reflection),
    patterns: stringArray(data.patterns),
    fears: stringArray(data.fears),
    contradictions: stringArray(data.contradictions),
    hiddenGoals: stringArray(data.hiddenGoals),
    followUps: objectOfStrings(data.followUps),
    stageFocus: {
      excavation: stringValue(data.stageFocus && data.stageFocus.excavation),
      interrupts: stringValue(data.stageFocus && data.stageFocus.interrupts),
      synthesis: stringValue(data.stageFocus && data.stageFocus.synthesis),
      game: stringValue(data.stageFocus && data.stageFocus.game),
      map: stringValue(data.stageFocus && data.stageFocus.map)
    },
    clarity: {
      antiVision: stringValue(data.clarity && data.clarity.antiVision),
      vision: stringValue(data.clarity && data.clarity.vision),
      enemy: stringValue(data.clarity && data.clarity.enemy),
      mission: stringValue(data.clarity && data.clarity.mission),
      project: stringValue(data.clarity && data.clarity.project),
      dailyLevers: stringValue(data.clarity && data.clarity.dailyLevers),
      constraints: stringValue(data.clarity && data.clarity.constraints)
    },
    tomorrowSchedule: scheduleArray(data.tomorrowSchedule),
    mapSummary: stringValue(data.mapSummary)
  };
}

function stringValue(value) {
  return typeof value === "string" ? value.slice(0, 900) : "";
}

function stringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === "string").map((item) => item.slice(0, 260)).slice(0, 6);
}

function objectOfStrings(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string") result[key] = item.slice(0, 320);
  }
  return result;
}

function scheduleArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      time: stringValue(item.time).slice(0, 16),
      action: stringValue(item.action).slice(0, 240)
    }))
    .filter((item) => item.time || item.action)
    .slice(0, 8);
}

function extractText(data) {
  const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (typeof content === "string") return content.trim() || "{}";
  if (Array.isArray(content)) {
    return content.map((part) => part.text || part.content || "").join("").trim() || "{}";
  }
  return "{}";
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : {};
  }
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 120000) {
        reject(new Error("Request too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function serveStatic(urlPath, method, res) {
  const cleanPath = decodeURIComponent(urlPath === "/" ? "/index.html" : urlPath);
  const filePath = path.normalize(path.join(root, cleanPath));
  if (!filePath.startsWith(root)) {
    sendText(res, 403, "Forbidden");
    return;
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    sendText(res, 404, "Not found");
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".pdf": "application/pdf",
    ".rtf": "application/rtf"
  };
  res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
  if (method === "HEAD") {
    res.end();
    return;
  }
  fs.createReadStream(filePath).pipe(res);
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function sendText(res, status, text) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}

function serveFirebaseConfig(res) {
  const envConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
  };

  const hasEnvConfig = envConfig.apiKey && envConfig.projectId;
  if (hasEnvConfig) {
    const js = `window.FIREBASE_CONFIG = ${JSON.stringify(envConfig, null, 2)};`;
    res.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
    res.end(js);
    return;
  }

  // Fallback to physical firebase-config.js file if present
  const filePath = path.join(root, "firebase-config.js");
  if (fs.existsSync(filePath)) {
    res.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
    fs.createReadStream(filePath).pipe(res);
  } else {
    sendText(res, 404, "Firebase configuration file not found");
  }
}

