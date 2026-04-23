import { useState, useEffect } from 'react'
import './Explore.css'

const DEFAULT_PIC = 'https://via.placeholder.com/140/1c1c3c/a78bfa?text=♪'

function Explore() {
  const [profiles, setProfiles] = useState([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedProfile, setExpandedProfile] = useState(null)

  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true)
        const token = localStorage.getItem('token')
        const res = await fetch('http://localhost:5000/api/users/explore', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
        if (!res.ok) throw new Error('Failed to load profiles')
        const data = await res.json()
        setProfiles(data)
        setActiveIndex(Math.floor(data.length / 2))
      } catch (e) {
        setError(e.message || 'Could not load profiles')
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [])

  function goLeft() {
    setActiveIndex((prev) => Math.max(0, prev - 1))
    setExpandedProfile(null)
  }

  function goRight() {
    setActiveIndex((prev) => Math.min(profiles.length - 1, prev + 1))
    setExpandedProfile(null)
  }

  function handleCardClick(index) {
    if (index === activeIndex) {
      setExpandedProfile(expandedProfile ? null : profiles[index])
    } else {
      setActiveIndex(index)
      setExpandedProfile(null)
    }
  }

  if (loading) {
    return (
      <div className="explore-page">
        <h2 className="explore-title">Explore Profiles</h2>
        <div className="explore-loading">
          <span className="loading-pulse">♪</span>
          <p>Finding music lovers...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="explore-page">
        <h2 className="explore-title">Explore Profiles</h2>
        <p className="explore-error">{error}</p>
      </div>
    )
  }

  if (profiles.length === 0) {
    return (
      <div className="explore-page">
        <h2 className="explore-title">Explore Profiles</h2>
        <p className="explore-empty">No other users yet — invite some friends! 🎵</p>
      </div>
    )
  }

  const active = profiles[activeIndex]

  return (
    <div className="explore-page">
      <h2 className="explore-title">Explore Profiles</h2>

      <div className="explore-nav-hint">
        <span className="hint-key" onClick={goLeft}>◀</span>
        <span className="hint-text">{activeIndex + 1} / {profiles.length}</span>
        <span className="hint-key" onClick={goRight}>▶</span>
      </div>

      <div className="overlap-row">
        {profiles.map((p, index) => {
          const offset = index - activeIndex
          const isActive = index === activeIndex
          const absOffset = Math.abs(offset)

          if (absOffset > 2) return null

          const profilePic = p.profilePicture
            ? `http://localhost:5000${p.profilePicture}`
            : DEFAULT_PIC

          return (
            <div
              key={p._id}
              className={`overlap-card ${isActive ? 'active' : ''}`}
              style={{
                transform: `translateX(${offset * 88}px) scale(${isActive ? 1.12 : 0.88 - absOffset * 0.04})`,
                zIndex: isActive ? 10 : 5 - absOffset,
                opacity: absOffset > 1 ? 0.45 : 1,
                pointerEvents: absOffset > 2 ? 'none' : 'auto'
              }}
              onClick={() => handleCardClick(index)}
            >
              <img
                src={profilePic}
                alt={p.username}
                onError={(e) => { e.target.src = DEFAULT_PIC }}
              />

              <h3>@{p.username}</h3>
              <p className="bio">{p.bio || 'No bio yet 🎵'}</p>

              {/* Genre tags derived from liked songs / playlists */}
              {p.genreTags?.length > 0 && (
                <div className="genres">
                  {p.genreTags.map((g) => (
                    <span key={g}>{g}</span>
                  ))}
                </div>
              )}

              {/* SHOW FULL DETAIL ONLY FOR ACTIVE CARD */}
              {isActive && (
                <div className="active-detail">
                  <div className="card-stats">
                    <div className="stat">
                      <span className="stat-num">{p.playlistCount ?? 0}</span>
                      <span className="stat-label">playlists</span>
                    </div>
                    <div className="stat">
                      <span className="stat-num">{p.likedSongCount ?? 0}</span>
                      <span className="stat-label">liked</span>
                    </div>
                  </div>

                  {p.playlists?.length > 0 && (
                    <>
                      <p className="section-micro-label">Playlists</p>
                      <div className="mini-albums">
                        {p.playlists.slice(0, 4).map((pl) => (
                          <div key={pl._id} className="mini-album">
                            <span className="mini-album-icon">
                              {pl.coverType === 'cassette' ? '📼' : pl.coverType === 'cd' ? '💿' : '🎵'}
                            </span>
                            {pl.name}
                            <span className="mini-album-count">{pl.songs?.length ?? 0} songs</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <button
                    className="view-full-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      setExpandedProfile(expandedProfile ? null : p)
                    }}
                  >
                    {expandedProfile ? 'Close ✕' : 'View Full Profile ↓'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* KEYBOARD / ARROW NAVIGATION */}
      <div className="explore-arrows">
        <button
          className="arrow-btn"
          onClick={goLeft}
          disabled={activeIndex === 0}
        >
          ◀ Prev
        </button>
        <button
          className="arrow-btn"
          onClick={goRight}
          disabled={activeIndex === profiles.length - 1}
        >
          Next ▶
        </button>
      </div>

      {/* EXPANDED PROFILE PANEL */}
      {expandedProfile && (
        <div className="expanded-panel">
          <div className="expanded-header">
            <img
              src={
                expandedProfile.profilePicture
                  ? `http://localhost:5000${expandedProfile.profilePicture}`
                  : DEFAULT_PIC
              }
              alt={expandedProfile.username}
              className="expanded-pic"
              onError={(e) => { e.target.src = DEFAULT_PIC }}
            />
            <div className="expanded-info">
              <h3>@{expandedProfile.username}</h3>
              <p className="expanded-bio">{expandedProfile.bio || 'No bio yet'}</p>
              {expandedProfile.genreTags?.length > 0 && (
                <div className="genres expanded-genres">
                  {expandedProfile.genreTags.map((g) => (
                    <span key={g}>{g}</span>
                  ))}
                </div>
              )}
              <div className="expanded-stats">
                <span>{expandedProfile.playlistCount ?? 0} playlists</span>
                <span>·</span>
                <span>{expandedProfile.likedSongCount ?? 0} liked songs</span>
              </div>
            </div>
            <button
              className="expanded-close"
              onClick={() => setExpandedProfile(null)}
            >✕</button>
          </div>

          {expandedProfile.playlists?.length > 0 && (
            <div className="expanded-playlists">
              <h4>Playlists</h4>
              <div className="expanded-playlist-grid">
                {expandedProfile.playlists.map((pl) => (
                  <div key={pl._id} className="expanded-playlist-card">
                    <div className="epl-icon">
                      {pl.coverType === 'cassette' ? '📼' : pl.coverType === 'cd' ? '💿' : '🎵'}
                    </div>
                    <div className="epl-name">{pl.name}</div>
                    <div className="epl-count">{pl.songs?.length ?? 0} songs</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {expandedProfile.likedSongs?.length > 0 && (
            <div className="expanded-liked">
              <h4>Liked Songs</h4>
              <div className="liked-scroll">
                {expandedProfile.likedSongs.slice(0, 8).map((s, i) => (
                  <div key={s.songId || i} className="liked-row">
                    {s.image && (
                      <img src={s.image} alt={s.title} className="liked-thumb" />
                    )}
                    <div className="liked-meta">
                      <div className="liked-title">{s.title}</div>
                      <div className="liked-artist">{s.artist}</div>
                    </div>
                  </div>
                ))}
                {expandedProfile.likedSongs.length > 8 && (
                  <p className="liked-more">+{expandedProfile.likedSongs.length - 8} more songs</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Explore