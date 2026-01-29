export default function AvatarCard({ image, name, title, subtitle }) {
  // Truncate subtitle to max 30 words with ellipsis
  const truncateText = (text, maxWords = 30) => {
    if (!text) return "";
    const words = text.split(" ");
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(" ") + "...";
  };

  return (
    <div className="w-full max-w-xs bg-white rounded-2xl shadow-md overflow-hidden text-center h-[400px] flex flex-col">
      <div className="w-full h-[280px] flex-shrink-0">
        {image ? (
          <img src={image} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            No image
          </div>
        )}
      </div>
      <div className="px-4 py-4 font-akshar flex-1 flex flex-col min-h-0">
        <h3 className="text-lg font-semibold text-[#1f2933] mb-1">{name}</h3>
        {title && <p className="text-sm text-[#1f2933] mb-2">{title}</p>}
        {/* {subtitle && (
          <p className="text-sm text-gray-600 leading-relaxed line-clamp-4 overflow-hidden">
            {truncateText(subtitle, 30)}
          </p>
        )} */}
      </div>
    </div>
  );
}
