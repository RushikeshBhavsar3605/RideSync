import { PackagesMeta } from './PackagesMeta'
import { CarPackageSlug } from '../types'
import { cn } from "../lib/utils"

interface DriverPackageSelectorProps {
  onSelect: (packageSlug: CarPackageSlug) => void
}

export function DriverPackageSelector({ onSelect }: DriverPackageSelectorProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 p-6">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-100 p-8 md:p-10 animate-in fade-in zoom-in duration-500">
        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Select vehicle</h2>
          <p className="text-slate-500 mt-2">Choose the type of car you&apos;ll be driving today</p>
        </div>

        <div className="space-y-4">
          {Object.entries(PackagesMeta).map(([slug, meta]) => (
            <button
              key={slug}
              className={cn(
                "w-full flex items-center gap-5 p-5 rounded-3xl border-2 transition-all duration-200 text-left group",
                "border-slate-100 bg-white hover:border-primary hover:shadow-xl active:scale-[0.98]",
              )}
              onClick={() => onSelect(slug as CarPackageSlug)}
            >
              <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-primary/5 transition-colors">
                <div className="group-hover:scale-110 transition-transform duration-300">
                  {meta?.icon}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 leading-tight">{meta?.name}</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">{meta?.description}</p>
              </div>
              <div className="text-slate-300 group-hover:text-primary transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}