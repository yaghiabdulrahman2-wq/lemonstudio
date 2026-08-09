import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { tokenizeLuau } from "@/lib/luau-highlight";
import { cn } from "@/lib/utils";

const TOKEN_CLASS: Record<string, string> = {
  keyword: "text-[var(--code-keyword)]",
  string: "text-[var(--code-string)]",
  number: "text-[var(--code-number)]",
  comment: "text-[var(--code-comment)] italic",
  plain: "",
};

type CodeBlockProps = {
  code: string;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
  highlight?: boolean;
};

export function CodeBlock({
  code,
  title,
  subtitle,
  actions,
  className,
  highlight = true,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const tokens = highlight ? tokenizeLuau(code) : [{ text: code, type: "plain" as const }];

  return (
    <div className={cn("overflow-hidden rounded-xl border bg-[var(--code)]", className)}>
      <div className="flex flex-wrap items-center gap-2 border-b bg-surface px-3 py-2">
        <div className="min-w-0 flex-1">
          {title ? (
            <p className="truncate font-mono text-xs font-medium text-foreground">{title}</p>
          ) : null}
          {subtitle ? (
            <p className="truncate font-mono text-[11px] text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          {actions}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={copy}
            aria-label="Copy code"
            className="h-7 gap-1.5 px-2 text-xs"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>
      <pre className="scroll-slim max-h-[26rem] overflow-auto p-4 text-[12.5px] leading-relaxed">
        <code className="font-mono">
          {tokens.map((token, index) => (
            <span key={index} className={TOKEN_CLASS[token.type]}>
              {token.text}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}
