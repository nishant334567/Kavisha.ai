export default function AvatarCard({ image, name, title, subtitle }) {
  return (
    <div className="w-full max-w-xs bg-white rounded-2xl shadow-md overflow-hidden text-center">
      <div className="w-full h-72 bg-gray-100">
        {image ? (
          <img src={image} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            No image
          </div>
        )}
      </div>
      <div className="px-4 py-4 font-akshar">
        <h3 className="text-lg font-semibold text-[#1f2933]">{name}</h3>
        {title && <p className="text-sm text-[#1f2933] mt-1">{title}</p>}
        {subtitle && (
          <p className="text-sm text-gray-600 leading-relaxed mt-1">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
