"use client";

/**
 * /dashboard/nearby — Nearby Hospitals, Pharmacies & Ambulance Services
 *
 * Layout:
 *   Desktop: [Map (left, ~55%)] [Sidebar: search + filters + cards (right, ~45%)]
 *   Mobile:  Search → Filters → Map → Cards (stacked)
 */
import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useDeferredValue,
  Suspense,
} from "react";
import dynamic from "next/dynamic";
import { RefreshCw, Loader2, MapPin } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

import TopNavbar from "@/components/dashboard/TopNavbar";
import SearchBar from "@/components/nearby/SearchBar";
import FilterBar from "@/components/nearby/FilterBar";
import ServiceCard from "@/components/nearby/ServiceCard";
import LocationCard from "@/components/nearby/LocationCard";
import NearbySkeleton from "@/components/nearby/NearbySkeleton";
import EmptyNearbyState from "@/components/nearby/EmptyNearbyState";
import ServiceDetailsDialog from "@/components/nearby/ServiceDetailsDialog";

import { LocationService } from "@/lib/nearby/LocationService";
import { NearbyService as NearbyServiceLib } from "@/lib/nearby/NearbyService";
import { DistanceCalculator } from "@/lib/nearby/DistanceCalculator";

import type {
  NearbyService,
  UserLocation,
  LocationStatus,
  NearbyFilters,
  ServiceCategory,
  DistanceFilter,
} from "@/types/nearby";
import { useToast } from "@/components/ui/Toast";

// ── Lazy-load map (no SSR) ─────────────────────────────────────────────────
const NearbyMap = dynamic(
  () => import("@/components/nearby/NearbyMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-slate-100 rounded-2xl animate-pulse flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-slate-400">
          <MapPin className="w-8 h-8" />
          <span className="text-xs font-medium">Loading map…</span>
        </div>
      </div>
    ),
  }
);

// ── Session cache (clears on page refresh) ────────────────────────────────
let sessionServices: NearbyService[] | null = null;
let sessionLocation: UserLocation | null = null;

// ── Default filters ────────────────────────────────────────────────────────
const DEFAULT_FILTERS: NearbyFilters = {
  category: "all",
  distance: "all",
  search: "",
};

