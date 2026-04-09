import { useState } from 'react'
import './Explore.css'

const profiles = [
  {
    id: 1,
    name: '@luna.fm',
    bio: 'soft indie & rainy playlists',
    genres: ['Indie', 'Lo-fi'],
    image: 'https://via.placeholder.com/140',
    albums: ['Moonlight', 'Soft Static', 'Rain Tapes']
  },
  {
    id: 2,
    name: '@neonbeats',
    bio: 'club energy & night drives',
    genres: ['EDM', 'House'],
    image: 'https://via.placeholder.com/140',
    albums: ['Night Drive', 'Pulse', 'After Hours']
  },
  {
    id: 3,
    name: '@alex.wav',
    bio: 'retro synth & late nights',
    genres: ['Synth', 'Chill'],
    image: 'https://via.placeholder.com/140',
    albums: ['Neon Skies', 'Cassette Love', 'Midnight FM']
  },
  {
    id: 4,
    name: '@pixelpop',
    bio: 'cute pop & throwbacks',
    genres: ['Pop', 'Y2K'],
    image: 'https://via.placeholder.com/140',
    albums: ['Bubblegum', 'Star Girl', 'Pink Tape']
  },
  {
    id: 5,
    name: '@midnight',
    bio: 'dark alt & sad bangers',
    genres: ['Alt', 'Rock'],
    image: 'https://via.placeholder.com/140',
    albums: ['Black Roses', 'Static Hearts', 'After Dark']
  }
]

function Explore() {
  const [activeIndex, setActiveIndex] = useState(2)

  return (
    <div className="explore-page">
      <h2 className="explore-title">Explore Profiles</h2>

      <div className="overlap-row">
        {profiles.map((p, index) => {
          const offset = index - activeIndex

          return (
            <div
              key={p.id}
              className={`overlap-card ${index === activeIndex ? 'active' : ''}`}
              style={{
                transform: `
                  translateX(${offset * 90}px)
                  scale(${index === activeIndex ? 1.15 : 0.9})
                `,
                zIndex: index === activeIndex ? 10 : 5 - Math.abs(offset),
                opacity: Math.abs(offset) > 2 ? 0.3 : 1
              }}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <img src={p.image} alt={p.name} />

              <h3>{p.name}</h3>
              <p className="bio">{p.bio}</p>

              <div className="genres">
                {p.genres.map((g) => (
                  <span key={g}>{g}</span>
                ))}
              </div>

              {/* SHOW ALBUMS ONLY FOR ACTIVE PROFILE */}
              {index === activeIndex && (
                <div className="mini-albums">
                  {p.albums.map((album) => (
                    <div key={album} className="mini-album">
                      {album}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Explore
