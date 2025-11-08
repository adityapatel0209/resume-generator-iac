// AWS Lambda handler for "AutoResumePDF" parsing API
// Runtime: Node.js 18+
// Endpoint: POST /parse
//
// Request JSON:
//   { "text": "<raw resume text>" }
//
// Response JSON (shape):
//   {
//     name: string,
//     title?: string,
//     contactLines: string[],
//     summary?: string,
//     skills: string[],
//     experience: Array<{
//       title: string,
//       company?: string,
//       location?: string,
//       dateRange?: string,
//       startDateISO?: string,
//       endDateISO?: string,
//       current?: boolean,
//       bullets: string[]
//     }>,
//     education: Array<{
//       degree: string,
//       school: string,
//       location?: string,
//       dateRange?: string,
//       startDateISO?: string,
//       endDateISO?: string,
//       current?: boolean,
//       details?: string[]
//     }>,
//     projects: Array<{
//       name: string,
//       description?: string,
//       bullets?: string[]
//     }>
//   }

type ResumeExperienceItem = {
  title: string;
  company?: string;
  location?: string;
  dateRange?: string;
  startDateISO?: string;
  endDateISO?: string;
  current?: boolean;
  bullets: string[];
};

type ResumeEducationItem = {
  degree: string;
  school: string;
  location?: string;
  dateRange?: string;
  startDateISO?: string;
  endDateISO?: string;
  current?: boolean;
  details?: string[];
};

type ResumeProjectItem = {
  name: string;
  description?: string;
  bullets?: string[];
};

type ResumeData = {
  name: string;
  title?: string;
  contactLines: string[];
  summary?: string;
  skills: string[];
  experience: ResumeExperienceItem[];
  education: ResumeEducationItem[];
  projects: ResumeProjectItem[];
};

// -------------------------------
// Entry point
// -------------------------------
export const handler = async (event: any) => {
  // Preflight CORS
  if (event.requestContext?.http?.method === "OPTIONS") {
    return cors(204, "");
  }

  try {
    const { text } = safeJson(event.body) ?? {};
    if (!text || typeof text !== "string" || !text.trim()) {
      return cors(400, { error: "Missing 'text' in request body." });
    }

    // If OPENAI_API_KEY provided, try AI parse first; fall back to heuristics on failure.
    const useAI = !!process.env.OPENAI_API_KEY;
    let parsed: ResumeData | null = null;

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

// -------------------------------
// AI-assisted parsing (optional)
// -------------------------------
async function aiParseResume(text: string): Promise<ResumeData> {
  // Uses OpenAI JSON-style instruction. Node 18 has fetch built-in.
  const apiKey = process.env.OPENAI_API_KEY!;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini"; // pick a small, cheap JSON-capable model

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

  // OpenAI Chat Completions-style JSON response (robust to model changes)
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    }),
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

  // Normalize into our ResumeData shape (ensure empty arrays/strings instead of nulls)
  return normalizeResumeJson(j);
}

// -------------------------------
// Heuristic parser (no AI)
// -------------------------------
function heuristicParse(raw: string): ResumeData {
  const lines = raw
    .split(/\r?\n/g)
    .map((l) => l.trim())
    .filter(Boolean);

  if (!lines.length) {
    return emptyResume();
  }

  // Name guess = first line; contact lines until first section header
  const name = lines[0];
  let idx = 1;
  const contactLines: string[] = [];
  while (idx < lines.length && !isSectionHeader(lines[idx])) {
    contactLines.push(lines[idx]);
    idx++;
  }

  // Slice remaining and split into sections
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
    summary: summary || undefined,
    skills,
    experience,
    education,
    projects,
  };
}

function emptyResume(): ResumeData {
  return {
    name: "",
    contactLines: [],
    skills: [],
    experience: [],
    education: [],
    projects: [],
  };
}

// -------------------------------
// Sectioning utilities
// -------------------------------
const KNOWN_HEADERS = [
  "summary", "profile", "about",
  "skills", "technical skills",
  "experience", "work experience", "professional experience", "employment",
  "education", "academics",
  "projects", "personal projects",
  "certifications", "awards", "volunteer"
];

