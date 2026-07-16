"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Hospital, Pill, Ambulance, MapPin, Phone, Globe, Navigation, ExternalLink } from "lucide-react";
import type { NearbyService } from "@/types/nearby";
import { DistanceCalculator } from "@/lib/nearby/DistanceCalculator";

interface ServiceDetailsDialogProps {
  service: NearbyService | null;
  open: boolean;
  onClose: () => void;
}

const CATEGORY_CONFIG = {
  hospital: {
    Icon: Hospital,
    label: "Hospital",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  pharmacy: {
    Icon: Pill,
    label: "Pharmacy",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  ambulance: {
    Icon: Ambulance,
    label: "Ambulance Station",
    color: "text-red-600",
    bg: "bg-red-50",
  },
} as const;

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-50 last:border-0">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        <div className="text-sm font-medium text-slate-800 mt-0.5 break-words">{value}</div>
      </div>
    </div>
  );
}

export default function ServiceDetailsDialog({
  service,
  open,
  onClose,
}: ServiceDetailsDialogProps) {
  if (!service) return null;

  const cfg = CATEGORY_CONFIG[service.category];
  const Icon = cfg.Icon;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${service.latitude},${service.longitude}`;
  const websiteHref = service.website
    ? service.website.startsWith("http")
      ? service.website
      : `https://${service.website}`
    : null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-md w-full"
        aria-describedby="service-details-desc"
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div
              className={`w-12 h-12 rounded-2xl ${cfg.bg} ${cfg.color} flex items-center justify-center flex-shrink-0`}
              aria-hidden="true"
            >
              <Icon className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-bold text-slate-900 leading-tight">
                {service.name}
              </DialogTitle>
              <p className={`text-xs font-semibold mt-0.5 ${cfg.color}`}>
                {cfg.label}
              </p>
            </div>
          </div>
        </DialogHeader>

        <p id="service-details-desc" className="sr-only">
          Details for {service.name}
        </p>

        <div className="divide-y divide-slate-50">
          <DetailRow
            icon={<MapPin className="w-4 h-4" />}
            label="Distance"
            value={DistanceCalculator.format(service.distance)}
          />

          {service.address && (
            <DetailRow
              icon={<MapPin className="w-4 h-4" />}
              label="Address"
              value={service.address}
            />
          )}

          <DetailRow
            icon={<MapPin className="w-4 h-4" />}
            label="Coordinates"
            value={
              <span className="font-mono text-xs">
                {service.latitude.toFixed(6)}, {service.longitude.toFixed(6)}
              </span>
            }
          />

          {service.phone && (
            <DetailRow
              icon={<Phone className="w-4 h-4" />}
              label="Phone"
              value={
                <a
                  href={`tel:${service.phone}`}
                  className="text-blue-600 hover:underline"
                >
                  {service.phone}
                </a>
              }
            />
          )}

          {service.website && websiteHref && (
            <DetailRow
              icon={<Globe className="w-4 h-4" />}
              label="Website"
              value={
                <a
                  href={websiteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-1 truncate max-w-[200px]"
                >
                  <span className="truncate">
                    {service.website.replace(/^https?:\/\//, "")}
                  </span>
                  <ExternalLink className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                </a>
              }
            />
          )}
        </div>

        {/* CTA */}
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-blue-600"
          aria-label={`Get directions to ${service.name}`}
        >
          <Navigation className="w-4 h-4" aria-hidden="true" />
          Get Directions
        </a>
      </DialogContent>
    </Dialog>
  );
}
