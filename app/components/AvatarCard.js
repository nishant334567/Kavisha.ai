import { ExternalLink, Sparkles } from "lucide-react";

const LEADING_ARTICLES = new Set(["the", "a", "an"]);

/** First letter of the first non-article word (e.g. "The Professional" → P, "Stuph Studio" → S). */
function getAvatarNameInitial(name) {
  const raw = String(name ?? "").trim();
  if (!raw) return "?";
  const words = raw.split(/\s+/).filter(Boolean);
  for (const word of words) {
    const lettersOnly = word.replace(/[^\p{L}\p{N}]/giu, "");
    if (!lettersOnly) continue;
    if (LEADING_ARTICLES.has(lettersOnly.toLowerCase()) && words.length > 1) {
      continue;
    }
    const letter = word.match(/\p{L}/u)?.[0] ?? word.match(/\p{N}/u)?.[0];
    if (letter) return letter.toUpperCase();
  }
  return "?";
}

/** Circular control on the right; label expands left on hover with shared pill background. */
function ImagePillLink({ href, label, icon: Icon }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group/btn inline-flex h-11 max-w-[min(100%,18rem)] items-stretch overflow-hidden rounded-full border border-white/25 bg-black/65 text-white shadow-lg outline-none ring-white/20 backdrop-blur-sm transition-[border-color,background-color,box-shadow] duration-500 hover:border-white/40 hover:bg-black/80 hover:shadow-xl focus-visible:ring-2"
      aria-label={label}
    >
      <span className="flex min-h-11 min-w-0 max-w-0 shrink-0 items-center justify-end overflow-hidden transition-[max-width] duration-700 ease-in-out group-hover/btn:max-w-[min(15rem,calc(100vw-5rem))]">
        <span className="block whitespace-nowrap pl-3 pr-0.5 text-left text-[13px] font-medium leading-none tracking-tight opacity-0 transition-[transform,opacity] duration-700 ease-in-out translate-x-3 group-hover/btn:translate-x-0 group-hover/btn:opacity-100">
          {label}
        </span>
      </span>
      <span className="relative flex w-11 shrink-0 items-center justify-center rounded-full border-l border-white/15 bg-black/35">
        <Icon className="h-5 w-5" strokeWidth={2.25} />
      </span>
    </a>
  );
}

export default function AvatarCard({
  image,
  name,
  title,
  subtitle: _subtitle,
  avatarLink = "",
  widgetLink = "",
}) {
  const hasAvatarLink = Boolean(String(avatarLink || "").trim());
  const hasWidgetLink = Boolean(String(widgetLink || "").trim());
  const initial = getAvatarNameInitial(name);
  const showImage = Boolean(String(image || "").trim());

  const cardClass =
    "group/card flex w-full max-w-xs shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-card text-center shadow-md transition-shadow duration-300 ease-out hover:shadow-xl hover:shadow-black/[0.09] focus-visible:outline-none cursor-default " +
    (!hasAvatarLink && !hasWidgetLink
      ? "opacity-75 pointer-events-none"
      : "");

  return (
    <div className={cardClass}>
      <div
        className="relative h-[250px] w-full flex-shrink-0 overflow-hidden [container-type:size] has-[a:hover]:[&_.avatar-card-media]:blur-[3px]"
      >
        {showImage ? (
          <img
            src={image}
            alt=""
            className="avatar-card-media h-full w-full object-cover transition-[filter,transform] duration-300 ease-out group-hover/card:scale-[1.02] group-hover/card:brightness-[0.72]"
            aria-hidden
          />
        ) : (
          <div
            className="avatar-card-media flex h-full w-full select-none items-center justify-center overflow-hidden bg-neutral-200 text-[min(70cqh,70cqw)] font-semibold leading-none tracking-tighter text-muted-foreground/85 transition-[filter,transform] duration-300 ease-out group-hover/card:scale-[1.02] group-hover/card:brightness-[0.72] dark:bg-neutral-600"
            aria-hidden
          >
            {initial}
          </div>
        )}

        <div
          className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-300 group-hover/card:bg-black/25"
          aria-hidden
        />

        {(hasAvatarLink || hasWidgetLink) && (
          <div className="pointer-events-auto absolute bottom-3 right-3 z-10 flex flex-col items-end gap-2">
            {hasAvatarLink ? (
              <ImagePillLink
                href={avatarLink}
                label="Visit Avataar"
                icon={Sparkles}
              />
            ) : null}
            {hasWidgetLink ? (
              <ImagePillLink
                href={widgetLink}
                label="View widget on website"
                icon={ExternalLink}
              />
            ) : null}
          </div>
        )}
      </div>

      <div className="flex flex-col justify-start gap-1 overflow-hidden px-4 pt-4 pb-5 text-center">
        <h3 className="line-clamp-2 shrink-0 overflow-hidden break-words text-lg font-semibold leading-tight text-foreground">
          {name}
        </h3>
        <div className="h-[2.55rem] w-full min-h-0 overflow-hidden">
          <p className="line-clamp-2 break-words text-sm leading-snug text-muted-foreground">
            {title || "\u00a0"}
          </p>
        </div>
      </div>
    </div>
  );
}