function isSectionHeader(line: string): boolean {
  const t = norm(line);
  return KNOWN_HEADERS.includes(t) || /^(skills|education|experience|projects|summary|profile)\s*:?\s*$/i.test(line);
}

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").replace(/:$/, "");
}

function splitIntoSections(lines: string[]): Record<string, string[]> {
  const sections: Record<string, string[]> = {};
  let current: string | null = null;

  for (const line of lines) {
    if (isSectionHeader(line)) {
      current = normalizeHeader(line);
      if (!sections[current]) sections[current] = [];
      continue;
    }
    if (current) {
      sections[current].push(line);
    } else {
      // orphan lines before any header → dump into summary
      sections.summary ??= [];
      sections.summary.push(line);
    }
  }

  return sections;
}

function normalizeHeader(line: string): string {
  const t = norm(line);
  if (t.includes("work experience") || t.includes("professional") || t.includes("employment")) return "experience";
  if (t.includes("technical skills")) return "skills";
  if (t.includes("personal projects")) return "projects";
  if (t.includes("academics")) return "education";
  if (t.includes("profile") || t.includes("about")) return "summary";
  return t;
}

// -------------------------------
// Parsing: skills
// -------------------------------
function parseSkills(lines: string[]): string[] {
  if (!lines.length) return [];
  const joined = lines.join(" ");
  return joined
    .split(/[,;•|\u2022\u2023\u25CF\u25E6\u2219]/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

// -------------------------------
// Parsing: experience
// -------------------------------
const BULLET_RE = /^\s*(?:[-*•●▪︎‣]|(\d+[\.)]))\s+/;
const DATE_SEP = /\s*(?:-|–|—|to|until|through|thru)\s*/i;
const PRESENT_RE = /\b(present|current|now|ongoing)\b/i;
const DATE_TOKEN_RE =
  /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t)?(?:ember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|\d{1,2}[\/-]\d{2,4}|\d{4})(?:[ ,.'/-]?\d{2,4})?\b/i;

function parseExperience(lines: string[]): ResumeExperienceItem[] {
  const items: ResumeExperienceItem[] = [];
  let current: ResumeExperienceItem | null = null;

  const pushCurrent = () => {
    if (current) {
      // trim bullets
      current.bullets = (current.bullets || []).filter(Boolean);
      items.push(current);
      current = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!line) continue;

    if (BULLET_RE.test(line)) {
      // bullet line for current item
      if (!current) {
        // Start a placeholder if bullet appears before header
        current = { title: "", bullets: [] };
      }
      current.bullets.push(cleanBullet(line));
      continue;
    }

    // Non-bullet: Likely a header line for a new experience item
    // If we already had one, push it
    if (current && (current.title || current.company || current.dateRange || current.bullets.length)) {
      pushCurrent();
    }

    current = { title: "", bullets: [] };

    // Extract date range if present
    const { dateRange, startISO, endISO, currentFlag } = findDateRange(line);
    if (dateRange) current.dateRange = dateRange;
    if (startISO) current.startDateISO = startISO;
    if (endISO) current.endDateISO = endISO;
    if (typeof currentFlag === "boolean") current.current = currentFlag;

    const headerWithoutDates = dateRange ? line.replace(dateRange, "").replace(/[()]/g, "").trim() : line;

    // Try to split header into Title / Company / Location heuristically
    const { title, company, location } = splitHeader(headerWithoutDates);
    current.title = title;
    if (company) current.company = company;
    if (location) current.location = location;

    // Also treat the next few non-bullet lines as bullets if they look like sentences
    // but stop if we hit an empty line or a new "header-like" line with a date token.
    let j = i + 1;
    while (j < lines.length && lines[j] && !BULLET_RE.test(lines[j]) && !looksLikeHeader(lines[j])) {
      current.bullets.push(lines[j].trim());
      j++;
    }
    // fast-forward loop if we consumed extra lines
    i = j - 1;
  }

  // flush last
  if (current) pushCurrent();

  // Filter empty titles by moving company/title if swapped
  return items.map(fixExperienceItem);
}

function cleanBullet(line: string): string {
  return line.replace(BULLET_RE, "").trim();
}

function looksLikeHeader(line: string): boolean {
  // If it contains a date token or separators like " | " and multiple caps, likely a header
  return DATE_TOKEN_RE.test(line) || / \| /.test(line) || /—|–|- @| at |, [A-Z]/.test(line);
}

function splitHeader(s: string): { title: string; company?: string; location?: string } {
  // Common separators: " | ", " - ", " — ", " – ", ",", " at ", " @ "
  let parts = s.split(/\s+\|\s+|—|–| - | @ | at /i).map((x) => x.trim()).filter(Boolean);
  if (parts.length === 1) {
    // Try company, location via comma
    const byComma = s.split(/\s*,\s*/);
    if (byComma.length >= 3) {
      return {
        title: byComma[0],
        company: byComma[1],
        location: byComma.slice(2).join(", "),
      };
    }
    // Maybe "Title, Company"
    if (byComma.length === 2) {
      return { title: byComma[0], company: byComma[1] };
    }
    return { title: s.trim() };
  }

  // Heuristic: if first part has verbs like "Engineer", "Manager", assume it's title
  const guessTitleFirst = /engineer|developer|manager|architect|analyst|lead|consultant|intern|administrator|designer/i.test(parts[0]);
  if (guessTitleFirst) {
    const [title, company, ...rest] = parts;
    const location = rest.length ? rest.join(" • ") : undefined;
    return { title, company, location };
  }

  // Else maybe format is "Company | Title | Location"
  if (parts.length >= 2) {
    const [p0, p1, ...rest] = parts;
    // Decide which one is likely the title by keywords
    const p0LooksTitle = /engineer|developer|manager|architect|analyst|lead|intern/i.test(p0);
    const p1LooksTitle = /engineer|developer|manager|architect|analyst|lead|intern/i.test(p1);

    if (p0LooksTitle && !p1LooksTitle) {
      return { title: p0, company: p1, location: rest.join(" • ") || undefined };
    }
    if (!p0LooksTitle && p1LooksTitle) {
      return { title: p1, company: p0, location: rest.join(" • ") || undefined };
    }
    // fallback
    return { title: p1, company: p0, location: rest.join(" • ") || undefined };
  }

  return { title: s.trim() };
}

function fixExperienceItem(item: ResumeExperienceItem): ResumeExperienceItem {
  // If no title but company exists, swap
  if (!item.title && item.company) {
    item.title = item.company;
    delete item.company;
  }
  // Trim
  item.title = item.title?.trim() || "";
  if (item.company) item.company = item.company.trim();
  if (item.location) item.location = item.location.trim();
  return item;
}

// -------------------------------
// Parsing: education
// -------------------------------
function parseEducation(lines: string[]): ResumeEducationItem[] {
  const items: ResumeEducationItem[] = [];

  let current: ResumeEducationItem | null = null;
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
      current.details!.push(cleanBullet(line));
      continue;
    }

    // New header-ish education line
    if (current && (current.degree || current.school || current.dateRange || current.details?.length)) push();

    current = { degree: "", school: "", details: [] };

    const { dateRange, startISO, endISO, currentFlag } = findDateRange(line);
    if (dateRange) current.dateRange = dateRange;
    if (startISO) current.startDateISO = startISO;
    if (endISO) current.endDateISO = endISO;
    if (typeof currentFlag === "boolean") current.current = currentFlag;

    const headerWithoutDates = dateRange ? line.replace(dateRange, "").replace(/[()]/g, "").trim() : line;

    // Typical forms: "B.Sc. in CS, University of Toronto, Toronto, ON"
    // or "University of X — B.Tech in Y, 2019–2023, Location"
    const parts = headerWithoutDates.split(/\s+\|\s+|—|–| - |, /).map((x) => x.trim()).filter(Boolean);

    // Heuristic: find school-like vs degree-like tokens
    let degree = "";
    let school = "";
    let location: string | undefined;

    const degreeLike = (s: string) =>
      /(b\.?sc|b\.?tech|bachelor|master|m\.?sc|m\.?tech|mba|phd|diploma|associate|certificate|post[- ]grad|pg diploma)/i.test(
        s
      );

    if (parts.length >= 2) {
      // Choose degree among first two tokens
      if (degreeLike(parts[0]) && !degreeLike(parts[1])) {
        degree = parts[0];
        school = parts[1];
        location = parts.slice(2).join(", ") || undefined;
      } else if (!degreeLike(parts[0]) && degreeLike(parts[1])) {
        school = parts[0];
        degree = parts[1];
        location = parts.slice(2).join(", ") || undefined;
      } else {
        // fallback
        degree = parts[0];
        school = parts[1];
        location = parts.slice(2).join(", ") || undefined;
      }
    } else if (parts.length === 1) {
      // Unknown structure: put into school
      school = parts[0];
    }

    current.degree = degree || current.degree;
    current.school = school || current.school;
    if (location) current.location = location;

    // absorb non-bullet continuation lines as details
    let j = i + 1;
    while (j < lines.length && lines[j] && !BULLET_RE.test(lines[j]) && !looksLikeHeader(lines[j])) {
      current.details!.push(lines[j].trim());
      j++;
    }
    i = j - 1;
  }

  if (current) push();
  return items;
}

