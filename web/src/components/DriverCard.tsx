import { Driver, CarPackageSlug } from "../types";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { PaymentEventSessionCreatedData } from "../contracts";

export const DriverCard = ({ 
  driver, 
  packageSlug,
  paymentSession 
}: { 
  driver?: Driver | null, 
  packageSlug?: CarPackageSlug,
  paymentSession?: PaymentEventSessionCreatedData | null
}) => {
  if (!driver) return null;

  return (
    <div className="flex flex-col gap-4 p-4 rounded-3xl bg-slate-50 border border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-4">
        <Avatar className="w-14 h-14 border-2 border-white shadow-md">
          {driver.profilePicture && <AvatarImage src={driver.profilePicture} alt={driver.name} />}
          <AvatarFallback className="bg-primary/5 text-primary font-bold">
            {driver.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <h3 className="text-lg font-bold text-slate-900 truncate tracking-tight">
              {driver.name}
            </h3>
            {driver.carPlate && (
              <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded border border-slate-200 text-[10px] font-bold text-slate-500 bg-white font-mono tracking-widest uppercase">
                {driver.carPlate}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Verified Driver</span>
            </div>
          </div>
        </div>
      </div>

      {(packageSlug || paymentSession) && (
        <div className="flex items-center justify-between pt-3 border-t border-slate-200/50">
          <div className="flex flex-col">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Service</p>
            <p className="text-xs font-bold text-slate-700">
              {packageSlug ? (packageSlug.charAt(0).toUpperCase() + packageSlug.slice(1)) : "Standard Ride"}
            </p>
          </div>
          {paymentSession && (
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Amount</p>
              <p className="text-sm font-black text-primary">{paymentSession.currency} {paymentSession.amount.toFixed(2)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
};
