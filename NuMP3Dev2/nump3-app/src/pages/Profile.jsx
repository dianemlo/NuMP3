// import './Profile.css'

// function Profile() {
//   return (
//     <div className="profile-container">

//       {/* Top / Centered section */}
//       <div className="profile-top">
//         <div className="avatar"></div>
//         <div className="username">@nump3user</div>
//         <div className="bio">
//           i like post-hardcore, r&b, and early 2000s music.
//         </div>
//       </div>

//       {/* Divider */}
//       <div className="divider"></div>

//       {/* Bottom / Split section */}
//       <div className="profile-bottom">

//         {/* Playlists */}
//         <div>
//           <h3 className="section-title">Playlists</h3>
//           <div className="card">late night mp3s</div>
//           <div className="card">indie finds</div>
//           <div className="card">2000s alt</div>
//         </div>

//         {/* Recently Added */}
//         <div>
//           <h3 className="section-title">Recently Added</h3>
//           <div className="card">song 1 – artist</div>
//           <div className="card">song 2 – artist</div>
//           <div className="card">song 3 – artist</div>
//         </div>

//       </div>

//     </div>
//   )
// }

// export default Profile

import { Link } from 'react-router-dom'
import './Profile.css'

function Profile() {
  return (
    <div className="profile-layout">

      {/* LEFT COLUMN */}
      <div className="profile-left">

        <div className="profile-card panel">
          <img
            className="profile-pic"
            src="https://via.placeholder.com/180"
            alt="profile"
          />

          <h2 className="username">@nump3user</h2>
          <p className="bio">
            hello ♡ into music, late nights, and cute retro vibes
          </p>

          <Link to="/explore" className="explore-link">
            Explore Profiles
          </Link>

        </div>

        <div className="recently-added panel">
          <h3>Recently Added</h3>

          <div className="recent-list">
            <div className="recent-item">✧ Midnight Dreams</div>
            <div className="recent-item">✧ Soft Static</div>
            <div className="recent-item">✧ Pixel Love</div>
            <div className="recent-item">✧ Neon Hearts</div>
            <div className="recent-item">✧ Cloud FM</div>
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN */}
      <div className="profile-right panel">
        {/* <h3>Albums</h3> */}

        <div className="albums-top">
          <h3>Albums</h3>

          <Link to="/create-playlist" className="create-playlist-link">
            Create Playlist
          </Link>
        </div>

        <div className="album-grid">
          <div className="album-card">♡ Album 1</div>
          <div className="album-card">♡ Album 2</div>
          <div className="album-card">♡ Album 3</div>
          <div className="album-card">♡ Album 4</div>
        </div>
      </div>

    </div>
  )
}

export default Profile
