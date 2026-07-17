"use client";

/**
 * /dashboard/nearby — Nearby Medical Services
 *
 * State machine:
 *   idle → requesting (geolocation in flight)
 *        → success    (location acquired, services loading / loaded)
 *        → denied | timeout | unavailable | unsupported
 *
 * Live flow:
 *   Browser Geolocation → FastAPI /api/v1/nearby/services → Geoapify → Leaflet map + cards
 *
 * Rules:
 *   - "Nothing found nearby" shown ONLY when location=success AND API succeeded AND list is empty.
 *   - API error shows "temporarily unavailable" — never a false empty state.
 *   - Previous request is aborted when location/category/radius changes.
 *   - Geoapify key never in browser — all requests go through FastAPI.
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
import { NearbyService as NearbyServiceLib, NearbyApiError } from "@/lib/nearby/NearbyService";
import { DistanceCalculator } from "@/lib/nearby/DistanceCalculator";
import { useToast } from "@/components/ui/Toast";

import type {
  NearbyService,
  UserLocation,
  LocationStatus,
  NearbyFilters,
  ServiceCategory,
  DistanceFilter,
} from "@/types/nearby";

// ── Lazy-load Leaflet map (no SSR) ────────────────────────────────────────
const NearbyMap = dynamic(() => import("@/components/nearby/NearbyMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-100 rounded-2xl animate-pulse flex items-center justify-center min-h-[320px]">
      <div className="flex flex-col items-center gap-2 text-slate-400">
        <MapPin className="w-8 h-8" />
        <span className="text-xs font-medium">Loading map…</span>
      </div>
    </div>
  ),
});

// ── Distance filter → radius sent to backend ──────────────────────────────
const DIST_TO_RADIUS_KM: Record<DistanceFilter, number> = {
  all:   20,
  "2km":  2,
  "5km":  5,
  "10km": 10,
};

// ── Default filters ───────────────────────────────────────────────────────
const DEFAULT_FILTERS: NearbyFilters = {
  category: "all",
  distance: "all",
  search: "",
};

// ── Module-level session cache (clears on hard refresh) ───────────────────
let _cachedLocation: UserLocation | null = null;
let _cachedServices: NearbyService[] | null = null;
let _cachedFilters: Pick<NearbyFilters, "category" | "distance"> | null = null;

function NearbyPageInner() {
  const { toast } = useToast();
  const searchParams = useSearchParams();

  // ── State ────────────────────────────────────────────────────────────────
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [userLocation, setUserLocation] = useState<UserLocation | null>(_cachedLocation);
  const [allServices, setAllServices] = useState<NearbyService[]>(_cachedServices ?? []);
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

  const [isLoading, setIsLoading]   = useState(false);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<NearbyService | null>(null);
  const [dialogService, setDialogService]     = useState<NearbyService | null>(null);
  const [dialogOpen, setDialogOpen]           = useState(false);

  // Debounce search
  const deferredSearch = useDeferredValue(filters.search);
  const appliedFilters: NearbyFilters = { ...filters, search: deferredSearch };

  // Client-side filter (category chip and distance chip do a live re-fetch;
  // search just filters the in-memory list)
  const filteredServices = NearbyServiceLib.filter(allServices, appliedFilters);

  // Abort controller for in-flight service requests
  const abortRef = useRef<AbortController | null>(null);

  // Debounce timer for search input
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    debounceRef.current && clearTimeout(debounceRef.current);
  }, []);

  // ── Fetch services ───────────────────────────────────────────────────────
  const fetchServices = useCallback(
    async (
      location: UserLocation,
      category: ServiceCategory | "all",
      distance: DistanceFilter
    ) => {
      // Cancel any previous request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setServiceError(null);

      const radiusKm = DIST_TO_RADIUS_KM[distance];

      try {
        const raw = await NearbyServiceLib.fetchAll(
          location.latitude,
          location.longitude,
          radiusKm,
          category,
          controller.signal
        );

        // Recompute distance from actual user coords
        const withDist = raw.map((s) => ({
          ...s,
          distance: DistanceCalculator.compute(
            location.latitude,
            location.longitude,
            s.latitude,
            s.longitude
          ),
        }));

        setAllServices(withDist);
        _cachedServices = withDist;
        _cachedFilters  = { category, distance };
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return; // cancelled — ignore

        let msg = "Nearby services are temporarily unavailable.";
        if (err instanceof NearbyApiError) {
          if (err.isNotConfigured) {
            msg = "Nearby services are not configured on this server.";
          } else if (err.isRateLimited) {
            msg = "Too many requests. Please wait a moment and try again.";
          } else if (err.isTimeout) {
            msg = "The request timed out. Please try again.";
          }
        } else {
          // Use category-specific error message for generic failures
          if (category === "pharmacy") {
            msg = "Nearby pharmacies could not be loaded.";
          } else if (category === "ambulance") {
            msg = "Nearby ambulance services could not be loaded.";
          } else if (category === "hospital") {
            msg = "Nearby hospitals could not be loaded.";
          }
        }
        setServiceError(msg);
        toast(msg, "error");
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  // ── Acquire location ─────────────────────────────────────────────────────
  const acquireLocation = useCallback(async () => {
    if (_cachedLocation) {
      setUserLocation(_cachedLocation);
      setLocationStatus("success");
      if (!_cachedServices) {
        await fetchServices(_cachedLocation, filters.category, filters.distance);
      }
      return;
    }

    setLocationStatus("requesting");

    const result = await LocationService.getCurrentPosition();

    if (result.status === "success") {
      const loc = result.location;
      _cachedLocation = loc;
      setUserLocation(loc);
      setLocationStatus("success");
      await fetchServices(loc, filters.category, filters.distance);
    } else {
      setLocationStatus(result.status);
    }
  }, [fetchServices, filters.category, filters.distance]);

  // Auto-acquire on mount
  useEffect(() => {
    if (locationStatus === "idle") acquireLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch when category or distance filter changes (not search)
  useEffect(() => {
    if (!userLocation || locationStatus !== "success") return;
    // Skip if filters haven't actually changed from the cached fetch
    if (
      _cachedFilters &&
      _cachedFilters.category === filters.category &&
      _cachedFilters.distance === filters.distance
    ) return;

    fetchServices(userLocation, filters.category, filters.distance);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.category, filters.distance]);

  // ── Manual location ──────────────────────────────────────────────────────
  const handleManualLocation = useCallback(
    async (lat: number, lng: number) => {
      const loc: UserLocation = { latitude: lat, longitude: lng };
      _cachedLocation = loc;
      _cachedServices = null;
      _cachedFilters  = null;
      setUserLocation(loc);
      setLocationStatus("success");
      setAllServices([]);
      await fetchServices(loc, filters.category, filters.distance);
    },
    [fetchServices, filters.category, filters.distance]
  );

  // ── Refresh ──────────────────────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    _cachedServices = null;
    _cachedFilters  = null;
    if (!userLocation) {
      _cachedLocation = null;
      acquireLocation();
    } else {
      await fetchServices(userLocation, filters.category, filters.distance);
    }
  }, [userLocation, fetchServices, acquireLocation, filters.category, filters.distance]);

  // ── Search ───────────────────────────────────────────────────────────────
  const handleSearchChange = useCallback((value: string) => {
    // Update immediately for the controlled input
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
    document
      .getElementById("nearby-map-section")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // ── Empty/error state discriminator ──────────────────────────────────────
  function getEmptyReason() {
    if (serviceError) return "no-internet" as const;
    if (locationStatus !== "success") return "location-unavailable" as const;
    if (deferredSearch.trim()) return "search-no-match" as const;
    return "no-results" as const;
  }

  // ── Counts ───────────────────────────────────────────────────────────────
  const counts = {
    hospital:  allServices.filter((s) => s.category === "hospital").length,
    pharmacy:  allServices.filter((s) => s.category === "pharmacy").length,
    ambulance: allServices.filter((s) => s.category === "ambulance").length,
    total:     allServices.length,
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopNavbar />

      <main
        id="main-content"
        className="flex-1 overflow-y-auto bg-slate-50/50"
        aria-label="Nearby Medical Services"
      >
        {/* Header */}
        <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-slate-100 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-black text-slate-900 leading-tight">
                Nearby Medical Services
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {locationStatus === "success" && !isLoading && counts.total > 0
                  ? `${counts.total} services found — ${counts.hospital} hospital${counts.hospital !== 1 ? "s" : ""}, ${counts.pharmacy} pharmac${counts.pharmacy !== 1 ? "ies" : "y"}, ${counts.ambulance} emergency`
                  : locationStatus === "requesting"
                  ? "Detecting your location…"
                  : "Find hospitals, pharmacies and ambulance services near you"}
              </p>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isLoading || locationStatus === "requesting"}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold
                text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50
                disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                focus-visible:outline-2 focus-visible:outline-blue-500"
              aria-label="Refresh nearby services"
            >
              {isLoading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <RefreshCw className="w-3.5 h-3.5" />}
              {isLoading ? "Loading…" : "Refresh"}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-col lg:flex-row gap-0 h-full">

          {/* Map */}
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

          {/* Sidebar */}
          <aside
            aria-label="Service list and filters"
            className="w-full lg:w-[420px] xl:w-[460px] flex-shrink-0 flex flex-col overflow-hidden"
          >
            {/* Sticky controls */}
            <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm
              border-b border-slate-100 px-4 sm:px-6 py-4 space-y-3">
              {locationStatus !== "success" && (
                <LocationCard
                  status={locationStatus}
                  location={userLocation}
                  onRetry={acquireLocation}
                  onManualSubmit={handleManualLocation}
                />
              )}
              <SearchBar value={filters.search} onChange={handleSearchChange} />
              <FilterBar
                filters={filters}
                onCategoryChange={handleCategoryChange}
                onDistanceChange={handleDistanceChange}
              />
            </div>

            {/* Results list */}
            <div
              className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3 pb-24 lg:pb-6"
              role="region"
              aria-label="Nearby services list"
              aria-live="polite"
              aria-busy={isLoading ? "true" : "false"}
            >
              {isLoading && <NearbySkeleton />}

              {!isLoading && filteredServices.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-slate-500 mb-1">
                    {filteredServices.length} result{filteredServices.length !== 1 ? "s" : ""}
                    {appliedFilters.category !== "all" && ` · ${appliedFilters.category}`}
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

              {/* Empty / error states — only shown when not loading */}
              {!isLoading && filteredServices.length === 0 && (
                /* Do NOT show "nothing found" while location is still loading */
                locationStatus === "requesting" ? null : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <EmptyNearbyState
                      reason={getEmptyReason()}
                      category={appliedFilters.category}
                      onRetry={
                        serviceError
                          ? handleRefresh
                          : locationStatus !== "success"
                          ? acquireLocation
                          : undefined
                      }
                    />
                  </motion.div>
                )
              )}
            </div>
          </aside>
        </div>
      </main>

      <ServiceDetailsDialog
        service={dialogService}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}

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
