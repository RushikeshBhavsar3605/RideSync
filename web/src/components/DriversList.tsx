import { Button } from "./ui/button"
import { Clock } from 'lucide-react'
import { RouteFare, TripPreview } from '../types'
import { convertMetersToKilometers, convertSecondsToMinutes } from "../utils/math"
import { cn } from "../lib/utils"
import { PackagesMeta } from "./PackagesMeta"

interface DriverListProps {
  trip: TripPreview | null;
  onPackageSelect: (fare: RouteFare) => void
  onCancel: () => void
}


export function DriverList({ trip, onPackageSelect, onCancel }: DriverListProps) {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Select your ride</h2>
        <div className="mt-2 flex items-center gap-3 text-sm text-slate-500">
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 rounded-md font-medium text-slate-700">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            {convertMetersToKilometers(trip?.distance ?? 0)}
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 rounded-md font-medium text-slate-700">
            <Clock className="w-3.5 h-3.5" />
            {convertSecondsToMinutes(trip?.duration ?? 0)}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {trip?.rideFares.map((fare) => {
          const meta = PackagesMeta[fare.packageSlug];
          const price = fare.totalPriceInCents && `$${(fare.totalPriceInCents / 100).toFixed(2)}`

          return (
            <button
              key={fare.id}
              onClick={() => onPackageSelect(fare)}
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 text-left",
                "border-slate-100 bg-white hover:border-primary hover:shadow-md active:scale-[0.98]",
              )}
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-slate-50 rounded-xl group-hover:bg-primary/5 transition-colors">
                  {meta.icon}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{meta.name}</h3>
                  <p className="text-xs text-slate-500 font-medium">{meta.description}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-slate-900">{price}</p>
              </div>
            </button>
          );
        })}
      </div>

      <Button
        variant="ghost"
        className="w-full text-slate-500 hover:text-slate-900 py-6 rounded-2xl transition-colors"
        onClick={() => onCancel()}
      >
        Change Destination
      </Button>
    </div>
  )
}
