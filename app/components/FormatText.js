import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

export default function FormatText({ text }) {
  return (
    <div className="prose prose-sm max-w-none text-foreground prose-p:text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-li:text-foreground prose-code:text-foreground prose-blockquote:text-foreground prose-a:text-blue-600 [&_p]:my-1.5 [&_ul]:my-1.5 [&_li]:my-0.5 [&_p]:leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{text}</ReactMarkdown>
    </div>
  );
}
