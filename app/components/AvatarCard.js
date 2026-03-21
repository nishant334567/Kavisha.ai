export default function AvatarCard({ image, name, title, subtitle }) {
  // Truncate subtitle to max 30 words with ellipsis
  const truncateText = (text, maxWords = 30) => {
    if (!text) return "";
    const words = text.split(" ");
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(" ") + "...";
  };

  return (
    <div className="flex h-[400px] w-full max-w-xs flex-col overflow-hidden rounded-2xl border border-border bg-card text-center shadow-md">
      <div className="w-full h-[280px] flex-shrink-0">
        {image ? (
          <img src={image} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted">
            No image
          </div>
        )}
      </div>
      <div className="px-4 py-4 flex-1 flex flex-col min-h-0">
        <h3 className="mb-1 text-lg font-semibold text-foreground">{name}</h3>
        {title && <p className="mb-2 text-sm text-muted">{title}</p>}
        {/* {subtitle && (
          <p className="text-sm text-gray-600 leading-relaxed line-clamp-4 overflow-hidden">
            {truncateText(subtitle, 30)}
          </p>
        )} */}
      </div>
    </div>
  );
}
