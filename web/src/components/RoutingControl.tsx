import { Polyline } from "react-leaflet";

export function RoutingControl({ route }: {
    route: [number, number][]
}) {
    if (!route || route.length === 0) return null

    return (
        <>
            {/* Outer Glow/Border */}
            <Polyline 
                positions={route} 
                pathOptions={{
                    color: '#6366f1',
                    weight: 8,
                    opacity: 0.2,
                    lineJoin: 'round',
                    lineCap: 'round'
                }} 
            />
            {/* Main Path */}
            <Polyline 
                positions={route} 
                pathOptions={{
                    color: '#4f46e5',
                    weight: 4,
                    opacity: 1,
                    lineJoin: 'round',
                    lineCap: 'round'
                }} 
            />
        </>
    )
}