// -------------------------------
// Parsing: projects
// -------------------------------
function parseProjects(lines: string[]): ResumeProjectItem[] {
  const items: ResumeProjectItem[] = [];
  let current: ResumeProjectItem | null = null;

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
      current.bullets!.push(cleanBullet(line));
      continue;
    }

    // New header-ish project line
    if (current && (current.name || current.description || current.bullets?.length)) push();

    current = { name: "", bullets: [] };

    // Project header often "Name — short description" or "Name | Tech"
    const parts = line.split(/\s+\|\s+|—|–| - /).map((x) => x.trim()).filter(Boolean);
    current.name = parts[0] || line.trim();
    if (parts[1]) current.description = parts.slice(1).join(" • ");

    // absorb continuation lines
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

// -------------------------------
// Date extraction & normalization
// -------------------------------
const MONTHS = [
  "january","february","march","april","may","june",
  "july","august","september","october","november","december"
];
const MONTH_ABBR = MONTHS.map((m) => m.slice(0, 3));

function findDateRange(line: string): { dateRange?: string; startISO?: string; endISO?: string; currentFlag?: boolean } {
  // Find a substring that looks like a date range within the line
  // Examples: "Jan 2021 - Present", "2020/03–2021/08", "2019–20", "Mar '19 to Sep '21"
  // Strategy: locate first date token, then try to grab a separator and a second token.
  const match1 = line.match(DATE_TOKEN_RE);
  if (!match1) return {};

  const afterFirst = line.slice(match1.index! + match1[0].length);
  const sepMatch = afterFirst.match(DATE_SEP);
  if (!sepMatch) {
    // Single date only; still useful
    const first = match1[0];
    const startISO = toISO(first);
    return { dateRange: first, startISO };
  }

  const afterSep = afterFirst.slice(sepMatch.index! + sepMatch[0].length);
  const match2 = afterSep.match(DATE_TOKEN_RE);
  let second = match2?.[0] ?? "";

  // Present/current tail
  let currentFlag = false;
  if (!second && PRESENT_RE.test(afterSep)) {
    second = (afterSep.match(PRESENT_RE) || ["Present"])[0];
    currentFlag = true;
  }

  const first = match1[0];
  const rangeRaw = first + sepMatch[0] + (second || (currentFlag ? "Present" : ""));
  const startISO = toISO(first);
  const endISO = second && !PRESENT_RE.test(second) ? toISO(second) : undefined;

  return {
    dateRange: cleanupRange(rangeRaw),
    startISO: startISO || undefined,
    endISO: endISO || undefined,
    currentFlag: currentFlag || PRESENT_RE.test(second || ""),
  };
}

