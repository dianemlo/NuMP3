import "./PlaylistCard.css";

function PlaylistCard({ title, user, onClick }) {
  return (
    <div
      className="playlist-card"
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!onClick) return;
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
    >
      <div className="playlist-image">🎵</div>
      <h4>{title}</h4>
      <p>{user}</p>
    </div>
  );
}

export default PlaylistCard;