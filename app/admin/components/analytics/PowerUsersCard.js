export default function PowerUsersCard({ users = [] }) {
    return (
        <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
            <div className="border-b border-border/60 px-4 py-3 sm:px-6 sm:py-4">
                <h3 className="text-base font-semibold text-[#18A6B8]">
                    Your top 5 power users
                </h3>
                <p className="mt-1 text-[11px] text-muted-foreground">
                    By number of user messages in this date range
                </p>
            </div>
            <ul className="divide-y divide-border/60">
                {users.length === 0 ? (
                    <li className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-6">
                        No messages in this range
                    </li>
                ) : (
                    users.map((u) => (
                        <li
                            key={u.userId}
                            className="flex items-center gap-3 px-4 py-3 sm:px-6"
                        >
                            {u.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={u.image}
                                    alt=""
                                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                                />
                            ) : (
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                                    {(u.name || u.email || "?")
                                        .slice(0, 1)
                                        .toUpperCase()}
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <div className="truncate font-medium text-foreground">
                                    {u.name || "Unknown"}
                                </div>
                                <div className="truncate text-xs text-muted-foreground">
                                    {u.email || "—"}
                                </div>
                            </div>
                            <div className="shrink-0 text-sm font-semibold tabular-nums text-[#18A6B8]">
                                {u.messageCount}
                            </div>
                        </li>
                    ))
                )}
            </ul>
        </div>
    );
}
