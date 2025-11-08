import { jsx as _jsx } from "react/jsx-runtime";
const templates = [
    { id: 'classic', label: 'Classic' },
];
export const TemplateSelector = ({ selected, onChange }) => {
    return (_jsx("div", { className: "flex items-center gap-3", children: templates.map((template) => (_jsx("button", { type: "button", onClick: () => onChange(template.id), className: `rounded-md border px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${selected === template.id
                ? 'border-blue-400 bg-blue-600 text-white'
                : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500'}`, children: template.label }, template.id))) }));
};
