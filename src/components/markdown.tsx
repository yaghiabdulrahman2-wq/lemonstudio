import { cn } from "@/lib/utils";

/** Very small markdown renderer: headings, lists, bold, inline code, paragraphs. */
export function Markdown({ text, className }: { text: string; className?: string }) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];

  const flushList = (key: string) => {
    if (list.length === 0) return;
    blocks.push(
      <ul key={key} className="my-2 list-disc space-y-1 pl-5">
        {list.map((item, index) => (
          <li key={index}>{inline(item)}</li>
        ))}
      </ul>,
    );
    list = [];
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (/^[-*]\s+/.test(trimmed)) {
      list.push(trimmed.replace(/^[-*]\s+/, ""));
      return;
    }
    flushList(`l${index}`);

    if (!trimmed) return;

    const heading = /^(#{1,4})\s+(.*)$/.exec(trimmed);
    if (heading) {
      const level = heading[1]!.length;
      blocks.push(
        <p
          key={index}
          className={cn(
            "mt-3 mb-1 font-semibold text-foreground",
            level <= 2 ? "text-base" : "text-sm",
          )}
        >
          {inline(heading[2] ?? "")}
        </p>,
      );
      return;
    }

    blocks.push(
      <p key={index} className="my-1.5 leading-relaxed">
        {inline(trimmed)}
      </p>,
    );
  });

  flushList("last");

  return <div className={cn("text-sm text-foreground/90", className)}>{blocks}</div>;
}

function inline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|@[A-Za-z0-9_./]+)/g;
  let cursor = 0;
  let key = 0;

  let match = pattern.exec(text);
  while (match !== null) {
    if (match.index > cursor) parts.push(text.slice(cursor, match.index));
    const value = match[0];
    if (value.startsWith("**")) {
      parts.push(
        <strong key={key++} className="font-semibold text-foreground">
          {value.slice(2, -2)}
        </strong>,
      );
    } else if (value.startsWith("`")) {
      parts.push(
        <code
          key={key++}
          className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[12px] text-primary"
        >
          {value.slice(1, -1)}
        </code>,
      );
    } else {
      parts.push(
        <span key={key++} className="font-mono text-secondary">
          {value}
        </span>,
      );
    }
    cursor = match.index + value.length;
    match = pattern.exec(text);
  }

  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}
