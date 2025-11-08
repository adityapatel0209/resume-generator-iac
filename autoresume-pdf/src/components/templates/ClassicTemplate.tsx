import type { ReactNode } from 'react';
import type { ResumeData } from '../../types/resume';

interface ClassicTemplateProps {
  data: ResumeData;
}

export const ClassicTemplate = ({ data }: ClassicTemplateProps) => {
  const hasSummary = Boolean(data.summary);
  const hasSkills = data.skills.length > 0;
  const hasExperience = data.experience.length > 0;
  const hasEducation = data.education.length > 0;
  const hasProjects = data.projects.length > 0;
  const hasCertifications = data.certifications.length > 0;

  return (
    <article className="mx-auto w-full max-w-3xl rounded-[32px] border border-slate-200 bg-white px-12 py-12 text-slate-900 shadow-2xl">
      <header className="text-center">
        <h1 className="text-4xl font-serif font-bold uppercase tracking-wide text-slate-900">
          {data.name}
        </h1>
        {data.title && (
          <p className="mt-1 text-lg font-medium text-slate-600">{data.title}</p>
        )}
        {data.contactLines.length > 0 && (
          <div className="mt-4 space-y-1 text-sm font-medium text-slate-600">
            {data.contactLines.filter(Boolean).map((line, index) => (
              <p key={`${line}-${index}`}>{line}</p>
            ))}
          </div>
        )}
      </header>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-slate-700">
        {hasSummary && (
          <SectionBlock title="Professional Summary">
            <p>{data.summary}</p>
          </SectionBlock>
        )}

        {hasSkills && (
          <SectionBlock title="Core Skills">
            <ul className="grid list-disc gap-x-8 gap-y-1 pl-5 text-base font-medium sm:grid-cols-2">
              {data.skills.map((skill, index) => (
                <li key={`${skill}-${index}`}>{skill}</li>
              ))}
            </ul>
          </SectionBlock>
        )}

        {hasExperience && (
          <SectionBlock title="Professional Experience">
            <div className="space-y-6">
              {data.experience.map((item, index) => (
                <div key={`${item.title}-${index}`} className="space-y-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-4 text-base">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {item.company ?? item.title}
                      </p>
                      {item.company && (
                        <p className="text-sm italic text-slate-600">{item.title}</p>
                      )}
                    </div>
                    <div className="text-right text-xs uppercase tracking-wide text-slate-500">
                      {item.location && <p>{item.location}</p>}
                      {item.dateRange && <p>{item.dateRange}</p>}
                    </div>
                  </div>

                  {item.bullets.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Accomplishments:
                      </p>
                      <ul className="mt-2 space-y-1 pl-5 text-sm leading-relaxed text-slate-700">
                        {item.bullets.map((bullet, bulletIndex) => (
                          <li key={`${item.title}-${bulletIndex}`} className="list-disc">
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </SectionBlock>
        )}

        {hasProjects && (
          <SectionBlock title="Projects">
            <div className="space-y-4">
              {data.projects.map((project, index) => (
                <div key={`${project.name}-${index}`} className="space-y-1">
                  <p className="text-base font-semibold text-slate-900">{project.name}</p>
                  {project.description && (
                    <p className="text-sm text-slate-600">{project.description}</p>
                  )}
                  {project.bullets?.length ? (
                    <ul className="mt-1 space-y-1 pl-5 text-sm leading-relaxed">
                      {project.bullets.map((bullet, bulletIndex) => (
                        <li key={`${project.name}-${bulletIndex}`} className="list-disc">
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          </SectionBlock>
        )}

        {hasEducation && (
          <SectionBlock title="Education">
            <div className="space-y-4">
              {data.education.map((item, index) => (
                <div key={`${item.degree}-${index}`} className="space-y-1 text-sm">
                  <p className="text-base font-semibold text-slate-900">
                    {item.degree}
                  </p>
                  <p className="text-sm text-slate-600">{item.school}</p>
                  {item.dateRange && (
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      {item.dateRange}
                    </p>
                  )}
                  {item.details?.length ? (
                    <ul className="mt-1 space-y-1 pl-5 text-sm leading-relaxed">
                      {item.details.map((detail, detailIndex) => (
                        <li key={`${item.degree}-${detailIndex}`} className="list-disc">
                          {detail}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          </SectionBlock>
        )}

        {hasCertifications && (
          <SectionBlock title="Certifications">
            <ul className="list-disc space-y-1 pl-5 text-base font-medium">
              {data.certifications.map((certification, index) => (
                <li key={`${certification}-${index}`}>{certification}</li>
              ))}
            </ul>
          </SectionBlock>
        )}
      </div>
    </article>
  );
};

const SectionBlock = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="space-y-3">
    <div className="flex items-center gap-4">
      <span className="hidden flex-1 border-t border-slate-300 sm:block" />
      <h2 className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.3em] text-slate-600">
        {title}
      </h2>
      <span className="flex-1 border-t border-slate-300" />
    </div>
    {children}
  </section>
);
