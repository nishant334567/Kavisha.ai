export function formatToIST(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  // IST is UTC+5:30
  const istDate = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  return istDate.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}
