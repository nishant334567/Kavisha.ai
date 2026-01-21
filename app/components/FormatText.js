import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

export default function FormatText({ text }) {
  return (
    <div className="prose max-w-none [&_p]:my-1.5 [&_ul]:my-1.5 [&_li]:my-0.5 [&_p]:leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{text}</ReactMarkdown>
    </div>
  );
}
