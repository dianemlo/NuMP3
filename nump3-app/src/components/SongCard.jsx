import { useState } from "react";

function SongCard({ song, currentUser }) {
  const [isLiked, setIsLiked] = useState(false);

  const toggleLike = async () => {
    if (!isLiked) {
      await fetch("http://localhost:5000/api/likes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: currentUser._id,
          type: "song",
          item: {
            songId: song.id,
            title: song.title,
            artist: song.artist,
            image: song.image,
          },
        }),
      });

      setIsLiked(true);
    } else {
      await fetch("http://localhost:5000/api/likes", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: currentUser._id,
          type: "song",
          itemId: song.id,
        }),
      });

      setIsLiked(false);
    }
  };

  return (
    <div className="song-card">
      <img src={song.image} alt={song.title} />
      <h3>{song.title}</h3>
      <p>{song.artist}</p>

      <button onClick={toggleLike}>
        {isLiked ? "❤️" : "🤍"}
      </button>
    </div>
  );
}

export default SongCard;