function cleanupRange(r: string): string {
  return r.replace(/\s+/g, " ").replace(/--+/g, "-").trim();
}

function toISO(token: string): string | null {
  token = token.replace(/[()]/g, "").trim();

  // Formats:
  //  - Jan 2021, January 2021, Mar '19
  //  - 2021-03, 2021/03, 03/2021
  //  - 2019, '19
  const lower = token.toLowerCase();

  // Month name + year
  for (let i = 0; i < MONTHS.length; i++) {
    if (lower.startsWith(MONTHS[i]) || lower.startsWith(MONTH_ABBR[i])) {
      const year = extractYear(token);
      const month = i + 1;
      if (year) return `${pad(year)}-${pad(month)}-01`;
    }
  }

  // numeric formats: 2021-03, 2021/03
  const y_m = token.match(/\b(\d{4})[\/-](\d{1,2})\b/);
  if (y_m) {
    const y = Number(y_m[1]);
    const m = Number(y_m[2]);
    if (validYear(y) && validMonth(m)) return `${pad(y)}-${pad(m)}-01`;
  }

  // numeric formats: 03/2021
  const m_y = token.match(/\b(\d{1,2})[\/-](\d{2,4})\b/);
  if (m_y) {
    const m = Number(m_y[1]);
    const y = toFourDigitYear(m_y[2]);
    if (validYear(y) && validMonth(m)) return `${pad(y)}-${pad(m)}-01`;
  }

  // year only: 2019 or '19
  const yOnly = extractYear(token);
  if (yOnly) return `${pad(yOnly)}-01-01`;

  return null;
}