function NearbyPageInner() {
  const { toast } = useToast();
  const searchParams = useSearchParams();

  // ── State ────────────────────────────────────────────────────────────────
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [userLocation, setUserLocation] = useState<UserLocation | null>(
    sessionLocation
  );
  const [allServices, setAllServices] = useState<NearbyService[]>(
    sessionServices ?? []
  );
  const [filters, setFilters] = useState<NearbyFilters>(() => {
    const typeParam = searchParams.get("type") as ServiceCategory | null;
    return {
      ...DEFAULT_FILTERS,
      category:
        typeParam && ["hospital", "pharmacy", "ambulance"].includes(typeParam)
          ? typeParam
          : "all",
    };
  });
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [selectedService, setSelectedService] =
    useState<NearbyService | null>(null);
  const [dialogService, setDialogService] = useState<NearbyService | null>(
    null
  );
  const [dialogOpen, setDialogOpen] = useState(false);

  // Debounce the search query
  const deferredSearch = useDeferredValue(filters.search);

  // Applied filters use deferred search to avoid re-filtering on every keystroke
  const appliedFilters: NearbyFilters = { ...filters, search: deferredSearch };
  const filteredServices = NearbyServiceLib.filter(allServices, appliedFilters);

  // Debounce timer ref — cleared on unmount to prevent state updates after unmount
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ── Fetch nearby services ─────────────────────────────────────────────────
  const fetchServices = useCallback(
    async (location: UserLocation) => {
      setIsLoading(true);
      setHasError(false);

      try {
        const services = await NearbyServiceLib.fetchAll(
          location.latitude,
          location.longitude,
          10 // 10 km radius
        );

        // Recalculate distance (normalised in API, but ensure accuracy)
        const withDistance = services.map((s) => ({
          ...s,
          distance: DistanceCalculator.compute(
            location.latitude,
            location.longitude,
            s.latitude,
            s.longitude
          ),
        }));

        setAllServices(withDistance);
        sessionServices = withDistance;
      } catch {
        setHasError(true);
        toast("Failed to load nearby services. Please try again.", "error");
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  // ── Acquire location ───────────────────────────────────────────────────────
  const acquireLocation = useCallback(async () => {
    // Use cached location if available
    if (sessionLocation) {
      setUserLocation(sessionLocation);
      setLocationStatus("success");
      if (!sessionServices) await fetchServices(sessionLocation);
      return;
    }

    setLocationStatus("requesting");

    const result = await LocationService.getCurrentPosition();

    if (result.status === "success") {
      const loc = result.location;
      setUserLocation(loc);
      setLocationStatus("success");
      sessionLocation = loc;
      await fetchServices(loc);
    } else {
      setLocationStatus(result.status);
    }
  }, [fetchServices]);

  // Auto-acquire on mount
  useEffect(() => {
    if (locationStatus === "idle") {
      acquireLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Manual location entry ─────────────────────────────────────────────────
  const handleManualLocation = useCallback(
    async (lat: number, lng: number) => {
      const loc: UserLocation = { latitude: lat, longitude: lng };
      setUserLocation(loc);
      setLocationStatus("success");
      sessionLocation = loc;
      sessionServices = null;
      setAllServices([]);
      await fetchServices(loc);
    },
    [fetchServices]
  );

  // ── Refresh ───────────────────────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    if (!userLocation) {
      acquireLocation();
      return;
    }
    sessionServices = null;
    setAllServices([]);
    await fetchServices(userLocation);
  }, [userLocation, fetchServices, acquireLocation]);

  // ── Search with debounce ──────────────────────────────────────────────────
  const handleSearchChange = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: value }));
    }, 300);
    // Update immediately for controlled input display
    setFilters((prev) => ({ ...prev, search: value }));
  }, []);

  // ── Filter handlers ───────────────────────────────────────────────────────
  const handleCategoryChange = useCallback(
    (cat: ServiceCategory | "all") => {
      setFilters((prev) => ({ ...prev, category: cat }));
    },
    []
  );

  const handleDistanceChange = useCallback((dist: DistanceFilter) => {
    setFilters((prev) => ({ ...prev, distance: dist }));
  }, []);

  // ── Map interactions ──────────────────────────────────────────────────────
  const handleServiceSelect = useCallback((service: NearbyService) => {
    setSelectedService(service);
    setDialogService(service);
    setDialogOpen(true);
  }, []);

  const handleLocateOnMap = useCallback((service: NearbyService) => {
    setSelectedService(service);
    // On mobile, scroll to map
    document
      .getElementById("nearby-map-section")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // ── Empty state logic ─────────────────────────────────────────────────────
  function getEmptyReason() {
    if (hasError) return "no-internet" as const;
    if (locationStatus !== "success") return "location-unavailable" as const;
    if (filters.search.trim()) return "search-no-match" as const;
    return "no-results" as const;
  }

  // ── Count by category ─────────────────────────────────────────────────────
  const counts = {
    hospital: allServices.filter((s) => s.category === "hospital").length,
    pharmacy: allServices.filter((s) => s.category === "pharmacy").length,
    ambulance: allServices.filter((s) => s.category === "ambulance").length,
    total: allServices.length,
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top nav */}
      <TopNavbar />

      {/* Main */}
      <main
        id="main-content"
        className="flex-1 overflow-y-auto bg-slate-50/50"
        aria-label="Nearby Medical Services"
      >
        {/* Page header */}
        <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-slate-100 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-black text-slate-900 leading-tight">
                Nearby Medical Services
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {locationStatus === "success" && !isLoading && counts.total > 0
                  ? `${counts.total} services found — ${counts.hospital} hospitals, ${counts.pharmacy} pharmacies, ${counts.ambulance} ambulance stations`
                  : "Find hospitals, pharmacies and ambulance services near you"}
              </p>
            </div>

            {/* Refresh */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isLoading || locationStatus === "requesting"}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-2 focus-visible:outline-blue-500"
              aria-label="Refresh nearby services"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              {isLoading ? "Loading…" : "Refresh"}
            </button>
          </div>
        </div>

        {/* Body — desktop: side-by-side, mobile: stacked */}
        <div className="flex flex-col lg:flex-row gap-0 h-full">

          {/* ── Map section ─────────────────────────────────────────────── */}
          <section
            id="nearby-map-section"
            aria-label="Map"
            className="lg:flex-1 lg:sticky lg:top-0 lg:h-[calc(100vh-128px)]"
          >
            <div className="h-72 sm:h-96 lg:h-full p-4 sm:p-6 lg:p-6">
              <NearbyMap
                userLocation={userLocation}
                services={filteredServices}
                selectedService={selectedService}
                onServiceSelect={handleServiceSelect}
                onLocateMe={acquireLocation}
                className="w-full h-full"
              />
            </div>
          </section>

          {/* ── Sidebar: controls + list ─────────────────────────────────── */}
          <aside
            aria-label="Service list and filters"
            className="w-full lg:w-[420px] xl:w-[460px] flex-shrink-0 flex flex-col overflow-hidden"
          >
            {/* Sticky controls */}
            <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm border-b border-slate-100 px-4 sm:px-6 py-4 space-y-3">
              {/* Location status (compact when success) */}
              {locationStatus !== "success" && (
                <LocationCard
                  status={locationStatus}
                  location={userLocation}
                  onRetry={acquireLocation}
                  onManualSubmit={handleManualLocation}
                />
              )}

              {/* Search */}
              <SearchBar
                value={filters.search}
                onChange={handleSearchChange}
              />

              {/* Filters */}
              <FilterBar
                filters={filters}
                onCategoryChange={handleCategoryChange}
                onDistanceChange={handleDistanceChange}
              />
            </div>

            {/* Scrollable list */}
            <div
              className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3 pb-24 lg:pb-6"
              role="region"
              aria-label="Nearby services list"
              aria-live="polite"
              aria-busy={isLoading ? "true" : "false"}
            >
              {/* Loading skeletons */}
              {isLoading && <NearbySkeleton />}

              {/* Results */}
              {!isLoading && filteredServices.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-slate-500 mb-1">
                    {filteredServices.length} result
                    {filteredServices.length !== 1 ? "s" : ""}
                    {appliedFilters.category !== "all" &&
                      ` · ${appliedFilters.category}`}
                  </p>
                  {filteredServices.map((service, index) => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      isSelected={selectedService?.id === service.id}
                      onSelect={handleServiceSelect}
                      onLocate={handleLocateOnMap}
                      index={index}
                    />
                  ))}
                </>
              )}

              {/* Empty / error states */}
              {!isLoading && filteredServices.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <EmptyNearbyState
                    reason={getEmptyReason()}
                    onRetry={
                      hasError
                        ? handleRefresh
                        : locationStatus !== "success"
                        ? acquireLocation
                        : undefined
                    }
                  />
                </motion.div>
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* Service details dialog */}
      <ServiceDetailsDialog
        service={dialogService}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}

// Wrap in Suspense — required because NearbyPageInner calls useSearchParams()
export default function NearbyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col h-full overflow-hidden">
          <div className="h-16 bg-white border-b border-slate-100 animate-pulse" />
          <div className="flex-1 bg-slate-50/50 animate-pulse" />
        </div>
      }
    >
      <NearbyPageInner />
    </Suspense>
  );
}
