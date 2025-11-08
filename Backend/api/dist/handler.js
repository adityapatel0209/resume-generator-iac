"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// handler.ts
var handler_exports = {};
__export(handler_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(handler_exports);
var handler = async (event) => {
  if (event.requestContext?.http?.method === "OPTIONS") {
    return cors(204, "");
  }
  try {
    const { text } = safeJson(event.body) ?? {};
    if (!text || typeof text !== "string" || !text.trim()) {
      return cors(400, { error: "Missing 'text' in request body." });
    }
    const useAI = !!process.env.OPENAI_API_KEY;
    let parsed = null;
    if (useAI) {
      try {
        parsed = await aiParseResume(text);
      } catch (e) {
        console.warn("AI parse failed, falling back to heuristics:", e);
      }
    }
    if (!parsed) {
      parsed = heuristicParse(text);
    }
    return cors(200, parsed);
  } catch (err) {
    console.error("Unhandled error:", err);
    return cors(500, { error: "Internal server error." });
  }
};
async function aiParseResume(text) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const system = `
You convert raw resume text into a strict JSON object for rendering a resume.
- Do not fabricate content.
- Preserve bullet points exactly where possible (clean spacing).
- Normalize date ranges and infer ISO dates when feasible.
- Always return ALL top-level keys even if arrays are empty.
JSON schema (no comments):
{
  "name": string,
  "title": string | null,
  "contactLines": string[],
  "summary": string | null,
  "skills": string[],
  "experience": [{
    "title": string,
    "company": string | null,
    "location": string | null,
    "dateRange": string | null,
    "startDateISO": string | null,
    "endDateISO": string | null,
    "current": boolean | null,
    "bullets": string[]
  }],
  "education": [{
    "degree": string,
    "school": string,
    "location": string | null,
    "dateRange": string | null,
    "startDateISO": string | null,
    "endDateISO": string | null,
    "current": boolean | null,
    "details": string[]
  }],
  "projects": [{
    "name": string,
    "description": string | null,
    "bullets": string[]
  }]
}
Return ONLY JSON, no prose.
  `.trim();
  const prompt = `
Raw resume text:
"""
${text}
"""
  `.trim();
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    })
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`OpenAI error ${resp.status}: ${t}`);
  }
  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content from OpenAI.");
  const j = safeJson(content);
  if (!j) throw new Error("OpenAI returned invalid JSON.");
  return normalizeResumeJson(j);
}
function heuristicParse(raw) {
  const lines = raw.split(/\r?\n/g).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) {
    return emptyResume();
  }
  const name = lines[0];
  let idx = 1;
  const contactLines = [];
  while (idx < lines.length && !isSectionHeader(lines[idx])) {
    contactLines.push(lines[idx]);
    idx++;
  }
  const rest = lines.slice(idx);
  const sections = splitIntoSections(rest);
  const summary = (sections.summary ?? []).join(" ");
  const skills = parseSkills(sections.skills ?? sections["technical skills"] ?? []);
  const experience = parseExperience(sections.experience ?? sections["work experience"] ?? sections["professional experience"] ?? sections.employment ?? []);
  const education = parseEducation(sections.education ?? sections.academics ?? []);
  const projects = parseProjects(sections.projects ?? []);
  return {
    name,
    title: guessTitleFromContact(contactLines),
    contactLines,
    summary: summary || void 0,
    skills,
    experience,
    education,
    projects
  };
}
function emptyResume() {
  return {
    name: "",
    contactLines: [],
    skills: [],
    experience: [],
    education: [],
    projects: []
  };
}
var KNOWN_HEADERS = [
  "summary",
  "profile",
  "about",
  "skills",
  "technical skills",
  "experience",
  "work experience",
  "professional experience",
  "employment",
  "education",
  "academics",
  "projects",
  "personal projects",
  "certifications",
  "awards",
  "volunteer"
];
function isSectionHeader(line) {
  const t = norm(line);
  return KNOWN_HEADERS.includes(t) || /^(skills|education|experience|projects|summary|profile)\s*:?\s*$/i.test(line);
}
function norm(s) {
  return s.toLowerCase().replace(/\s+/g, " ").replace(/:$/, "");
}
function splitIntoSections(lines) {
  const sections = {};
  let current = null;
  for (const line of lines) {
    if (isSectionHeader(line)) {
      current = normalizeHeader(line);
      if (!sections[current]) sections[current] = [];
      continue;
    }
    if (current) {
      sections[current].push(line);
    } else {
      sections.summary ??= [];
      sections.summary.push(line);
    }
  }
  return sections;
}
function normalizeHeader(line) {
  const t = norm(line);
  if (t.includes("work experience") || t.includes("professional") || t.includes("employment")) return "experience";
  if (t.includes("technical skills")) return "skills";
  if (t.includes("personal projects")) return "projects";
  if (t.includes("academics")) return "education";
  if (t.includes("profile") || t.includes("about")) return "summary";
  return t;
}
function parseSkills(lines) {
  if (!lines.length) return [];
  const joined = lines.join(" ");
  return joined.split(/[,;•|\u2022\u2023\u25CF\u25E6\u2219]/g).map((s) => s.trim()).filter(Boolean);
}
var BULLET_RE = /^\s*(?:[-*•●▪︎‣]|(\d+[\.)]))\s+/;
var DATE_SEP = /\s*(?:-|–|—|to|until|through|thru)\s*/i;
var PRESENT_RE = /\b(present|current|now|ongoing)\b/i;
var DATE_TOKEN_RE = /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t)?(?:ember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|\d{1,2}[\/-]\d{2,4}|\d{4})(?:[ ,.'/-]?\d{2,4})?\b/i;
function parseExperience(lines) {
  const items = [];
  let current = null;
  const pushCurrent = () => {
    if (current) {
      current.bullets = (current.bullets || []).filter(Boolean);
      items.push(current);
      current = null;
    }
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    if (BULLET_RE.test(line)) {
      if (!current) {
        current = { title: "", bullets: [] };
      }
      current.bullets.push(cleanBullet(line));
      continue;
    }
    if (current && (current.title || current.company || current.dateRange || current.bullets.length)) {
      pushCurrent();
    }
    current = { title: "", bullets: [] };
    const { dateRange, startISO, endISO, currentFlag } = findDateRange(line);
    if (dateRange) current.dateRange = dateRange;
    if (startISO) current.startDateISO = startISO;
    if (endISO) current.endDateISO = endISO;
    if (typeof currentFlag === "boolean") current.current = currentFlag;
    const headerWithoutDates = dateRange ? line.replace(dateRange, "").replace(/[()]/g, "").trim() : line;
    const { title, company, location } = splitHeader(headerWithoutDates);
    current.title = title;
    if (company) current.company = company;
    if (location) current.location = location;
    let j = i + 1;
    while (j < lines.length && lines[j] && !BULLET_RE.test(lines[j]) && !looksLikeHeader(lines[j])) {
      current.bullets.push(lines[j].trim());
      j++;
    }
    i = j - 1;
  }
  if (current) pushCurrent();
  return items.map(fixExperienceItem);
}
function cleanBullet(line) {
  return line.replace(BULLET_RE, "").trim();
}
function looksLikeHeader(line) {
  return DATE_TOKEN_RE.test(line) || / \| /.test(line) || /—|–|- @| at |, [A-Z]/.test(line);
}
function splitHeader(s) {
  let parts = s.split(/\s+\|\s+|—|–| - | @ | at /i).map((x) => x.trim()).filter(Boolean);
  if (parts.length === 1) {
    const byComma = s.split(/\s*,\s*/);
    if (byComma.length >= 3) {
      return {
        title: byComma[0],
        company: byComma[1],
        location: byComma.slice(2).join(", ")
      };
    }
    if (byComma.length === 2) {
      return { title: byComma[0], company: byComma[1] };
    }
    return { title: s.trim() };
  }
  const guessTitleFirst = /engineer|developer|manager|architect|analyst|lead|consultant|intern|administrator|designer/i.test(parts[0]);
  if (guessTitleFirst) {
    const [title, company, ...rest] = parts;
    const location = rest.length ? rest.join(" \u2022 ") : void 0;
    return { title, company, location };
  }
  if (parts.length >= 2) {
    const [p0, p1, ...rest] = parts;
    const p0LooksTitle = /engineer|developer|manager|architect|analyst|lead|intern/i.test(p0);
    const p1LooksTitle = /engineer|developer|manager|architect|analyst|lead|intern/i.test(p1);
    if (p0LooksTitle && !p1LooksTitle) {
      return { title: p0, company: p1, location: rest.join(" \u2022 ") || void 0 };
    }
    if (!p0LooksTitle && p1LooksTitle) {
      return { title: p1, company: p0, location: rest.join(" \u2022 ") || void 0 };
    }
    return { title: p1, company: p0, location: rest.join(" \u2022 ") || void 0 };
  }
  return { title: s.trim() };
}
function fixExperienceItem(item) {
  if (!item.title && item.company) {
    item.title = item.company;
    delete item.company;
  }
  item.title = item.title?.trim() || "";
  if (item.company) item.company = item.company.trim();
  if (item.location) item.location = item.location.trim();
  return item;
}
function parseEducation(lines) {
  const items = [];
  let current = null;
  const push = () => {
    if (current) {
      current.details = (current.details ?? []).filter(Boolean);
      items.push(current);
      current = null;
    }
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (BULLET_RE.test(line)) {
      if (!current) current = { degree: "", school: "", details: [] };
      current.details.push(cleanBullet(line));
      continue;
    }
    if (current && (current.degree || current.school || current.dateRange || current.details?.length)) push();
    current = { degree: "", school: "", details: [] };
    const { dateRange, startISO, endISO, currentFlag } = findDateRange(line);
    if (dateRange) current.dateRange = dateRange;
    if (startISO) current.startDateISO = startISO;
    if (endISO) current.endDateISO = endISO;
    if (typeof currentFlag === "boolean") current.current = currentFlag;
    const headerWithoutDates = dateRange ? line.replace(dateRange, "").replace(/[()]/g, "").trim() : line;
    const parts = headerWithoutDates.split(/\s+\|\s+|—|–| - |, /).map((x) => x.trim()).filter(Boolean);
    let degree = "";
    let school = "";
    let location;
    const degreeLike = (s) => /(b\.?sc|b\.?tech|bachelor|master|m\.?sc|m\.?tech|mba|phd|diploma|associate|certificate|post[- ]grad|pg diploma)/i.test(
      s
    );
    if (parts.length >= 2) {
      if (degreeLike(parts[0]) && !degreeLike(parts[1])) {
        degree = parts[0];
        school = parts[1];
        location = parts.slice(2).join(", ") || void 0;
      } else if (!degreeLike(parts[0]) && degreeLike(parts[1])) {
        school = parts[0];
        degree = parts[1];
        location = parts.slice(2).join(", ") || void 0;
      } else {
        degree = parts[0];
        school = parts[1];
        location = parts.slice(2).join(", ") || void 0;
      }
    } else if (parts.length === 1) {
      school = parts[0];
    }
    current.degree = degree || current.degree;
    current.school = school || current.school;
    if (location) current.location = location;
    let j = i + 1;
    while (j < lines.length && lines[j] && !BULLET_RE.test(lines[j]) && !looksLikeHeader(lines[j])) {
      current.details.push(lines[j].trim());
      j++;
    }
    i = j - 1;
  }
  if (current) push();
  return items;
}
function parseProjects(lines) {
  const items = [];
  let current = null;
  const push = () => {
    if (current) {
      if (current.description) current.description = current.description.trim();
      current.bullets = (current.bullets ?? []).filter(Boolean);
      items.push(current);
      current = null;
    }
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (BULLET_RE.test(line)) {
      if (!current) current = { name: "", bullets: [] };
      current.bullets.push(cleanBullet(line));
      continue;
    }
    if (current && (current.name || current.description || current.bullets?.length)) push();
    current = { name: "", bullets: [] };
    const parts = line.split(/\s+\|\s+|—|–| - /).map((x) => x.trim()).filter(Boolean);
    current.name = parts[0] || line.trim();
    if (parts[1]) current.description = parts.slice(1).join(" \u2022 ");
    let j = i + 1;
    while (j < lines.length && lines[j] && !BULLET_RE.test(lines[j]) && !looksLikeHeader(lines[j])) {
      if (current.description) current.description += " " + lines[j].trim();
      else current.description = lines[j].trim();
      j++;
    }
    i = j - 1;
  }
  if (current) push();
  return items;
}
var MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december"
];
var MONTH_ABBR = MONTHS.map((m) => m.slice(0, 3));
function findDateRange(line) {
  const match1 = line.match(DATE_TOKEN_RE);
  if (!match1) return {};
  const afterFirst = line.slice(match1.index + match1[0].length);
  const sepMatch = afterFirst.match(DATE_SEP);
  if (!sepMatch) {
    const first2 = match1[0];
    const startISO2 = toISO(first2);
    return { dateRange: first2, startISO: startISO2 || void 0 };
  }
  const afterSep = afterFirst.slice(sepMatch.index + sepMatch[0].length);
  const match2 = afterSep.match(DATE_TOKEN_RE);
  let second = match2?.[0] ?? "";
  let currentFlag = false;
  if (!second && PRESENT_RE.test(afterSep)) {
    second = (afterSep.match(PRESENT_RE) || ["Present"])[0];
    currentFlag = true;
  }
  const first = match1[0];
  const rangeRaw = first + sepMatch[0] + (second || (currentFlag ? "Present" : ""));
  const startISO = toISO(first);
  const endISO = second && !PRESENT_RE.test(second) ? toISO(second) : void 0;
  return {
    dateRange: cleanupRange(rangeRaw),
    startISO: startISO || void 0,
    endISO: endISO || void 0,
    currentFlag: currentFlag || PRESENT_RE.test(second || "")
  };
}
function cleanupRange(r) {
  return r.replace(/\s+/g, " ").replace(/--+/g, "-").trim();
}
function toISO(token) {
  token = token.replace(/[()]/g, "").trim();
  const lower = token.toLowerCase();
  for (let i = 0; i < MONTHS.length; i++) {
    if (lower.startsWith(MONTHS[i]) || lower.startsWith(MONTH_ABBR[i])) {
      const year = extractYear(token);
      const month = i + 1;
      if (year) return `${pad(year)}-${pad(month)}-01`;
    }
  }
  const y_m = token.match(/\b(\d{4})[\/-](\d{1,2})\b/);
  if (y_m) {
    const y = Number(y_m[1]);
    const m = Number(y_m[2]);
    if (validYear(y) && validMonth(m)) return `${pad(y)}-${pad(m)}-01`;
  }
  const m_y = token.match(/\b(\d{1,2})[\/-](\d{2,4})\b/);
  if (m_y) {
    const m = Number(m_y[1]);
    const y = toFourDigitYear(m_y[2]);
    if (validYear(y) && validMonth(m)) return `${pad(y)}-${pad(m)}-01`;
  }
  const yOnly = extractYear(token);
  if (yOnly) return `${pad(yOnly)}-01-01`;
  return null;
}
function extractYear(s) {
  const four = s.match(/\b(19|20)\d{2}\b/);
  if (four) return Number(four[0]);
  const two = s.match(/['’](\d{2})\b/);
  if (two) return toFourDigitYear(two[1]);
  return null;
}
function toFourDigitYear(twoOrFour) {
  if (twoOrFour.length === 4) return Number(twoOrFour);
  const n = Number(twoOrFour);
  return n >= 90 ? 1900 + n : 2e3 + n;
}
function validYear(y) {
  return y >= 1950 && y <= 2100;
}
function validMonth(m) {
  return m >= 1 && m <= 12;
}
function pad(n) {
  return String(n).padStart(2, "0");
}
function safeJson(body) {
  try {
    return body ? JSON.parse(body) : null;
  } catch {
    return null;
  }
}
function guessTitleFromContact(lines) {
  const first = lines[0]?.trim();
  if (!first) return void 0;
  if (/[A-Za-z].+ (Engineer|Developer|Manager|Architect|Analyst|Intern|Consultant)/i.test(first)) {
    return first;
  }
  return void 0;
}
function cors(status, payload) {
  return {
    statusCode: status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "OPTIONS,POST"
    },
    body: typeof payload === "string" ? payload : JSON.stringify(payload)
  };
}
function normalizeResumeJson(j) {
  return {
    name: j.name || "",
    title: j.title || void 0,
    contactLines: Array.isArray(j.contactLines) ? j.contactLines.filter(Boolean) : [],
    summary: j.summary || void 0,
    skills: Array.isArray(j.skills) ? j.skills.filter(Boolean) : [],
    experience: Array.isArray(j.experience) ? j.experience.map((e) => ({
      title: e.title || "",
      company: e.company || void 0,
      location: e.location || void 0,
      dateRange: e.dateRange || void 0,
      startDateISO: e.startDateISO || void 0,
      endDateISO: e.endDateISO || void 0,
      current: typeof e.current === "boolean" ? e.current : void 0,
      bullets: Array.isArray(e.bullets) ? e.bullets.filter(Boolean) : []
    })) : [],
    education: Array.isArray(j.education) ? j.education.map((e) => ({
      degree: e.degree || "",
      school: e.school || "",
      location: e.location || void 0,
      dateRange: e.dateRange || void 0,
      startDateISO: e.startDateISO || void 0,
      endDateISO: e.endDateISO || void 0,
      current: typeof e.current === "boolean" ? e.current : void 0,
      details: Array.isArray(e.details) ? e.details.filter(Boolean) : []
    })) : [],
    projects: Array.isArray(j.projects) ? j.projects.map((p) => ({
      name: p.name || "",
      description: p.description || void 0,
      bullets: Array.isArray(p.bullets) ? p.bullets.filter(Boolean) : []
    })) : []
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
