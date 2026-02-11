const colorClasses = {
  teal: "bg-[#4A6670] text-white",
  beige: "bg-[#F9F1D8] text-[#3D5A5E]",
  yellow: "bg-[#F2E7B4] text-[#2F2F2F]",
  green: "bg-[#DDEBC8] text-[#2F2F2F]",
};
// Responsive: mobile first, then md: desktop (so Tailwind can purge)
const responsivePairs = {
  "beige-teal": "bg-[#F9F1D8] text-[#3D5A5E] md:bg-[#4A6670] md:text-white",
  "teal-beige": "bg-[#4A6670] text-white md:bg-[#F9F1D8] md:text-[#3D5A5E]",
};

export default function InfoCard({ title, body, variant = "teal", variantMobile }) {
  const mobileV = variantMobile ?? variant;
  const pairKey = variantMobile != null && variantMobile !== variant ? `${mobileV}-${variant}` : null;
  const cls = pairKey && responsivePairs[pairKey] ? responsivePairs[pairKey] : (colorClasses[mobileV] || colorClasses.teal);
  return (
    <div
      className={`${cls} rounded-2xl md:rounded-3xl px-5 py-5 md:px-8 md:py-8 font-noto-serif`}
    >
      <h3 className="text-xl md:text-3xl font-light leading-tight mb-2 md:mb-4">
        {title}
      </h3>
      <p className="text-sm md:text-lg leading-relaxed font-extralight">
        {body}
      </p>
    </div>
  );
}
