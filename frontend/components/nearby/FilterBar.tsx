"use client";

import type { ServiceCategory, DistanceFilter, NearbyFilters } from "@/types/nearby";

interface FilterBarProps {
  filters: NearbyFilters;
  onCategoryChange: (cat: ServiceCategory | "all") => void;
  onDistanceChange: (dist: DistanceFilter) => void;
}

const CATEGORY_CHIPS: { label: string; value: ServiceCategory | "all" }[] = [
  { label: "All",        value: "all"       },
  { label: "Hospitals",  value: "hospital"  },
  { label: "Pharmacies", value: "pharmacy"  },
  { label: "Ambulance",  value: "ambulance" },
];

const DISTANCE_CHIPS: { label: string; value: DistanceFilter }[] = [
  { label: "Any distance", value: "all"  },
  { label: "Within 2 km", value: "2km"  },
  { label: "Within 5 km", value: "5km"  },
  { label: "Within 10 km", value: "10km" },
];

export default function FilterBar({
  filters,
  onCategoryChange,
  onDistanceChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-2" role="group" aria-label="Filter services">
      {/* Category chips */}
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Filter by category">
        {CATEGORY_CHIPS.map((chip) => {
          const active = filters.category === chip.value;
          return (
            <button
              key={chip.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onCategoryChange(chip.value)}
              className={[
                "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap",
                active
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200"
                  : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600",
              ].join(" ")}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Distance chips */}
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Filter by distance">
        {DISTANCE_CHIPS.map((chip) => {
          const active = filters.distance === chip.value;
          return (
            <button
              key={chip.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onDistanceChange(chip.value)}
              className={[
                "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap",
                active
                  ? "bg-slate-800 text-white border-slate-800"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-800",
              ].join(" ")}
            >
              {chip.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
