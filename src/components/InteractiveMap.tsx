import { useState } from 'react'
import { MapPin, Users, Calendar } from 'lucide-react'

export interface MapLocation {
  id: string
  name: string
  description: string
  x: number
  y: number
  w: number
  h: number
  color: string
}

const CAMPUS_LOCATIONS: MapLocation[] = [
  { id: 'residence', name: 'Residences', description: 'Student housing dormitories and common rooms', x: 50, y: 50, w: 120, h: 100, color: '#ec6a8d' },
  { id: 'quad', name: 'The Quad', description: 'Open lawn and central gathering area', x: 220, y: 120, w: 140, h: 110, color: '#38a875' },
  { id: 'dining', name: 'Dining Hall', description: 'Main cafeteria and snack bars', x: 50, y: 200, w: 100, h: 90, color: '#e3a72f' },
  { id: 'science', name: 'Science Building', description: 'Lab facilities, lecture theatres and workshops', x: 420, y: 50, w: 130, h: 100, color: '#6d3df5' },
  { id: 'library', name: 'Macdonald Library', description: 'Quiet study areas and group meeting spaces', x: 420, y: 200, w: 110, h: 90, color: '#3788e5' },
  { id: 'gym', name: 'Athletic Centre', description: 'Gymnasium, swimming pool and tennis courts', x: 220, y: 280, w: 120, h: 80, color: '#319caa' }
]

interface InteractiveMapProps {
  onSelectLocation?: (location: string) => void
  selectedLocation?: string
  activities?: any[]
  showDetails?: boolean
}

export function InteractiveMap({ onSelectLocation, selectedLocation, activities = [], showDetails = true }: InteractiveMapProps) {
  const [hovered, setHovered] = useState<string | null>(null)

  const activeLocId = CAMPUS_LOCATIONS.find(l => l.name.toLowerCase() === selectedLocation?.toLowerCase())?.id || null

  const getLocActivities = (locName: string) => {
    return activities.filter(a => a.location?.toLowerCase().includes(locName.toLowerCase()) || locName.toLowerCase().includes(a.location?.toLowerCase()))
  }

  const handleLocationClick = (loc: MapLocation) => {
    if (onSelectLocation) {
      onSelectLocation(loc.name)
    }
  }

  return (
    <div className="interactive-map-container">
      <div className="map-view">
        <svg viewBox="0 0 600 400" className="campus-svg" width="100%" height="100%">
          {/* Grid Background */}
          <defs>
            <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(109, 61, 245, 0.05)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="600" height="400" fill="url(#grid)" rx="20" />

          {/* Campus Roads / Paths */}
          <path d="M 110 100 L 290 170 L 485 100 M 100 245 L 280 170 L 475 245 M 280 170 L 280 320" 
                fill="none" stroke="#e8e4ec" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 110 100 L 290 170 L 485 100 M 100 245 L 280 170 L 475 245 M 280 170 L 280 320" 
                fill="none" stroke="#faf9f7" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />

          {/* Locations Rendering */}
          {CAMPUS_LOCATIONS.map((loc) => {
            const locActCount = getLocActivities(loc.name).length
            const isSelected = activeLocId === loc.id
            const isHovered = hovered === loc.id

            return (
              <g 
                key={loc.id} 
                className={`map-node ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
                onClick={() => handleLocationClick(loc)}
                onMouseEnter={() => setHovered(loc.id)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Glow under selected building */}
                {isSelected && (
                  <rect 
                    x={loc.x - 8} y={loc.y - 8} width={loc.w + 16} height={loc.h + 16} rx="16"
                    fill={loc.color} opacity="0.25" className="glow-rect"
                  />
                )}
                
                {/* Main Building Rect */}
                <rect 
                  x={loc.x} y={loc.y} width={loc.w} height={loc.h} rx="12"
                  fill="white" stroke={isSelected ? loc.color : '#e8e4ec'} 
                  strokeWidth={isSelected ? 3 : 2}
                  style={{
                    transition: 'all 0.25s ease',
                    boxShadow: isHovered ? '0 10px 20px rgba(0,0,0,0.1)' : 'none'
                  }}
                />
                
                {/* Roof/Accent line */}
                <rect 
                  x={loc.x} y={loc.y} width={loc.w} height="8" rx="4"
                  fill={loc.color}
                />

                {/* Text Label */}
                <text 
                  x={loc.x + loc.w / 2} y={loc.y + loc.h / 2} 
                  textAnchor="middle" dominantBaseline="middle"
                  style={{
                    fontFamily: 'Manrope, sans-serif',
                    fontWeight: 700,
                    fontSize: '13px',
                    fill: '#211d2c'
                  }}
                >
                  {loc.name}
                </text>

                {/* Activity Badge Indicator */}
                {locActCount > 0 && (
                  <g transform={`translate(${loc.x + loc.w - 12}, ${loc.y + 12})`}>
                    <circle r="10" fill="#d94343" />
                    <text 
                      textAnchor="middle" dominantBaseline="central" 
                      style={{ fill: 'white', fontSize: '9px', fontWeight: 800, fontFamily: 'sans-serif' }}
                    >
                      {locActCount}
                    </text>
                  </g>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {showDetails && selectedLocation && (
        <div className="map-detail-panel card">
          {CAMPUS_LOCATIONS.filter(l => l.name.toLowerCase() === selectedLocation.toLowerCase()).map(loc => (
            <div key={loc.id}>
              <div className="map-detail-header">
                <span className="location-indicator" style={{ backgroundColor: loc.color }} />
                <h3>{loc.name}</h3>
              </div>
              <p className="description">{loc.description}</p>
              
              <div className="location-activities">
                <h4>Activities scheduled here ({getLocActivities(loc.name).length}):</h4>
                {getLocActivities(loc.name).length === 0 ? (
                  <p className="empty-message">No activities currently planned at this location. Be the first to start one!</p>
                ) : (
                  <div className="mini-activity-list">
                    {getLocActivities(loc.name).map(act => (
                      <div key={act.id} className="mini-activity-item">
                        <span className="emoji">{act.emoji}</span>
                        <div className="info">
                          <strong>{act.title}</strong>
                          <span>Hosted by {act.host} · {act.time}</span>
                        </div>
                        <span className="badge"><Users size={12} /> {act.attendees}/{act.capacity}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
