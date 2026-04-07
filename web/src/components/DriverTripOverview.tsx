import { Trip } from "../types"
import { TripOverviewCard } from "./TripOverviewCard"
import { Button } from "./ui/button"
import { TripEvents } from "../contracts"

interface DriverTripOverviewProps {
  trip?: Trip | null,
  status?: TripEvents | null,
  onAcceptTrip?: () => void,
  onDeclineTrip?: () => void
}

export const DriverTripOverview = ({ trip, status, onAcceptTrip, onDeclineTrip }: DriverTripOverviewProps) => {
  if (!trip) {
    return (
      <TripOverviewCard
        title="Ready to earn"
        description="Stay online to receive trip requests from riders nearby. Your location is being updated in real-time."
      >
        <div className="mt-8 flex flex-col items-center justify-center p-8 rounded-[2rem] border-2 border-dashed border-slate-100 bg-slate-50/50">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-ping" />
          </div>
          <p className="text-sm font-medium text-slate-500">Searching for riders...</p>
        </div>
      </TripOverviewCard>
    )
  }

  if (status === TripEvents.DriverTripRequest) {
    return (
      <TripOverviewCard
        title="New Request!"
        description="A rider nearby is looking for a trip. Review the route on the map before accepting."
      >
        <div className="mt-6 flex flex-col gap-3">
          <Button 
            onClick={onAcceptTrip}
            className="w-full py-7 rounded-2xl text-lg font-bold shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Accept Trip
          </Button>
          <Button 
            variant="ghost" 
            onClick={onDeclineTrip}
            className="w-full py-6 rounded-2xl text-slate-500 hover:text-red-500 transition-colors"
          >
            Decline
          </Button>
        </div>
      </TripOverviewCard>
    )
  }

  if (status === TripEvents.DriverTripAccept) {
    return (
      <TripOverviewCard
        title="Active Trip"
        description="Head to the pickup point. The route is displayed on your map."
      >
        <div className="mt-6 p-6 rounded-3xl bg-slate-900 text-white shadow-xl animate-in zoom-in duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Trip Details</span>
            <div className="px-2 py-1 bg-green-500/20 text-green-400 rounded-md text-[10px] font-bold uppercase tracking-wider">Confirmed</div>
          </div>
          
          <div className="space-y-4">
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Rider ID</p>
              <p className="font-mono text-sm truncate">{trip.userID}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Trip ID</p>
              <p className="font-mono text-sm truncate">{trip.id}</p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-800">
            <Button variant="secondary" className="w-full py-6 rounded-xl font-bold bg-white text-slate-900 hover:bg-slate-100">
              Start Navigation
            </Button>
          </div>
        </div>
      </TripOverviewCard>
    )
  }

  return null
}