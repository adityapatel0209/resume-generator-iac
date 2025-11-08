declare module 'html2pdf.js' {
  interface Html2PdfInstance {
    from(source: HTMLElement | string): Html2PdfInstance;
    set(options: Record<string, unknown>): Html2PdfInstance;
    save(filename?: string): Promise<void>;
  }

  interface Html2PdfFactory {
    (): Html2PdfInstance;
  }

  const html2pdf: Html2PdfFactory;
  export default html2pdf;
}
