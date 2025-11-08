import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { parseResume } from './lib/parseResume';
import { TemplateSelector } from './components/TemplateSelector';
import { DownloadPDFButton } from './components/DownloadPDFButton';
import { ClassicTemplate } from './components/templates/ClassicTemplate';
const API_URL = import.meta.env.VITE_API_URL;
const App = () => {
    const [rawText, setRawText] = useState('');
    const [resumeData, setResumeData] = useState(null);
    const [selectedTemplate, setSelectedTemplate] = useState('classic');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
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
                const data = (await response.json());
                setResumeData(data);
            }
            else {
                const fallback = parseResume(trimmed);
                setResumeData(fallback);
                setErrorMessage('API URL not configured. Showing heuristic preview instead.');
            }
        }
        catch (error) {
            console.error('Failed to parse via API, falling back to client parser', error);
            const fallback = parseResume(trimmed);
            setResumeData(fallback);
            setErrorMessage('API parsing failed. Showing heuristic preview.');
        }
        finally {
            setIsLoading(false);
        }
    };
    const renderTemplate = () => {
        if (!resumeData) {
            return (_jsx("div", { className: "flex h-full items-center justify-center text-sm text-slate-500", children: "Paste your resume text and click \u201CGenerate Preview\u201D." }));
        }
        switch (selectedTemplate) {
            case 'classic':
            default:
                return _jsx(ClassicTemplate, { data: resumeData });
        }
    };
    return (_jsx("div", { className: "min-h-screen bg-black text-slate-100", children: _jsxs("div", { className: "mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 lg:flex-row", children: [_jsx("section", { className: "w-full rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-2xl lg:w-1/2", children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-semibold", children: "AutoResumePDF" }), _jsx("p", { className: "text-sm text-slate-400", children: "Paste your resume text (from ChatGPT, docs, etc.)" })] }), _jsx("textarea", { value: rawText, onChange: (event) => setRawText(event.target.value), placeholder: "Paste raw resume text here...", className: "h-80 w-full rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-100 focus:border-blue-500 focus:outline-none" }), _jsx("button", { type: "button", onClick: handleGenerate, disabled: isLoading, className: "w-full rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60", children: isLoading ? 'Generating…' : 'Generate Preview' }), errorMessage && (_jsx("p", { className: "text-xs font-semibold text-amber-400", children: errorMessage })), _jsx("p", { className: "text-xs text-slate-500", children: "Note: You are responsible for the accuracy of your information. This tool only formats your content." })] }) }), _jsxs("section", { className: "w-full rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-2xl lg:w-1/2", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-4", children: [_jsx(TemplateSelector, { selected: selectedTemplate, onChange: setSelectedTemplate }), _jsx(DownloadPDFButton, { disabled: !resumeData })] }), _jsx("div", { id: "resume-preview", className: "mt-6 h-[750px] overflow-auto rounded-xl bg-white shadow-2xl", children: renderTemplate() })] })] }) }));
};
export default App;
