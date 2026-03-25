"use client";

export default function SessionFilters({ filters, onFilterChange }) {
  const handleFilterChange = (filterType, value) => {
    onFilterChange({
      ...filters,
      [filterType]: value,
    });
  };

  return (
    <div className="mb-4 rounded-lg border border-border bg-card p-4 text-foreground">
      <h3 className="mb-3 font-medium text-foreground">Filters</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {/* Log Count Filter */}
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Log Count
          </label>
          <select
            value={filters.logCount}
            onChange={(e) => handleFilterChange("logCount", e.target.value)}
            className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
          >
            <option value="all">All</option>
            <option value="0">No logs</option>
            <option value="1-5">1-5 logs</option>
            <option value="6-10">6-10 logs</option>
            <option value="11-20">11-20 logs</option>
            <option value="20+">20+ logs</option>
          </select>
        </div>

        {/* Role Type Filter */}
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Role Type
          </label>
          <select
            value={filters.roleType}
            onChange={(e) => handleFilterChange("roleType", e.target.value)}
            className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
          >
            <option value="all">All Roles</option>
            <option value="job_seeker">Job Seeker</option>
            <option value="recruiter">Recruiter</option>
            <option value="male">Male (Dating)</option>
            <option value="female">Female (Dating)</option>
          </select>
        </div>

        {/* Completion Status Filter */}
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Status
          </label>
          <select
            value={filters.completionStatus}
            onChange={(e) =>
              handleFilterChange("completionStatus", e.target.value)
            }
            className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="in_progress">In Progress</option>
          </select>
        </div>

        {/* Clear Filters */}
        <div className="flex items-end">
          <button
            onClick={() =>
              onFilterChange({
                logCount: "all",
                roleType: "all",
                completionStatus: "all",
              })
            }
            className="w-full rounded-md bg-muted-bg px-3 py-2 text-sm text-foreground transition-colors hover:bg-background"
          >
            Clear Filters
          </button>
        </div>
      </div>
    </div>
  );
}
