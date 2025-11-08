const SECTION_KEYWORDS = {
    summary: ['summary', 'profile'],
    skills: ['skills', 'technical skills'],
    experience: ['experience', 'work experience', 'professional experience'],
    education: ['education'],
    projects: ['projects'],
    certifications: ['certifications', 'certification', 'licenses', 'certifications & licenses'],
};
const BULLET_REGEX = /^[*\-•]+\s*/;
const defaultResume = (name = 'Your Name') => ({
    name,
    contactLines: [],
    summary: undefined,
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
});
const normalize = (value) => value.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
const matchSection = (line) => {
    const normalized = normalize(line);
    for (const [section, keywords] of Object.entries(SECTION_KEYWORDS)) {
        if (keywords.some((keyword) => normalized === keyword || normalized.startsWith(keyword))) {
            return section;
        }
    }
    return null;
};
const isBulletLine = (line) => BULLET_REGEX.test(line.trim());
const stripBullet = (line) => line.replace(BULLET_REGEX, '').trim();
const parseSkills = (lines) => {
    const tokens = lines.flatMap((line) => line
        .split(/[|,•;]+|\s+•\s+/)
        .map((token) => token.trim())
        .filter(Boolean));
    return Array.from(new Set(tokens));
};
const parseCertifications = (lines) => {
    const items = [];
    let buffer = [];
    const flush = () => {
        if (!buffer.length)
            return;
        const text = buffer.join(' ').trim();
        if (text)
            items.push(text);
        buffer = [];
    };
    lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) {
            flush();
            return;
        }
        if (isBulletLine(trimmed)) {
            flush();
            items.push(stripBullet(trimmed));
            return;
        }
        buffer.push(trimmed);
    });
    flush();
    return items;
};
const parseExperience = (lines) => {
    const items = [];
    let current = null;
    lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed)
            return;
        if (isBulletLine(trimmed)) {
            if (!current) {
                current = {
                    title: 'Experience',
                    bullets: [],
                };
                items.push(current);
            }
            current.bullets.push(stripBullet(trimmed));
            return;
        }
        const entry = buildExperienceEntry(trimmed);
        items.push(entry);
        current = entry;
    });
    return items;
};
const buildExperienceEntry = (line) => {
    let working = line;
    let dateRange;
    const pipeSplit = working.split('|').map((part) => part.trim());
    if (pipeSplit.length > 1) {
        dateRange = pipeSplit.pop();
        working = pipeSplit.join(' | ');
    }
    let title = working;
    let company;
    const atSplit = working.split(/\bat\b/i);
    if (atSplit.length === 2) {
        title = atSplit[0].trim();
        company = atSplit[1].trim();
    }
    else if (working.includes(',')) {
        const commaSplit = working.split(',');
        title = commaSplit[0].trim();
        company = commaSplit.slice(1).join(',').trim() || undefined;
    }
    return {
        title: title || 'Experience',
        company,
        dateRange,
        bullets: [],
    };
};
const parseEducation = (lines) => {
    const items = [];
    let current = null;
    lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed)
            return;
        if (isBulletLine(trimmed)) {
            if (!current) {
                current = {
                    degree: 'Education',
                    school: '',
                    details: [],
                };
                items.push(current);
            }
            current.details = [...(current.details ?? []), stripBullet(trimmed)];
            return;
        }
        const { degree, school, dateRange } = buildEducationEntry(trimmed);
        current = { degree, school, dateRange, details: [] };
        items.push(current);
    });
    return items;
};
const buildEducationEntry = (line) => {
    const parts = line.split('|').map((part) => part.trim()).filter(Boolean);
    const core = parts[0] ?? line;
    const dateRange = parts.length > 1 ? parts.slice(1).join(' | ') : undefined;
    const commaSplit = core.split(',').map((part) => part.trim()).filter(Boolean);
    const degree = commaSplit[0] ?? 'Education';
    const school = commaSplit.slice(1).join(', ').trim() || commaSplit[0] || 'School';
    return { degree, school, dateRange };
};
const parseProjects = (lines) => {
    const items = [];
    let current = null;
    const startNewEntry = (header) => {
        const entry = buildProjectEntry(header);
        items.push(entry);
        current = entry;
    };
    lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) {
            current = null;
            return;
        }
        if (isBulletLine(trimmed)) {
            if (!current) {
                startNewEntry('Project');
            }
            current.bullets = [...(current.bullets ?? []), stripBullet(trimmed)];
            return;
        }
        if (!current || looksLikeProjectHeader(trimmed)) {
            startNewEntry(trimmed);
            return;
        }
        current.description = current.description
            ? `${current.description} ${trimmed}`
            : trimmed;
    });
    return items;
};
const looksLikeProjectHeader = (line) => {
    if (!line)
        return false;
    if (/[:|@]/.test(line))
        return true;
    if (line.includes(' - ') || line.includes(' – ') || line.includes(' — '))
        return true;
    const words = line.split(/\s+/).filter(Boolean);
    if (words.length <= 6 && words.every((word) => /^[A-Z]/.test(word[0] ?? ''))) {
        return true;
    }
    return false;
};
const buildProjectEntry = (line) => {
    const separators = [' | ', ' - ', ' – ', ' — ', ':'];
    let name = line;
    let description;
    for (const separator of separators) {
        if (line.includes(separator)) {
            const [left, right] = line.split(separator);
            name = left.trim() || 'Project';
            description = right?.trim() || undefined;
            break;
        }
    }
    if (!description && line.includes('|')) {
        const parts = line.split('|').map((part) => part.trim()).filter(Boolean);
        name = parts[0] ?? 'Project';
        description = parts.slice(1).join(' | ') || undefined;
    }
    return {
        name,
        description,
        bullets: [],
    };
};
export const parseResume = (raw) => {
    try {
        if (!raw || typeof raw !== 'string') {
            return defaultResume();
        }
        const lines = raw.split(/\r?\n/).map((line) => line.trim());
        const hasContent = lines.some((line) => line.length > 0);
        if (!hasContent) {
            return defaultResume();
        }
        const firstContentIndex = lines.findIndex((line) => line.length > 0);
        const name = firstContentIndex >= 0 ? lines[firstContentIndex] : 'Your Name';
        let cursor = firstContentIndex + 1;
        const preSections = [];
        while (cursor < lines.length) {
            const candidate = lines[cursor];
            if (!candidate) {
                cursor += 1;
                continue;
            }
            if (matchSection(candidate)) {
                break;
            }
            preSections.push(candidate);
            cursor += 1;
        }
        let title;
        let contactLines = preSections;
        if (preSections.length) {
            const potentialTitle = preSections[0];
            if (potentialTitle && !/[0-9@]/.test(potentialTitle)) {
                title = potentialTitle;
                contactLines = preSections.slice(1);
            }
        }
        const sectionsContent = {
            summary: [],
            skills: [],
            experience: [],
            education: [],
            projects: [],
            certifications: [],
        };
        let currentSection = null;
        for (; cursor < lines.length; cursor += 1) {
            const line = lines[cursor];
            const section = line ? matchSection(line) : null;
            if (section) {
                currentSection = section;
                continue;
            }
            if (currentSection) {
                sectionsContent[currentSection].push(line);
            }
            else {
                sectionsContent.summary.push(line);
            }
        }
        const summaryLines = sectionsContent.summary.filter(Boolean);
        const summary = summaryLines.length ? summaryLines.join(' ') : undefined;
        const resume = {
            name,
            title,
            contactLines,
            summary,
            skills: parseSkills(sectionsContent.skills),
            experience: parseExperience(sectionsContent.experience),
            education: parseEducation(sectionsContent.education),
            projects: parseProjects(sectionsContent.projects),
            certifications: parseCertifications(sectionsContent.certifications),
        };
        return resume;
    }
    catch (error) {
        console.warn('parseResume failed, returning fallback data', error);
        return defaultResume();
    }
};
