interface TripOverviewCardProps {
  title: string
  description: string
  children?: React.ReactNode
}

export const TripOverviewCard = ({ title, description, children }: TripOverviewCardProps) => {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
        <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
      </div>
      
      <div className="flex-1">
        {children}
      </div>
    </div>
  )
}