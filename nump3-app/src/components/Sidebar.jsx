import { NavLink } from 'react-router-dom'
import './Sidebar.css'

function Sidebar() {
  return (
    <aside className="sidebar">
      {/* <h1 className="logo">NuMP3</h1> */}

      {/* <nav>
        <button>Home</button>
        <button>Explore</button>
        <button>Profile</button>
      </nav> */}

      <div className="playlists">
        <p>MY PLAYLISTS</p>
        <span>Favorites</span>
        <span>Discover Weekly</span>
        <span>Party Mix</span>
      </div>
    </aside>
  )
}

export default Sidebar
