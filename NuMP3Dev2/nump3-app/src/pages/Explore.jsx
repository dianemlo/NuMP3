// import { useState } from 'react'
// import './Explore.css'

// const profiles = [
//   {
//     id: 1,
//     name: 'alex.wav',
//     bio: 'late night drives & synth music',
//     genres: ['Synthwave', 'Electronic', 'Chill'],
//     image: 'https://via.placeholder.com/300'
//   },
//   {
//     id: 2,
//     name: 'luna.fm',
//     bio: 'soft indie & rainy playlists',
//     genres: ['Indie', 'Lo-fi', 'Alt'],
//     image: 'https://via.placeholder.com/300'
//   },
//   {
//     id: 3,
//     name: 'neonbeats',
//     bio: 'high energy club playlists',
//     genres: ['EDM', 'House', 'Techno'],
//     image: 'https://via.placeholder.com/300'
//   }
// ]

// function Explore() {
//   const [index, setIndex] = useState(0)

//   const handleNext = () => {
//     setIndex((prev) => (prev + 1) % profiles.length)
//   }

//   const profile = profiles[index]

//   return (
//     <div className="explore-page">
//       <div className="explore-card panel">
//         <img src={profile.image} alt={profile.name} />

//         <h2>{profile.name}</h2>
//         <p className="bio">{profile.bio}</p>

//         <div className="genres">
//           {profile.genres.map((g) => (
//             <span key={g}>{g}</span>
//           ))}
//         </div>

//         <div className="actions">
//           <button className="skip" onClick={handleNext}>❌</button>
//           <button className="like" onClick={handleNext}>💖</button>
//         </div>
//       </div>
//     </div>
//   )
// }

// export default Explore



// import './Explore.css'

// function Explore() {
//   return (
//     <div className="explore-page">
//       <h2 className="explore-title">Explore Profiles</h2>

//       <div className="profile-grid">
//         {[1, 2, 3, 4, 5].map((id) => (
//           <div key={id} className="explore-card">
//             <img
//               src="https://via.placeholder.com/150"
//               alt="profile"
//               className="explore-pic"
//             />

//             <h3>@user{id}</h3>
//             <p className="tagline">♡ indie • late nights • retro</p>

//             <div className="card-actions">
//               <button className="like">♡ Like</button>
//               <button className="view">View</button>
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   )
// }

// export default Explore



// import { useState } from 'react'
// import './Explore.css'

// const profiles = [
//   { id: 1, name: '@user1' },
//   { id: 2, name: '@user2' },
//   { id: 3, name: '@user3' },
//   { id: 4, name: '@user4' },
//   { id: 5, name: '@user5' }
// ]

// function Explore() {
//   const [activeIndex, setActiveIndex] = useState(2) // center one

//   return (
//     <div className="explore-page">
//       <h2 className="explore-title">Explore Profiles</h2>

//       <div className="coverflow">
//         {profiles.map((profile, index) => {
//           let className = 'card'

//           if (index === activeIndex) className += ' center'
//           else if (index === activeIndex - 1) className += ' mid-left'
//           else if (index === activeIndex + 1) className += ' mid-right'
//           else if (index < activeIndex) className += ' left'
//           else className += ' right'

//           return (
//             <div
//               key={profile.id}
//               className={className}
//               onMouseEnter={() => setActiveIndex(index)}
//             >
//               <img
//                 src="https://via.placeholder.com/180"
//                 alt={profile.name}
//               />
//               <p>{profile.name}</p>
//             </div>
//           )
//         })}
//       </div>
//     </div>
//   )
// }

// export default Explore



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
