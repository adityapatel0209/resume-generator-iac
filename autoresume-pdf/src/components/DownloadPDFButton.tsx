import { useCallback } from 'react';

interface DownloadPDFButtonProps {
  disabled?: boolean;
}

export const DownloadPDFButton = ({ disabled }: DownloadPDFButtonProps) => {
  const handleDownload = useCallback(async () => {
    if (disabled || typeof window === 'undefined') return;

    const element = document.getElementById('resume-preview');
    if (!element) return;

    const html2pdfModule = await import('html2pdf.js');
    const html2pdf = html2pdfModule.default ?? html2pdfModule;

    html2pdf()
      .set({
        margin: 0.5,
        filename: 'resume.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
      })
      .from(element)
      .save();
  }, [disabled]);

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={disabled}
      className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
    >
      Download PDF
    </button>
  );
};
