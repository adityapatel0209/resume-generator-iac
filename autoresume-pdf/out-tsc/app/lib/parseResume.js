"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseResume = void 0;
var SECTION_KEYWORDS = {
    summary: ['summary', 'profile'],
    skills: ['skills', 'technical skills'],
    experience: ['experience', 'work experience', 'professional experience'],
    education: ['education'],
    projects: ['projects'],
    certifications: ['certifications', 'certification', 'licenses', 'certifications & licenses'],
};
var BULLET_REGEX = /^[*\-•]+\s*/;
var defaultResume = function (name) {
    if (name === void 0) { name = 'Your Name'; }
    return ({
        name: name,
        contactLines: [],
        summary: undefined,
        experience: [],
        education: [],
        skills: [],
        projects: [],
        certifications: [],
    });
};
var normalize = function (value) { return value.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim(); };
var matchSection = function (line) {
    var normalized = normalize(line);
    for (var _i = 0, _a = Object.entries(SECTION_KEYWORDS); _i < _a.length; _i++) {
        var _b = _a[_i], section = _b[0], keywords = _b[1];
        if (keywords.some(function (keyword) { return normalized === keyword || normalized.startsWith(keyword); })) {
            return section;
        }
    }
    return null;
};
var isBulletLine = function (line) { return BULLET_REGEX.test(line.trim()); };
var stripBullet = function (line) { return line.replace(BULLET_REGEX, '').trim(); };
var parseSkills = function (lines) {
    var tokens = lines.flatMap(function (line) {
        return line
            .split(/[|,•;]+|\s+•\s+/)
            .map(function (token) { return token.trim(); })
            .filter(Boolean);
    });
    return Array.from(new Set(tokens));
};
var parseCertifications = function (lines) {
    var items = [];
    var buffer = [];
    var flush = function () {
        if (!buffer.length)
            return;
        var text = buffer.join(' ').trim();
        if (text)
            items.push(text);
        buffer = [];
    };
    lines.forEach(function (line) {
        var trimmed = line.trim();
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
var parseExperience = function (lines) {
    var items = [];
    var current = null;
    lines.forEach(function (line) {
        var trimmed = line.trim();
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
        var entry = buildExperienceEntry(trimmed);
        items.push(entry);
        current = entry;
    });
    return items;
};
var buildExperienceEntry = function (line) {
    var working = line;
    var dateRange;
    var pipeSplit = working.split('|').map(function (part) { return part.trim(); });
    if (pipeSplit.length > 1) {
        dateRange = pipeSplit.pop();
        working = pipeSplit.join(' | ');
    }
    var title = working;
    var company;
    var atSplit = working.split(/\bat\b/i);
    if (atSplit.length === 2) {
        title = atSplit[0].trim();
        company = atSplit[1].trim();
    }
    else if (working.includes(',')) {
        var commaSplit = working.split(',');
        title = commaSplit[0].trim();
        company = commaSplit.slice(1).join(',').trim() || undefined;
    }
    return {
        title: title || 'Experience',
        company: company,
        dateRange: dateRange,
        bullets: [],
    };
};
var parseEducation = function (lines) {
    var items = [];
    var current = null;
    lines.forEach(function (line) {
        var _a;
        var trimmed = line.trim();
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
            current.details = __spreadArray(__spreadArray([], ((_a = current.details) !== null && _a !== void 0 ? _a : []), true), [stripBullet(trimmed)], false);
            return;
        }
        var _b = buildEducationEntry(trimmed), degree = _b.degree, school = _b.school, dateRange = _b.dateRange;
        current = { degree: degree, school: school, dateRange: dateRange, details: [] };
        items.push(current);
    });
    return items;
};
var buildEducationEntry = function (line) {
    var _a, _b;
    var parts = line.split('|').map(function (part) { return part.trim(); }).filter(Boolean);
    var core = (_a = parts[0]) !== null && _a !== void 0 ? _a : line;
    var dateRange = parts.length > 1 ? parts.slice(1).join(' | ') : undefined;
    var commaSplit = core.split(',').map(function (part) { return part.trim(); }).filter(Boolean);
    var degree = (_b = commaSplit[0]) !== null && _b !== void 0 ? _b : 'Education';
    var school = commaSplit.slice(1).join(', ').trim() || commaSplit[0] || 'School';
    return { degree: degree, school: school, dateRange: dateRange };
};
var parseProjects = function (lines) {
    var items = [];
    var current = null;
    var startNewEntry = function (header) {
        var entry = buildProjectEntry(header);
        items.push(entry);
        current = entry;
    };
    lines.forEach(function (line) {
        var _a;
        var trimmed = line.trim();
        if (!trimmed) {
            current = null;
            return;
        }
        if (isBulletLine(trimmed)) {
            if (!current) {
                startNewEntry('Project');
            }
            current.bullets = __spreadArray(__spreadArray([], ((_a = current.bullets) !== null && _a !== void 0 ? _a : []), true), [stripBullet(trimmed)], false);
            return;
        }
        if (!current || looksLikeProjectHeader(trimmed)) {
            startNewEntry(trimmed);
            return;
        }
        current.description = current.description
            ? "".concat(current.description, " ").concat(trimmed)
            : trimmed;
    });
    return items;
};
var looksLikeProjectHeader = function (line) {
    if (!line)
        return false;
    if (/[:|@]/.test(line))
        return true;
    if (line.includes(' - ') || line.includes(' – ') || line.includes(' — '))
        return true;
    var words = line.split(/\s+/).filter(Boolean);
    if (words.length <= 6 && words.every(function (word) { var _a; return /^[A-Z]/.test((_a = word[0]) !== null && _a !== void 0 ? _a : ''); })) {
        return true;
    }
    return false;
};
var buildProjectEntry = function (line) {
    var _a;
    var separators = [' | ', ' - ', ' – ', ' — ', ':'];
    var name = line;
    var description;
    for (var _i = 0, separators_1 = separators; _i < separators_1.length; _i++) {
        var separator = separators_1[_i];
        if (line.includes(separator)) {
            var _b = line.split(separator), left = _b[0], right = _b[1];
            name = left.trim() || 'Project';
            description = (right === null || right === void 0 ? void 0 : right.trim()) || undefined;
            break;
        }
    }
    if (!description && line.includes('|')) {
        var parts = line.split('|').map(function (part) { return part.trim(); }).filter(Boolean);
        name = (_a = parts[0]) !== null && _a !== void 0 ? _a : 'Project';
        description = parts.slice(1).join(' | ') || undefined;
    }
    return {
        name: name,
        description: description,
        bullets: [],
    };
};
var parseResume = function (raw) {
    try {
        if (!raw || typeof raw !== 'string') {
            return defaultResume();
        }
        var lines = raw.split(/\r?\n/).map(function (line) { return line.trim(); });
        var hasContent = lines.some(function (line) { return line.length > 0; });
        if (!hasContent) {
            return defaultResume();
        }
        var firstContentIndex = lines.findIndex(function (line) { return line.length > 0; });
        var name_1 = firstContentIndex >= 0 ? lines[firstContentIndex] : 'Your Name';
        var cursor = firstContentIndex + 1;
        var preSections = [];
        while (cursor < lines.length) {
            var candidate = lines[cursor];
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
        var title = void 0;
        var contactLines = preSections;
        if (preSections.length) {
            var potentialTitle = preSections[0];
            if (potentialTitle && !/[0-9@]/.test(potentialTitle)) {
                title = potentialTitle;
                contactLines = preSections.slice(1);
            }
        }
        var sectionsContent = {
            summary: [],
            skills: [],
            experience: [],
            education: [],
            projects: [],
            certifications: [],
        };
        var currentSection = null;
        for (; cursor < lines.length; cursor += 1) {
            var line = lines[cursor];
            var section = line ? matchSection(line) : null;
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
        var summaryLines = sectionsContent.summary.filter(Boolean);
        var summary = summaryLines.length ? summaryLines.join(' ') : undefined;
        var resume = {
            name: name_1,
            title: title,
            contactLines: contactLines,
            summary: summary,
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
exports.parseResume = parseResume;
