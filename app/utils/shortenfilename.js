export default function shortenFileName(name) {
  if (!name) return "";
  const ext = name.split(".").pop();
  const base = name.replace(/\.[^/.]+$/, "");
  if (base.length > 15) {
    return base.slice(0, 15) + "..." + "." + ext;
  }
  return name;
}
