import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function FormatText({ text }) {
  return (
    <div className="prose max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}
