// Minimal markdown renderer shared by the AI panels: supports ## headings
// and bullet lines only — everything Claude is prompted to produce.
export function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let buffer: string[] = [];
  let key = 0;

  const flushBuffer = () => {
    if (buffer.length === 0) return;
    nodes.push(
      <p key={`p-${key++}`} className="text-sm text-gray-300 leading-7">
        {buffer.join(" ")}
      </p>
    );
    buffer = [];
  };

  let inList = false;
  let listItems: string[] = [];
  const flushList = () => {
    if (listItems.length === 0) return;
    nodes.push(
      <ul key={`ul-${key++}`} className="list-disc list-inside space-y-2 text-sm text-gray-300 leading-7 pl-2">
        {listItems.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    );
    listItems = [];
    inList = false;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushBuffer();
      flushList();
      continue;
    }
    if (line.startsWith("## ")) {
      flushBuffer();
      flushList();
      nodes.push(
        <h3 key={`h-${key++}`} className="text-xs font-black uppercase tracking-[0.25em] text-blue-400 mt-5 mb-2">
          {line.slice(3)}
        </h3>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      flushBuffer();
      inList = true;
      listItems.push(line.slice(2));
    } else {
      if (inList) flushList();
      buffer.push(line);
    }
  }
  flushBuffer();
  flushList();
  return nodes;
}
