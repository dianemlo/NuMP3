// function Home() {
//   return (
//     <div style={{ color: 'white', padding: '2rem' }}>
//       <h2>Home Page</h2>
//       <p>If you see this, routing works 🎉</p>
//     </div>
//   )
// }
//
// export default Home

import { useState } from "react";
import Sidebar from "../components/Sidebar";
import PlaylistCard from "../components/PlaylistCard";
import "./Home.css";

import { ytSearch } from "../lib/youtubeApi";
import { usePlayer } from "../player/PlayerContext";

const TEST_PLAYLIST_ID = "69968aa763f2a3b6c8f0b6b4";

function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { ready, nowPlaying, setQueue, playTrack, currentIndex } = usePlayer();

  async function handleSearch() {
    setError("");
    const q = query.trim();
    if (!q) return;

    try {
      setLoading(true);
      const items = await ytSearch(q, 20);
      setResults(items);
      setQueue(items);
      if (!items.length) setError("No results found.");
    } catch (e) {
      setError(e?.message || "YouTube search failed.");
    } finally {
      setLoading(false);
    }
  }

  function playAtIndex(idx) {
    if (idx < 0 || idx >= results.length) return;
    playTrack(results[idx], { queue: results, startIndex: idx});
  }

  async function searchSeed(seedQuery) {
    setError("");
    try {
      setLoading(true);
      const items = await ytSearch(seedQuery, 12);
      setResults(items);
      setQueue(items);

      if (items.length) {
        playTrack(items[0], { queue: items, startIndex: 0 });
      } else {
        setError("No results found.");
      }
    } catch (e) {
      setError(e?.message || "YouTube search failed.");
    } finally {
      setLoading(false);
    }
  }

  {/* adding a song to playlist */}
  async function addToPlaylist(song) {
  try {
    await fetch(
      `http://localhost:5000/playlists/${TEST_PLAYLIST_ID}/add-song`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: song.videoId,
          title: song.title,
          artist: song.channel,
          thumbnail: song.thumbnail,
        }),
      }
    );

    alert("Added to playlist 💿");
  } catch (err) {
    console.error("Error adding song:", err);
  }
}


  return (
    <div className="home-layout">
      <Sidebar />

      <main className="home-main">
        {/* Search */}
        <div className="search-bar">
          <input
            placeholder="Search music..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
          />
        </div>

        {/* Greeting */}
        <div className="greeting panel">
          <h2>GOOD AFTERNOON</h2>
          <p>// Discover new music and connect with friends</p>

          <p style={{ opacity: 0.8, marginTop: "0.75rem" }}>
            {!ready ? "Loading player..." : ""}
            {loading ? " Searching..." : ""}
            {nowPlaying ? ` Now playing: ${nowPlaying.title}` : ""}
            {error ? ` (${error})` : ""}
          </p>
        </div>

        {/* Search Results */}
        {results.length > 0 && (
          <section style={{ marginTop: "1rem" }}>
            <div className="section-header">
              <h3>SEARCH RESULTS</h3>
              <button onClick={() => playAtIndex(0)}>PLAY FIRST</button>
            </div>

            <div className="playlist-row">
              {results.map((item, idx) => (
                <div
                  key={item.videoId}
                  onClick={() => playAtIndex(idx)}
                  style={{
                    cursor: "pointer",
                    opacity: idx === currentIndex ? 1 : 0.9,
                    border:
                      idx === currentIndex
                        ? "1px solid rgba(255,255,255,0.35)"
                        : "1px solid transparent",
                    borderRadius: 12,
                    padding: 10,
                  }}
                >
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt=""
                        style={{ width: 54, height: 54, borderRadius: 10, objectFit: "cover" }}
                      />
                    ) : (
                      <div style={{ width: 54, height: 54, borderRadius: 10, display: "grid", placeItems: "center" }}>
                        🎵
                      </div>
                    )}

                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {item.title}
                      </div>
                      <div style={{ opacity: 0.8, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {item.channel}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // prevents triggering play
                        addToPlaylist(item);
                      }}
                      style={{
                        marginTop: 6,
                        padding: "4px 8px",
                        fontSize: 12,
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                    >
                      + Add
                    </button>


                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Trending */}
        <section>
          <div className="section-header">
            <h3>TRENDING PLAYLISTS</h3>
            <button>VIEW ALL</button>
          </div>

          <div className="playlist-row">
            <PlaylistCard title="Summer Vibes" user="@alexmusic" onClick={() => searchSeed("summer vibes playlist")} />
            <PlaylistCard title="Workout Energy" user="@fitbeats" onClick={() => searchSeed("workout energy mix")} />
            <PlaylistCard title="Chill Study" user="@studymode" onClick={() => searchSeed("chill study lofi mix")} />
            <PlaylistCard title="Night Drive" user="@midnight" onClick={() => searchSeed("night drive synthwave mix")} />
          </div>
        </section>
      </main>
    </div>
  );
}

export default Home;