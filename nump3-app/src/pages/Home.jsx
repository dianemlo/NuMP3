import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import PlaylistCard from "../components/PlaylistCard";
import "./Home.css";

import { ytSearch, resolveTrack, addSongToPlaylist } from "../lib/youtubeApi";
import { usePlayer } from "../player/PlayerContext";
import { saveAlbumLocally } from "../lib/localAlbums";

import SongCard from "../components/SongCard";

const TEST_PLAYLIST_ID = "69968aa763f2a3b6c8f0b6b4";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "GOOD MORNING";
  if (h < 18) return "GOOD AFTERNOON";
  return "GOOD EVENING";
}

function cleanArtist(artist = "") {
  return String(artist).replace(/\s*-\s*Topic\s*$/i, "").trim();
}

function cleanTitle(rawTitle = "", artist = "") {
  let t = String(rawTitle).trim();
  t = t.replace(/\[[^\]]*?\]|\([^\)]*?\)/g, "").trim();

  const a = String(artist).trim();
  if (a) {
    const esc = a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    t = t.replace(new RegExp(`^\\s*${esc}\\s*[-–—:]\\s*`, "i"), "");
  }

  t = t.replace(/\s{2,}/g, " ").trim();

  return t;
}

function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resolvingTrack, setResolvingTrack] = useState(null);

  const { ready, nowPlaying, setQueue, playTrack, currentIndex } = usePlayer();
  const [greeting, setGreeting] = useState(getGreeting());

  useEffect(() => {
    const id = setInterval(() => setGreeting(getGreeting()), 60_000);
    return () => clearInterval(id);
  }, []);

  async function handleSearch() {
    setError("");
    const q = query.trim();
    if (!q) return;

    try {
      setLoading(true);
      const items = await ytSearch(q, { limit: 12 });
      setResults(items);

      if (!items.length) setError("No results found.");
    } catch (e) {
      setError(e?.message || "Search failed.");
    } finally {
      setLoading(false);
    }
  }

  async function ensurePlayable(item) {
    if (!item) return item;
    if (item.videoId) return item;

    const resolved = await resolveTrack(item);

    const playable = {
      ...item,
      videoId: resolved.videoId,
      channel: resolved.channel || item.artist || "",
      artist: item.artist || resolved.artist || "",
      thumbnail: item.thumbnail || resolved.thumbnail || "",
      metadata: resolved.metadata || item.metadata || null,
    };

    setResults((prev) =>
      prev.map((r) =>
        r.spotifyTrackId === item.spotifyTrackId ? playable : r
      )
    );

    return playable;
  }

  async function preResolveAroundIndex(startIdx, count = 1) {
    const slice = results.slice(startIdx, startIdx + count);
    if (!slice.length) return [];

    const resolvedSlice = await Promise.all(
      slice.map(async (item) => {
        try {
          if (!item || item.videoId) return item;

          const resolved = await resolveTrack(item);

          return {
            ...item,
            videoId: resolved.videoId,
            channel: resolved.channel || item.artist || "",
            artist: item.artist || resolved.artist || "",
            thumbnail: item.thumbnail || resolved.thumbnail || "",
            metadata: resolved.metadata || item.metadata || null,
          };
        } catch {
          return item;
        }
      })
    );

    setResults((prev) =>
      prev.map((item) => {
        const replacement = resolvedSlice.find(
          (r) => r?.spotifyTrackId && r.spotifyTrackId === item.spotifyTrackId
        );
        return replacement || item;
      })
    );

    return resolvedSlice;
  }

  async function playAtIndex(idx) {
    if (idx < 0 || idx >= results.length) return;

    try {
      setResolvingTrack(results[idx]?.spotifyTrackId || idx);

      const playable = await ensurePlayable(results[idx]);

      playTrack(playable, {
        queue: [playable],
        startIndex: 0,
      });

      preResolveAroundIndex(idx + 1, 1).catch(() => {});
    } catch (e) {
      setError(e?.message || "Could not play track.");
    } finally {
      setResolvingTrack(null);
    }
  }

  async function searchSeed(seedQuery) {
    setError("");
    try {
      setLoading(true);
      const items = await ytSearch(seedQuery, { limit: 12 });
      setResults(items);

      if (items.length) {
        const playable = await ensurePlayable(items[0]);
        playTrack(playable, { queue: [playable], startIndex: 0 });
        preResolveAroundIndex(1, 1).catch(() => {});
      } else {
        setError("No results found.");
      }
    } catch (e) {
      setError(e?.message || "Search failed.");
    } finally {
      setLoading(false);
    }
  }

  async function addToPlaylist(song) {
    try {
      const playable = song.videoId ? song : await ensurePlayable(song);

      await addSongToPlaylist(TEST_PLAYLIST_ID, {
        videoId: playable.videoId,
        title: playable.title,
        artist: cleanArtist(playable.artist || playable.channel || ""),
        channel: playable.channel || playable.artist || "",
        thumbnail: playable.thumbnail || "",
        spotify: {
          trackId: playable.spotifyTrackId || null,
          artistId: playable.artistId || null,
          albumId: playable.album?.id || null,
          albumName: playable.album?.name || null,
          release_date: playable.album?.release_date || null,
          albumImages: playable.album?.images || [],
        },
      });

      alert("Added to playlist 💿");
    } catch (err) {
      console.error("Error adding song:", err);
      alert(err?.message || "Failed to add song");
    }
  }

  async function toggleLike(song) {
  try {
    await fetch("http://localhost:5000/api/likes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: "test-user-id", // replace later
        type: "song",
        item: {
          songId: song.videoId || song.spotifyTrackId,
          title: song.title,
          artist: song.artist || song.channel,
          image: song.thumbnail,
        },
      }),
    });

    alert("Liked 💖");
  } catch (err) {
    console.error(err);
  }
}

  function addAlbumToProfileSection(song) {
    const album = song?.album;

    if (!album?.id) {
      alert("No album found for this song.");
      return;
    }

    saveAlbumLocally({
      id: album.id,
      name: album.name || "Unknown Album",
      images: album.images || [],
      release_date: album.release_date || null,
      artist: song.artist || song.channel || "Unknown Artist",
      metadata: song.metadata || null,
      tracks: [],
    });

    alert("Album saved to your profile 💿");
  }

  const statusLine = useMemo(() => {
    const parts = [];
    if (!ready) parts.push("Loading player...");
    if (loading) parts.push("Working...");
    if (nowPlaying?.title) parts.push(`Now playing: ${nowPlaying.title}`);
    if (error) parts.push(`(${error})`);
    return parts.join(" ");
  }, [ready, loading, nowPlaying, error]);

  return (
    <div className="home-layout">
      <Sidebar />

      <main className="home-main">
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

        <div className="greeting panel">
          <h2>{greeting}</h2>
          <p>// Discover new music and connect with friends</p>
          <p style={{ opacity: 0.8, marginTop: "0.75rem" }}>{statusLine}</p>
        </div>

        {results.length > 0 && (
          <section style={{ marginTop: "1rem" }}>
            <div className="section-header">
              <h3>SEARCH RESULTS</h3>
              <button onClick={() => playAtIndex(0)}>PLAY FIRST</button>
            </div>

            <div className="search-grid">
              {results.map((item, idx) => {
                const artist = cleanArtist(item.artist || item.channel || "").trim();
                const title = cleanTitle(item.title, artist);

                const isCurrent =
                  nowPlaying?.spotifyTrackId
                    ? nowPlaying.spotifyTrackId === item.spotifyTrackId
                    : idx === currentIndex;

                const isResolving =
                  resolvingTrack === (item.spotifyTrackId || idx);

                return (
                  <div
                    key={item.spotifyTrackId || `${item.title}-${idx}`}
                    onClick={() => playAtIndex(idx)}
                    className={`yt-tile ${isCurrent ? "is-current" : ""}`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") playAtIndex(idx);
                    }}
                  >
                    <div className="yt-artwrap">
                      {item.thumbnail ? (
                        <img className="yt-art" src={item.thumbnail} alt="" />
                      ) : (
                        <div className="yt-art yt-art--placeholder">🎵</div>
                      )}

                      {isResolving && (
                        <div className="yt-loading">
                          Loading...
                        </div>
                      )}

                      <div className="yt-overlay">
                        <div className="yt-title" title={title || item.title}>
                          {title || item.title}
                        </div>
                        <div className="yt-artist" title={artist}>
                          {artist || "Unknown artist"}
                        </div>
                      </div>

                      <button
                        className="yt-add"
                        onClick={(e) => {
                          e.stopPropagation();
                          addToPlaylist(item);
                        }}
                        title="Add to playlist"
                        aria-label="Add to playlist"
                      >
                        +
                      </button>

                      <button
                        className="yt-add-album"
                        onClick={(e) => {
                          e.stopPropagation();
                          addAlbumToProfileSection(item);
                        }}
                        title="Save album to profile"
                        aria-label="Save album to profile"
                      >
                        💿
                      </button>
                    </div>

                    <button
                      className="yt-like"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLike(item);
                      }}
                      title="Like song"
                    >
                      ❤️
                    </button>

                    <div className="yt-under">
                      <div className="meta-row">

                        {item.metadata?.era && (
                          <span className="tag">{item.metadata.era}</span>
                        )}

                        {item.metadata?.styles?.[0] && (
                          <span className="tag">{item.metadata.styles[0]}</span>
                        )}

                        {!item.metadata?.styles?.[0] && item.metadata?.genres?.[0] && (
                          <span className="tag">{item.metadata.genres[0]}</span>
                        )}

                        {item.metadata?.styles?.[0] && item.metadata?.genres?.[0] && (
                          <span className="tag subtle">{item.metadata.genres[0]}</span>
                        )}

                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <div className="section-header">
            <h3>TRENDING PLAYLISTS</h3>
            <button>VIEW ALL</button>
          </div>

          <div className="trending-grid">
            <PlaylistCard
              title="Summer Vibes"
              user="@alexmusic"
              onClick={() => searchSeed("summer vibes")}
            />
            <PlaylistCard
              title="Workout Energy"
              user="@fitbeats"
              onClick={() => searchSeed("workout energy")}
            />
            <PlaylistCard
              title="Chill Study"
              user="@studymode"
              onClick={() => searchSeed("chill study")}
            />
            <PlaylistCard
              title="Night Drive"
              user="@midnight"
              onClick={() => searchSeed("night drive")}
            />
          </div>
        </section>

      </main>
    </div>

    

  );
}

export default Home;