import { ExternalLink, Sparkles } from "lucide-react";

export default function AvatarCard({
  image,
  name,
  title,
  subtitle,
  avatarLink = "",
  widgetLink = "",
}) {
  // Truncate subtitle to max 30 words with ellipsis
  const truncateText = (text, maxWords = 30) => {
    if (!text) return "";
    const words = text.split(" ");
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(" ") + "...";
  };

  return (
    <div className="flex h-[460px] w-full max-w-xs flex-col overflow-hidden rounded-2xl border border-border bg-card text-center shadow-md">
      <div className="w-full h-[250px] flex-shrink-0">
        {image ? (
          <img src={image} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted">
            No image
          </div>
        )}
      </div>
      <div className="px-4 py-5 flex-1 flex flex-col min-h-0">
        <h3 className="mb-1 text-lg font-semibold text-foreground">{name}</h3>
        {title && <p className="mb-2 text-sm text-muted">{title}</p>}
        {/* {subtitle && (
          <p className="text-sm text-gray-600 leading-relaxed line-clamp-4 overflow-hidden">
            {truncateText(subtitle, 30)}
          </p>
        )} */}
        <div className="mt-auto flex flex-col gap-2 pt-3">
          <a
            href={avatarLink || "#"}
            target={avatarLink ? "_blank" : undefined}
            rel={avatarLink ? "noopener noreferrer" : undefined}
            aria-disabled={!avatarLink}
            className={`group relative inline-flex w-[220px] items-center justify-center self-center overflow-hidden rounded-full bg-white px-4 py-2 text-sm font-medium text-[#17484B] ring-1 ring-black/15 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 before:absolute before:inset-0 before:-translate-x-full before:bg-[linear-gradient(90deg,transparent,rgba(206,253,253,0.55),transparent)] before:opacity-0 before:transition before:duration-700 before:ease-out hover:before:translate-x-full hover:before:opacity-100 ${
              avatarLink
                ? ""
                : "cursor-not-allowed opacity-50"
            }`}
          >
            <span className="relative z-10 inline-flex items-center justify-center gap-2">
              <Sparkles
                className={`h-4 w-4 transition-transform duration-200 ${
                  avatarLink ? "group-hover:rotate-12 group-hover:scale-110" : ""
                }`}
              />
              Visit Avataar
            </span>
          </a>
          <a
            href={widgetLink || "#"}
            target={widgetLink ? "_blank" : undefined}
            rel={widgetLink ? "noopener noreferrer" : undefined}
            aria-disabled={!widgetLink}
            className={`group relative inline-flex w-[220px] items-center justify-center self-center overflow-hidden rounded-full bg-white px-4 py-2 text-sm font-medium text-[#17484B] ring-1 ring-black/15 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 before:absolute before:inset-0 before:-translate-x-full before:bg-[linear-gradient(90deg,transparent,rgba(206,253,253,0.55),transparent)] before:opacity-0 before:transition before:duration-700 before:ease-out hover:before:translate-x-full hover:before:opacity-100 ${
              widgetLink
                ? ""
                : "cursor-not-allowed opacity-50"
            }`}
          >
            <span className="relative z-10 inline-flex items-center justify-center gap-2">
              <ExternalLink
                className={`h-4 w-4 transition-transform duration-200 ${
                  widgetLink
                    ? "group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    : ""
                }`}
              />
              View widget on website
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}
