import { useState } from 'react';
import { parseResume } from './lib/parseResume';
import { TemplateSelector } from './components/TemplateSelector';
import { DownloadPDFButton } from './components/DownloadPDFButton';
import { ClassicTemplate } from './components/templates/ClassicTemplate';
import type { TemplateId } from './components/TemplateSelector';
import type { ResumeData } from './types/resume';

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

const App = () => {
  const [rawText, setRawText] = useState('');
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('classic');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGenerate = async () => {
    const trimmed = rawText.trim();
    if (!trimmed) {
      setErrorMessage('Please paste resume text before generating.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (API_URL) {
        const response = await fetch(`${API_URL}/parse`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: trimmed }),
        });

        if (!response.ok) {
          throw new Error(`API error (${response.status})`);
        }

        const data = (await response.json()) as ResumeData;
        setResumeData(data);
      } else {
        const fallback = parseResume(trimmed);
        setResumeData(fallback);
        setErrorMessage('API URL not configured. Showing heuristic preview instead.');
      }
    } catch (error) {
      console.error('Failed to parse via API, falling back to client parser', error);
      const fallback = parseResume(trimmed);
      setResumeData(fallback);
      setErrorMessage('API parsing failed. Showing heuristic preview.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderTemplate = () => {
    if (!resumeData) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-slate-500">
          Paste your resume text and click “Generate Preview”.
        </div>
      );
    }

    switch (selectedTemplate) {
      case 'classic':
      default:
        return <ClassicTemplate data={resumeData} />;
    }
  };

  return (
    <div className="min-h-screen bg-black text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 lg:flex-row">
        <section className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-2xl lg:w-1/2">
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-semibold">AutoResumePDF</h1>
              <p className="text-sm text-slate-400">
                Paste your resume text (from ChatGPT, docs, etc.)
              </p>
            </div>

            <textarea
              value={rawText}
              onChange={(event) => setRawText(event.target.value)}
              placeholder="Paste raw resume text here..."
              className="h-80 w-full rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
            />

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isLoading}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Generating…' : 'Generate Preview'}
            </button>

            {errorMessage && (
              <p className="text-xs font-semibold text-amber-400">{errorMessage}</p>
            )}

            <p className="text-xs text-slate-500">
              Note: You are responsible for the accuracy of your information. This tool only formats your content.
            </p>
          </div>
        </section>

        <section className="w-full rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-2xl lg:w-1/2">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <TemplateSelector selected={selectedTemplate} onChange={setSelectedTemplate} />
            <DownloadPDFButton disabled={!resumeData} />
          </div>

          <div
            id="resume-preview"
            className="mt-6 h-[750px] overflow-auto rounded-xl bg-white shadow-2xl"
          >
            {renderTemplate()}
          </div>
        </section>
      </div>
    </div>
  );
};

export default App;
