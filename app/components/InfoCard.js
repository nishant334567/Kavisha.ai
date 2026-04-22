/** Shared surfaces so beige/teal responsive cards stay in sync */
const BEIGE_GRADIENT = "bg-gradient-to-b from-[#FFF7E0] to-[#F8F3E5]";
const BEIGE_GRADIENT_MD =
  "md:bg-gradient-to-b md:from-[#FFF7E0] md:to-[#F8F3E5]";
const TEAL_GRADIENT = "bg-gradient-to-b from-[#17484B] to-[#156568]";
const TEAL_GRADIENT_MD =
  "md:bg-gradient-to-b md:from-[#17484B] md:to-[#156568]";

const colorClasses = {
  teal: `${TEAL_GRADIENT} text-white dark:text-white`,
  beige: `${BEIGE_GRADIENT} text-[#3D5A5E] dark:text-[#3D5A5E]`,
  yellow: "bg-[#F2E7B4] text-[#2F2F2F] dark:text-[#2F2F2F]",
  green: "bg-[#DDEBC8] text-[#2F2F2F] dark:text-[#2F2F2F]",
};
// Responsive: mobile first, then md: desktop (so Tailwind can purge)
const responsivePairs = {
  "beige-teal": `${BEIGE_GRADIENT} text-[#3D5A5E] dark:text-[#3D5A5E] ${TEAL_GRADIENT_MD} md:text-white md:dark:text-white`,
  "teal-beige": `${TEAL_GRADIENT} text-white dark:text-white ${BEIGE_GRADIENT_MD} md:text-[#3D5A5E] md:dark:text-[#3D5A5E]`,
};

export default function InfoCard({ title, body, variant = "teal", variantMobile }) {
  const mobileV = variantMobile ?? variant;
  const pairKey =
    variantMobile != null && variantMobile !== variant
      ? `${mobileV}-${variant}`
      : null;
  const cls =
    pairKey && responsivePairs[pairKey]
      ? responsivePairs[pairKey]
      : colorClasses[mobileV] || colorClasses.teal;
  return (
    <div
      className={`${cls} rounded-2xl md:rounded-3xl px-5 py-5 md:px-8 md:py-8 font-baloo`}
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
