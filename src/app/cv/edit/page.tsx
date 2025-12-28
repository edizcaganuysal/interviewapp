"use client";

import { useState, useEffect, useRef } from "react";
import createSupabaseBrowserClient from "@/core/supabase/browser";

export default function CvEditPage() {
  const [text, setText] = useState("");
  const [cvFilename, setCvFilename] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [future, setFuture] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch("/api/cv/latest", { cache: "no-store", headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.item) {
        const initial = json.item.extracted_text ?? "";
        setText(initial);
        setHistory([initial]);
        setCvFilename(json.item.parsed_json?.cv_filename ?? null);
      }
    })();
  }, []);

  function escapePdf(textValue: string) {
    return textValue.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  }

  function toPdfBase64(textValue: string) {
    const safe = (textValue || " ").replace(/\r/g, "");
    const lines = safe.split(/\n/).slice(0, 800).map((l) => escapePdf(l || " "));
    const body = lines
      .map((line, idx) => `${idx === 0 ? "" : "0 -14 Td\n"}(${line}) Tj`)
      .join("\n");
    const stream = `BT\n/F1 12 Tf\n50 760 Td\n${body}\nET`;
    const objects = [
      "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
      "2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj\n",
      "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n",
      `4 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj\n`,
      "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
    ];
    const header = "%PDF-1.4\n";
    let pdf = header;
    const xref: string[] = ["0000000000 65535 f \n"];
    const pad = (n: number) => n.toString().padStart(10, "0");
    let offset = pdf.length;
    for (const obj of objects) {
      xref.push(`${pad(offset)} 00000 n \n`);
      pdf += obj;
      offset = pdf.length;
    }
    const xrefStart = pdf.length;
    pdf += `xref\n0 ${xref.length}\n${xref.join("")}trailer\n<< /Size ${xref.length} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
    return btoa(unescape(encodeURIComponent(pdf)));
  }

  function handleChange(next: string) {
    setText(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setHistory((h) => {
        if ((h[h.length - 1] ?? "") === next) return h;
        return [...h.slice(-49), next];
      });
      setFuture([]);
    }, 400);
  }

  function handleUndo(h: string[], setH: any, setF: any, setT: any) {
    if (h.length <= 1) return;
    const newFuture = h[h.length - 1];
    const newHistory = h.slice(0, -1);
    setF((prev: string[]) => [...prev, newFuture]);
    setH(newHistory);
    setT(newHistory[newHistory.length - 1] ?? "");
  }

  function handleRedo(h: string[], f: string[], setH: any, setF: any, setT: any) {
    if (!f.length) return;
    const next = f[f.length - 1];
    setH([...h, next]);
    setF(f.slice(0, -1));
    setT(next);
  }

  async function runAi() {
    if (!text.trim()) {
      setError("CV text is empty. Paste your CV first.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuggestions(null);
    const res = await fetch("/api/cv/rewrite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setError(json?.error ?? "AI rewrite failed");
      setLoading(false);
      return;
    }
    setSuggestions(json.suggestions?.suggestions ?? []);
    setLoading(false);
  }

  async function save() {
    if (!text.trim()) {
      setError("CV text is empty. Paste your CV first.");
      return;
    }
    setSaving(true);
    setError(null);
    const filename = cvFilename ? `${cvFilename.replace(/\.[^/.]+$/, "")}-edited.pdf` : "cv-edited.pdf";
    const base64 = toPdfBase64(text);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const res = await fetch("/api/cv/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        cv_text: text,
        cv_filename: filename,
        cv_file_base64: base64,
        cv_file_mime: "application/pdf",
      }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setError(json?.error ?? "Save failed");
      setSaving(false);
      return;
    }
    setCvFilename(filename);
    setInfo("Saved");
    setSaving(false);
  }

  return (
    <div className="page" style={{ display: "grid", gap: 12 }}>
      <div className="section-title">
        <div>
          <h1 style={{ margin: 0 }}>CV Editor</h1>
          <div style={{ color: "#475569" }}>Paste your CV, let AI polish grammar/clarity/presentation.</div>
        </div>
        <a className="ghost-link" href="/cv">Back to CV</a>
      </div>

      {error && <div className="card" style={{ color: "#b91c1c" }}>{error}</div>}

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="primary" type="button" onClick={runAi} disabled={loading}>
            {loading ? "Polishing..." : "AI polish"}
          </button>
          <button className="primary" type="button" onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
          <button className="ghost-link" type="button" onClick={() => handleUndo(history, setHistory, setFuture, setText)} disabled={history.length <= 1}>
            Undo
          </button>
          <button className="ghost-link" type="button" onClick={() => handleRedo(history, future, setHistory, setFuture, setText)} disabled={future.length === 0}>
            Redo
          </button>
          <button
            className="ghost-link"
            type="button"
            onClick={() => navigator?.clipboard?.writeText(text)}
            disabled={!text}
          >
            Copy text
          </button>
        </div>
        {info && <small style={{ color: "#0f172a" }}>{info}</small>}
        <textarea
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          rows={18}
          placeholder="Paste and edit your CV text here..."
        />
      </div>

      {suggestions && suggestions.length > 0 && (
        <div className="card" style={{ display: "grid", gap: 8 }}>
          <h3 style={{ margin: 0 }}>AI suggestions</h3>
          {suggestions.map((s, idx) => (
            <div key={idx} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10 }}>
              <div><b>Before:</b> {s.before}</div>
              <div><b>After:</b> {s.after}</div>
              <div style={{ color: "#475569" }}>{s.rationale}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
