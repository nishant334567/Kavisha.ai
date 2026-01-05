export default function InfoCard({ title, body, variant = "teal" }) {
  const colors = {
    teal: "bg-[#4A6670] text-white",
    yellow: "bg-[#F2E7B4] text-[#2F2F2F]",
    green: "bg-[#DDEBC8] text-[#2F2F2F]",
    beige: "bg-[#F5F0E1] text-[#3D5A5E]",
  };
  const cls = colors[variant] || colors.teal;
  return (
    <div
      className={`${cls} rounded-2xl md:rounded-3xl px-5 py-5 md:px-8 md:py-8 font-noto-serif`}
    >
      <h3 className="text-xl md:text-3xl font-light leading-tight mb-2 md:mb-4">
        {title}
      </h3>
      <p className="text-sm md:text-lg leading-relaxed font-light">{body}</p>
    </div>
  );
}
