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

import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import defaultProfilePic from '../assets/default-profile.jpeg'
import './Profile.css'

function Profile() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const [profileMessage, setProfileMessage] = useState('')
  const [uploading, setUploading] = useState(false)
  const [bioInput, setBioInput] = useState('')
  const [editingBio, setEditingBio] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')

    if (!token || !storedUser) {
      navigate('/auth')
      return
    }

    const parsedUser = JSON.parse(storedUser)
    setUser(parsedUser)
    setBioInput(parsedUser.bio || '')
  }, [navigate])

  const handleImageChange = (e) => {
    const file = e.target.files[0]

    if (!file) return

    const reader = new FileReader()

    reader.onloadend = () => {
      setSelectedImage(reader.result)
    }

    reader.readAsDataURL(file)
  }

  const handleSaveProfilePicture = async () => {
    if (!selectedImage) return

    setUploading(true)
    setProfileMessage('')

    try {
      const token = localStorage.getItem('token')

      const response = await fetch('http://localhost:5000/api/users/profile-picture', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          profilePicture: selectedImage
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Could not update profile picture')
      }

      localStorage.setItem('user', JSON.stringify(data.user))
      setUser(data.user)
      setSelectedImage(null)
      setProfileMessage('Profile picture updated!')
    } catch (error) {
      setProfileMessage(error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleSaveBio = async () => {
    try {
      const token = localStorage.getItem('token')

      const response = await fetch('http://localhost:5000/api/users/bio', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          bio: bioInput
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Could not update bio')
      }

      localStorage.setItem('user', JSON.stringify(data.user))
      setUser(data.user)
      setBioInput(data.user.bio || '')
      setProfileMessage('Bio updated!')
      setEditingBio(false)
    } catch (error) {
      setProfileMessage(error.message)
    }
  }

  return (
    <>

      <div className="profile-layout">

        {/* LEFT COLUMN */}
        <div className="profile-left">

          <div className="profile-card panel">
            <img
              className="profile-pic"
              src={selectedImage || user?.profilePicture || defaultProfilePic}
              alt="profile"
            />

            <p className="welcome-back-text">
              Welcome back,{' '}
              <span className="profile-username-highlight">
                @{user?.username || 'user'}
              </span>
            </p>

            <div className="profile-picture-actions">
              <label className="upload-pfp-btn">
                Change Picture
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  hidden
                />
              </label>

              {selectedImage && (
                <button
                  className="save-pfp-btn"
                  onClick={handleSaveProfilePicture}
                  disabled={uploading}
                >
                  {uploading ? 'Saving...' : 'Save Picture'}
                </button>
              )}
            </div>

            {profileMessage && <p className="profile-message">{profileMessage}</p>}

            {editingBio ? (
              <div className="bio-editor">
                <textarea
                  className="bio-textarea"
                  value={bioInput}
                  onChange={(e) => setBioInput(e.target.value)}
                  maxLength={160}
                  placeholder="Write something about yourself..."
                />

                <div className="bio-buttons">
                  <button className="save-bio-btn" onClick={handleSaveBio}>
                    Save Bio
                  </button>
                  <button className="cancel-bio-btn" onClick={() => {
                    setBioInput(user?.bio || '')
                    setEditingBio(false)
                  }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="bio">
                  {user?.bio || 'No bio yet.'}
                </p>
                <button className="edit-bio-btn" onClick={() => setEditingBio(true)}>
                  Edit Bio
                </button>
              </>
            )}

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
    </>
  )
}

export default Profile
