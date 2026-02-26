import './PlaylistCard.css'

function PlaylistCard({ title, user }) {
  return (
    <div className="playlist-card">
      <div className="playlist-image">🎵</div>
      <h4>{title}</h4>
      <p>{user}</p>
    </div>
  )
}

export default PlaylistCard
