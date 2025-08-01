"use client";

export default function SessionFilters({ filters, onFilterChange }) {
  const handleFilterChange = (filterType, value) => {
    onFilterChange({
      ...filters,
      [filterType]: value,
    });
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 mb-4">
      <h3 className="font-medium text-gray-800 mb-3">Filters</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Log Count Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Log Count
          </label>
          <select
            value={filters.logCount}
            onChange={(e) => handleFilterChange("logCount", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Role Type
          </label>
          <select
            value={filters.roleType}
            onChange={(e) => handleFilterChange("roleType", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Roles</option>
            <option value="job_seeker">Job Seeker</option>
            <option value="recruiter">Recruiter</option>
          </select>
        </div>

        {/* Completion Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={filters.completionStatus}
            onChange={(e) =>
              handleFilterChange("completionStatus", e.target.value)
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="w-full px-3 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>
    </div>
  );
}
