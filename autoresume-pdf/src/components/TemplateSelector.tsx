export type TemplateId = 'classic';

interface TemplateSelectorProps {
  selected: TemplateId;
  onChange: (id: TemplateId) => void;
}

const templates: { id: TemplateId; label: string }[] = [
  { id: 'classic', label: 'Classic' },
];

export const TemplateSelector = ({ selected, onChange }: TemplateSelectorProps) => {
  return (
    <div className="flex items-center gap-3">
      {templates.map((template) => (
        <button
          key={template.id}
          type="button"
          onClick={() => onChange(template.id)}
          className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
            selected === template.id
              ? 'border-blue-400 bg-blue-600 text-white'
              : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500'
          }`}
        >
          {template.label}
        </button>
      ))}
    </div>
  );
};
