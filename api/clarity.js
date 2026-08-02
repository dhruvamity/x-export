export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.NVIDIA_API_KEY;
  const model = process.env.NVIDIA_MODEL || "nvidia/llama-3.3-nemotron-super-49b-v1.5";
  const baseUrl = process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1";

  const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});

  if (!apiKey) {
    return res.status(200).json(generateHeuristicAnalysis(body));
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const prompt = buildPrompt(body);
    const endpoint = `${baseUrl}/chat/completions`;

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
      return res.status(nvidiaRes.status).json({
        error: data.error && data.error.message ? data.error.message : "NVIDIA request failed"
      });
    }

    const text = extractText(data);
    const parsed = parseJson(text);
    return res.status(200).json(sanitizeAiResponse(parsed));
  } catch (error) {
    return res.status(500).json({ error: error.message || "Server error" });
  }
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

function generateHeuristicAnalysis(body) {
  const state = (body && body.state) || {};
  const antivision = state.anti_vision || state.dissatisfaction || state.compressed_anti || "Constant distraction and unfulfilled potential.";
  const vision = state.vision || state.compressed_vision || state.game_vision || "Building a high-leverage business with total time autonomy.";
  const enemy = state.enemy || state.stuck_truth || "Autopilot habit of trade-off avoidance and comfort seeking.";
  const mission = state.year_lens || state.game_year || "Achieve $10k/mo digital product revenue with 4 hours daily focus.";
  const project = state.month_lens || state.game_month || "Complete core curriculum draft and sales page.";
  const dailyLevers = state.daily_lens || state.game_daily || "1. 3 hrs deep work block before noon. 2. Zero social media before 2 PM. 3. Evening daily review.";
  const constraints = state.game_constraints || "No multi-tasking, no checking notifications during deep work sessions.";

  return sanitizeAiResponse({
    reflection: `Your responses indicate a strong contrast between your current dissatisfaction ("${antivision.slice(0, 80)}...") and your desired state. Your actions reveal a struggle with autopilot avoidance patterns that disrupt high-leverage execution.`,
    patterns: [
      "Substituting shallow administrative activity for high-consequence creation.",
      "Seeking temporary distraction whenever friction or creative difficulty arises.",
      "Protecting status and safety by delaying public iteration."
    ],
    fears: [
      "Fear of waste: worry that deep creative bets won't yield immediate validation.",
      "Fear of exposure: fear that launching raw work will invite negative judgment."
    ],
    contradictions: [
      "Desiring autonomous creative freedom while allowing low-value interruptions to dictate the schedule."
    ],
    hiddenGoals: [
      "Unconscious goal of comfort preservation: staying busy to feel productive without risking failure."
    ],
    followUps: {
      dissatisfaction: "What specific fear prevents you from eliminating this dissatisfaction today?",
      anti_vision: "If nothing changes in 3 years, what exact daily regret will you carry?",
      compressed_vision: "What is the single most intimidating milestone required to make this vision real?"
    },
    stageFocus: {
      excavation: "Examine the root avoidance mechanism driving your main complaint.",
      interrupts: "Notice the exact physical impulse right before you switch to a distraction.",
      synthesis: "Compress your core insight into one non-negotiable rule.",
      game: "Treat tomorrow as a single playable level with clear win criteria.",
      map: "Use this map daily as a cybernetic feedback lens."
    },
    clarity: {
      antiVision: antivision,
      vision: vision,
      enemy: enemy,
      mission: mission,
      project: project,
      dailyLevers: dailyLevers,
      constraints: constraints
    },
    tomorrowSchedule: [
      { time: "07:30", action: "Hydration & 10-min silent planning alignment" },
      { time: "08:00", action: "Block 1: Deep work on primary monthly project lever" },
      { time: "11:00", action: "Timed interrupt check: evaluate focus vs avoidance" },
      { time: "13:00", action: "Block 2: Systems, administration, and communication" },
      { time: "17:00", action: "Evening review & lock daily levers for tomorrow" }
    ],
    mapSummary: `Target: ${mission.slice(0, 100)}. Core Lever: ${dailyLevers.slice(0, 100)}.`
  });
}
