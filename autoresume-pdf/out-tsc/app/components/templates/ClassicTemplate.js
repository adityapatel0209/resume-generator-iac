"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassicTemplate = void 0;
var ClassicTemplate = function (_a) {
    var data = _a.data;
    var hasSummary = Boolean(data.summary);
    var hasSkills = data.skills.length > 0;
    var hasExperience = data.experience.length > 0;
    var hasEducation = data.education.length > 0;
    var hasProjects = data.projects.length > 0;
    var hasCertifications = data.certifications.length > 0;
    return (<article className="mx-auto w-full max-w-3xl rounded-[32px] border border-slate-200 bg-white px-12 py-12 text-slate-900 shadow-2xl">
      <header className="text-center">
        <h1 className="text-4xl font-serif font-bold uppercase tracking-wide text-slate-900">
          {data.name}
        </h1>
        {data.title && (<p className="mt-1 text-lg font-medium text-slate-600">{data.title}</p>)}
        {data.contactLines.length > 0 && (<div className="mt-4 space-y-1 text-sm font-medium text-slate-600">
            {data.contactLines.filter(Boolean).map(function (line, index) { return (<p key={"".concat(line, "-").concat(index)}>{line}</p>); })}
          </div>)}
      </header>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-slate-700">
        {hasSummary && (<SectionBlock title="Professional Summary">
            <p>{data.summary}</p>
          </SectionBlock>)}

        {hasSkills && (<SectionBlock title="Core Skills">
            <ul className="grid list-disc gap-x-8 gap-y-1 pl-5 text-base font-medium sm:grid-cols-2">
              {data.skills.map(function (skill, index) { return (<li key={"".concat(skill, "-").concat(index)}>{skill}</li>); })}
            </ul>
          </SectionBlock>)}

        {hasExperience && (<SectionBlock title="Professional Experience">
            <div className="space-y-6">
              {data.experience.map(function (item, index) {
                var _a;
                return (<div key={"".concat(item.title, "-").concat(index)} className="space-y-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-4 text-base">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {(_a = item.company) !== null && _a !== void 0 ? _a : item.title}
                      </p>
                      {item.company && (<p className="text-sm italic text-slate-600">{item.title}</p>)}
                    </div>
                    <div className="text-right text-xs uppercase tracking-wide text-slate-500">
                      {item.location && <p>{item.location}</p>}
                      {item.dateRange && <p>{item.dateRange}</p>}
                    </div>
                  </div>

                  {item.bullets.length > 0 && (<div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Accomplishments:
                      </p>
                      <ul className="mt-2 space-y-1 pl-5 text-sm leading-relaxed text-slate-700">
                        {item.bullets.map(function (bullet, bulletIndex) { return (<li key={"".concat(item.title, "-").concat(bulletIndex)} className="list-disc">
                            {bullet}
                          </li>); })}
                      </ul>
                    </div>)}
                </div>);
            })}
            </div>
          </SectionBlock>)}

        {hasProjects && (<SectionBlock title="Projects">
            <div className="space-y-4">
              {data.projects.map(function (project, index) {
                var _a;
                return (<div key={"".concat(project.name, "-").concat(index)} className="space-y-1">
                  <p className="text-base font-semibold text-slate-900">{project.name}</p>
                  {project.description && (<p className="text-sm text-slate-600">{project.description}</p>)}
                  {((_a = project.bullets) === null || _a === void 0 ? void 0 : _a.length) ? (<ul className="mt-1 space-y-1 pl-5 text-sm leading-relaxed">
                      {project.bullets.map(function (bullet, bulletIndex) { return (<li key={"".concat(project.name, "-").concat(bulletIndex)} className="list-disc">
                          {bullet}
                        </li>); })}
                    </ul>) : null}
                </div>);
            })}
            </div>
          </SectionBlock>)}

        {hasEducation && (<SectionBlock title="Education">
            <div className="space-y-4">
              {data.education.map(function (item, index) {
                var _a;
                return (<div key={"".concat(item.degree, "-").concat(index)} className="space-y-1 text-sm">
                  <p className="text-base font-semibold text-slate-900">
                    {item.degree}
                  </p>
                  <p className="text-sm text-slate-600">{item.school}</p>
                  {item.dateRange && (<p className="text-xs uppercase tracking-wide text-slate-500">
                      {item.dateRange}
                    </p>)}
                  {((_a = item.details) === null || _a === void 0 ? void 0 : _a.length) ? (<ul className="mt-1 space-y-1 pl-5 text-sm leading-relaxed">
                      {item.details.map(function (detail, detailIndex) { return (<li key={"".concat(item.degree, "-").concat(detailIndex)} className="list-disc">
                          {detail}
                        </li>); })}
                    </ul>) : null}
                </div>);
            })}
            </div>
          </SectionBlock>)}

        {hasCertifications && (<SectionBlock title="Certifications">
            <ul className="list-disc space-y-1 pl-5 text-base font-medium">
              {data.certifications.map(function (certification, index) { return (<li key={"".concat(certification, "-").concat(index)}>{certification}</li>); })}
            </ul>
          </SectionBlock>)}
      </div>
    </article>);
};
exports.ClassicTemplate = ClassicTemplate;
var SectionBlock = function (_a) {
    var title = _a.title, children = _a.children;
    return (<section className="space-y-3">
    <div className="flex items-center gap-4">
      <span className="hidden flex-1 border-t border-slate-300 sm:block"/>
      <h2 className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.3em] text-slate-600">
        {title}
      </h2>
      <span className="flex-1 border-t border-slate-300"/>
    </div>
    {children}
  </section>);
};