function extractYear(s: string): number | null {
  const four = s.match(/\b(19|20)\d{2}\b/);
  if (four) return Number(four[0]);
  const two = s.match(/['’](\d{2})\b/);
  if (two) return toFourDigitYear(two[1]);
  return null;
}

function toFourDigitYear(twoOrFour: string): number {
  if (twoOrFour.length === 4) return Number(twoOrFour);
  const n = Number(twoOrFour);
  // heuristic: '90-'99 => 1990s, '00-'29 => 2000s
  return n >= 90 ? 1900 + n : 2000 + n;
}

function validYear(y: number) {
  return y >= 1950 && y <= 2100;
}
function validMonth(m: number) {
  return m >= 1 && m <= 12;
}
function pad(n: number) {
  return String(n).padStart(2, "0");
}

// -------------------------------
// Utilities
// -------------------------------
function safeJson(body: string | null | undefined): any | null {
  try {
    return body ? JSON.parse(body) : null;
  } catch {
    return null;
  }
}

function guessTitleFromContact(lines: string[]): string | undefined {
  // If user included a line like "Cloud/DevOps Engineer" right under name, use it.
  const first = lines[0]?.trim();
  if (!first) return undefined;
  if (/[A-Za-z].+ (Engineer|Developer|Manager|Architect|Analyst|Intern|Consultant)/i.test(first)) {
    return first;
  }
  return undefined;
}

function cors(status: number, payload: any) {
  return {
    statusCode: status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "OPTIONS,POST",
    },
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
  };
}

function normalizeResumeJson(j: any): ResumeData {
  return {
    name: j.name || "",
    title: j.title || undefined,
    contactLines: Array.isArray(j.contactLines) ? j.contactLines.filter(Boolean) : [],
    summary: j.summary || undefined,
    skills: Array.isArray(j.skills) ? j.skills.filter(Boolean) : [],
    experience: Array.isArray(j.experience)
      ? j.experience.map((e: any): ResumeExperienceItem => ({
          title: e.title || "",
          company: e.company || undefined,
          location: e.location || undefined,
          dateRange: e.dateRange || undefined,
          startDateISO: e.startDateISO || undefined,
          endDateISO: e.endDateISO || undefined,
          current: typeof e.current === "boolean" ? e.current : undefined,
          bullets: Array.isArray(e.bullets) ? e.bullets.filter(Boolean) : [],
        }))
      : [],
    education: Array.isArray(j.education)
      ? j.education.map((e: any): ResumeEducationItem => ({
          degree: e.degree || "",
          school: e.school || "",
          location: e.location || undefined,
          dateRange: e.dateRange || undefined,
          startDateISO: e.startDateISO || undefined,
          endDateISO: e.endDateISO || undefined,
          current: typeof e.current === "boolean" ? e.current : undefined,
          details: Array.isArray(e.details) ? e.details.filter(Boolean) : [],
        }))
      : [],
    projects: Array.isArray(j.projects)
      ? j.projects.map((p: any): ResumeProjectItem => ({
          name: p.name || "",
          description: p.description || undefined,
          bullets: Array.isArray(p.bullets) ? p.bullets.filter(Boolean) : [],
        }))
      : [],
  };
}