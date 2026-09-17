import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
  text: string;
  className?: string;
  title?: string;
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  text,
  className = '',
  title = 'Copy to clipboard'
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      title={copied ? 'Copied!' : title}
      className={`p-1 rounded hover:bg-dark-750 text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center justify-center ${className}`}
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-intel-emerald" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  );
};
