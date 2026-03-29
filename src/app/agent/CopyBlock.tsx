'use client';
import { useState } from 'react';

export default function CopyBlock({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      {label && <p className="text-cafe-muted text-xs mb-1.5">{label}</p>}
      <div className="bg-cafe-bg border border-cafe-border rounded-xl p-4 pr-16 text-sm overflow-x-auto">
        <pre className="whitespace-pre-wrap text-cafe-text">{text}</pre>
      </div>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cafe-accent text-white text-xs font-medium hover:opacity-90 transition-opacity"
        style={label ? { top: '1.75rem' } : {}}
      >
        {copied ? '✓ Copied' : '⧉ Copy'}
      </button>
    </div>
  );
}
