"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var parseResume_1 = require("./lib/parseResume");
var TemplateSelector_1 = require("./components/TemplateSelector");
var DownloadPDFButton_1 = require("./components/DownloadPDFButton");
var ClassicTemplate_1 = require("./components/templates/ClassicTemplate");
var API_URL = import.meta.env.VITE_API_URL;
var App = function () {
    var _a = (0, react_1.useState)(''), rawText = _a[0], setRawText = _a[1];
    var _b = (0, react_1.useState)(null), resumeData = _b[0], setResumeData = _b[1];
    var _c = (0, react_1.useState)('classic'), selectedTemplate = _c[0], setSelectedTemplate = _c[1];
    var _d = (0, react_1.useState)(false), isLoading = _d[0], setIsLoading = _d[1];
    var _e = (0, react_1.useState)(null), errorMessage = _e[0], setErrorMessage = _e[1];
    var handleGenerate = function () { return __awaiter(void 0, void 0, void 0, function () {
        var trimmed, response, data, fallback, error_1, fallback;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    trimmed = rawText.trim();
                    if (!trimmed) {
                        setErrorMessage('Please paste resume text before generating.');
                        return [2 /*return*/];
                    }
                    setIsLoading(true);
                    setErrorMessage(null);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 6, 7, 8]);
                    if (!API_URL) return [3 /*break*/, 4];
                    return [4 /*yield*/, fetch("".concat(API_URL, "/parse"), {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ text: trimmed }),
                        })];
                case 2:
                    response = _a.sent();
                    if (!response.ok) {
                        throw new Error("API error (".concat(response.status, ")"));
                    }
                    return [4 /*yield*/, response.json()];
                case 3:
                    data = (_a.sent());
                    setResumeData(data);
                    return [3 /*break*/, 5];
                case 4:
                    fallback = (0, parseResume_1.parseResume)(trimmed);
                    setResumeData(fallback);
                    setErrorMessage('API URL not configured. Showing heuristic preview instead.');
                    _a.label = 5;
                case 5: return [3 /*break*/, 8];
                case 6:
                    error_1 = _a.sent();
                    console.error('Failed to parse via API, falling back to client parser', error_1);
                    fallback = (0, parseResume_1.parseResume)(trimmed);
                    setResumeData(fallback);
                    setErrorMessage('API parsing failed. Showing heuristic preview.');
                    return [3 /*break*/, 8];
                case 7:
                    setIsLoading(false);
                    return [7 /*endfinally*/];
                case 8: return [2 /*return*/];
            }
        });
    }); };
    var renderTemplate = function () {
        if (!resumeData) {
            return (<div className="flex h-full items-center justify-center text-sm text-slate-500">
          Paste your resume text and click “Generate Preview”.
        </div>);
        }
        switch (selectedTemplate) {
            case 'classic':
            default:
                return <ClassicTemplate_1.ClassicTemplate data={resumeData}/>;
        }
    };
    return (<div className="min-h-screen bg-black text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 lg:flex-row">
        <section className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-2xl lg:w-1/2">
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-semibold">AutoResumePDF</h1>
              <p className="text-sm text-slate-400">
                Paste your resume text (from ChatGPT, docs, etc.)
              </p>
            </div>

            <textarea value={rawText} onChange={function (event) { return setRawText(event.target.value); }} placeholder="Paste raw resume text here..." className="h-80 w-full rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"/>

            <button type="button" onClick={handleGenerate} disabled={isLoading} className="w-full rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60">
              {isLoading ? 'Generating…' : 'Generate Preview'}
            </button>

            {errorMessage && (<p className="text-xs font-semibold text-amber-400">{errorMessage}</p>)}

            <p className="text-xs text-slate-500">
              Note: You are responsible for the accuracy of your information. This tool only formats your content.
            </p>
          </div>
        </section>

        <section className="w-full rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-2xl lg:w-1/2">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <TemplateSelector_1.TemplateSelector selected={selectedTemplate} onChange={setSelectedTemplate}/>
            <DownloadPDFButton_1.DownloadPDFButton disabled={!resumeData}/>
          </div>

          <div id="resume-preview" className="mt-6 h-[750px] overflow-auto rounded-xl bg-white shadow-2xl">
            {renderTemplate()}
          </div>
        </section>
      </div>
    </div>);
};
exports.default = App;
