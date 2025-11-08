export interface ResumeExperienceItem {
  title: string;
  company?: string;
  location?: string;
  dateRange?: string;
  bullets: string[];
}

export interface ResumeEducationItem {
  degree: string;
  school: string;
  dateRange?: string;
  details?: string[];
}

export interface ResumeProjectItem {
  name: string;
  description?: string;
  bullets?: string[];
}

export interface ResumeData {
  name: string;
  title?: string;
  contactLines: string[];
  summary?: string;
  experience: ResumeExperienceItem[];
  education: ResumeEducationItem[];
  skills: string[];
  projects: ResumeProjectItem[];
  certifications: string[];
}
