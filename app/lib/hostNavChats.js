/**
 * Public /chats nav (Navbar, bottom bar, homepage pills) is hidden only on the
 * main marketing host. Shown on admin.kavisha.ai, brand subdomains, localhost, etc.
 */
export function showPublicChatsNavForHostname(hostname) {
  if (!hostname || typeof hostname !== "string") return true;
  const h = hostname.toLowerCase().replace(/^www\./, "");
  return h !== "kavisha.ai";
}
