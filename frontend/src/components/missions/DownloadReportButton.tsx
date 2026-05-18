"use client";

import { Download, Printer } from "lucide-react";

function safeFilename(s: string): string {
  return s
    .replace(/[^a-z0-9-_ ]/gi, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 60) || "deliverable";
}

export function DownloadReportButton({
  body,
  title,
}: {
  body: string;
  title: string;
}) {
  const filename = `${safeFilename(title)}.md`;

  function downloadMarkdown() {
    const blob = new Blob([body], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function printPdf() {
    // Open a clean window with just the report content and trigger print.
    // The user picks "Save as PDF" from the system print dialog.
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) return;
    w.document.write(`<!doctype html>
      <html><head><meta charset="utf-8"><title>${title}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", "Yu Gothic", sans-serif; max-width: 720px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #111; }
        h1 { font-size: 24px; }
        h2 { font-size: 20px; margin-top: 28px; }
        h3 { font-size: 17px; margin-top: 22px; }
        pre { white-space: pre-wrap; font-family: inherit; }
      </style>
      </head><body>
      <h1>${title.replace(/[<>&]/g, "")}</h1>
      <pre>${body.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] ?? c))}</pre>
      </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={downloadMarkdown}
        className="inline-flex items-center gap-1.5 rounded-full border-ink-2 bg-white px-3 py-1.5 text-sm font-semibold shadow-doodle-sm press press-hover"
      >
        <Download className="size-4" />
        .md
      </button>
      <button
        type="button"
        onClick={printPdf}
        className="inline-flex items-center gap-1.5 rounded-full border-ink-2 bg-white px-3 py-1.5 text-sm font-semibold shadow-doodle-sm press press-hover"
      >
        <Printer className="size-4" />
        Print / PDF
      </button>
    </div>
  );
}
