"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { PrismAsyncLight } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

// Register common languages to reduce bundle size
import js from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import ts from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import css from "react-syntax-highlighter/dist/esm/languages/prism/css";
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import jsx from "react-syntax-highlighter/dist/esm/languages/prism/jsx";
import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx";

PrismAsyncLight.registerLanguage("javascript", js);
PrismAsyncLight.registerLanguage("js", js);
PrismAsyncLight.registerLanguage("typescript", ts);
PrismAsyncLight.registerLanguage("ts", ts);
PrismAsyncLight.registerLanguage("python", python);
PrismAsyncLight.registerLanguage("json", json);
PrismAsyncLight.registerLanguage("css", css);
PrismAsyncLight.registerLanguage("bash", bash);
PrismAsyncLight.registerLanguage("jsx", jsx);
PrismAsyncLight.registerLanguage("tsx", tsx);

interface CodeBlockProps {
  language: string;
  code: string;
}

export function CodeBlock({ language, code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-xl overflow-hidden my-2">
      <div className="flex items-center justify-between px-3 py-1.5 bg-pink-50/80 text-[0.6875rem] text-pink-400">
        <span>{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-pink-100/60 transition-colors text-pink-500"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" />
              已复制
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              复制
            </>
          )}
        </button>
      </div>
      <PrismAsyncLight
        language={language}
        style={oneLight}
        customStyle={{
          margin: 0,
          borderRadius: "0 0 0.75rem 0.75rem",
          fontSize: "0.8125rem",
          padding: "0.75rem",
          background: "rgba(255,255,255,0.6)",
        }}
      >
        {code}
      </PrismAsyncLight>
    </div>
  );
}
