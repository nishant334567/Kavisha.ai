import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

const inkDefault =
  "text-foreground prose-p:text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-li:text-foreground prose-code:text-foreground prose-blockquote:text-foreground";
const inkBlack =
  "text-[#000000] prose-p:text-[#000000] prose-headings:text-[#000000] prose-strong:text-[#000000] prose-li:text-[#000000] prose-code:text-[#000000] prose-blockquote:text-[#000000]";

export default function FormatText({ text, blackBody = false }) {
  const ink = blackBody ? inkBlack : inkDefault;
  return (
    <div
      className={`prose prose-sm max-w-none prose-a:text-blue-600 [&_p]:my-1.5 [&_ul]:my-1.5 [&_li]:my-0.5 [&_p]:leading-relaxed ${ink}`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
