export default function MatchCard({ title, subtitle, details }) {
  return (
    <div className="bg-white border border-emerald-100 rounded-lg shadow p-4 mb-3">
      {/* <h3 className="text-lg font-bold text-emerald-700">{title}</h3> */}
      <p className="text-emerald-500 text-sm">{subtitle}</p>
      <div className="text-gray-700 text-sm mt-2">{details}</div>
    </div>
  );
}
