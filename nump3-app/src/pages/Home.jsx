import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import PlaylistCard from "../components/PlaylistCard";
import "./Home.css";

import { ytSearch, resolveTrack, generatePlaylist } from "../lib/youtubeApi";
import { getPlaylists, addSongToPlaylist, createPlaylist } from "../lib/playlistApi";
import { usePlayer } from "../player/PlayerContext";
import { saveAlbumLocally } from "../lib/localAlbums";

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

function Home({ searchResults, setSearchResults, searchQuery, setSearchQuery }) {
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resolvingTrack, setResolvingTrack] = useState(null);
  const [resolvedMeta, setResolvedMeta] = useState({});

  const [playlists, setPlaylists] = useState([]);
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [playlistError, setPlaylistError] = useState("");
  const [playlistPickerOpen, setPlaylistPickerOpen] = useState(false);
  const [playlistSong, setPlaylistSong] = useState(null);
  const [addingToPlaylistId, setAddingToPlaylistId] = useState(null);
  const [generatedTracks, setGeneratedTracks] = useState([]);

  const { ready, nowPlaying, playTrack, currentIndex } = usePlayer();
  const [greeting, setGreeting] = useState(getGreeting());

  useEffect(() => {
    const id = setInterval(() => setGreeting(getGreeting()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    loadPlaylists();
  }, []);

  async function loadPlaylists() {
    try {
      setPlaylistLoading(true);
      setPlaylistError("");
      const data = await getPlaylists(currentUser?.id || "demo-user");
      setPlaylists(Array.isArray(data) ? data : []);
    } catch (e) {
      setPlaylistError(e?.message || "Failed to load playlists.");
    } finally {
      setPlaylistLoading(false);
    }
  }

  async function handleSearch() {
    setError("");
    const q = searchQuery.trim();
    if (!q) return;

    try {
      setLoading(true);
      const items = await ytSearch(q, { limit: 12 });
      setSearchResults(items);

      if (!items.length) setError("No results found.");
    } catch (e) {
      setError(e?.message || "Search failed.");
    } finally {
      setLoading(false);
    }
  }

  async function ensurePlayable(item) {
    if (!item) return item;

    // Always resolve to get enriched metadata (genre, era, etc.)
    // even if videoId is already known
    try {
      const resolved = await resolveTrack(item);
      console.log("resolved metadata:", resolved.metadata);
      console.log("spotifyTrackId:", item.spotifyTrackId);

      const playable = {
        ...item,
        videoId: resolved.videoId || item.videoId,
        channel: resolved.channel || item.artist || "",
        artist: item.artist || resolved.artist || "",
        thumbnail: item.thumbnail || resolved.thumbnail || "",
        metadata: resolved.metadata || item.metadata || null,
        ytCandidates: Array.isArray(resolved.candidates) ? resolved.candidates : [],
        ytCandidatesIndex: 0,
      };

      if (resolved.metadata && item.spotifyTrackId) {
        setResolvedMeta((prev) => ({
          ...prev,
          [item.spotifyTrackId]: resolved.metadata,
        }));
      }

      setSearchResults((prev) =>
        prev.map((r) =>
          r.spotifyTrackId === item.spotifyTrackId ? playable : r
        )
      );

      return playable;
    } catch {
      return item; // fallback to original if resolve fails
    }
  }

  async function preResolveAroundIndex(startIdx, count = 1) {
    const slice = searchResults.slice(startIdx, startIdx + count);
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

    setSearchResults((prev) =>
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
    if (idx < 0 || idx >= searchResults.length) return;

    try {
      setResolvingTrack(searchResults[idx]?.spotifyTrackId || idx);

      const playable = await ensurePlayable(searchResults[idx]);

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
      setSearchResults(items);

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

  function openPlaylistPicker(song) {
    setPlaylistSong(song);
    setPlaylistPickerOpen(true);
  }

  function closePlaylistPicker() {
    setPlaylistPickerOpen(false);
    setPlaylistSong(null);
    setAddingToPlaylistId(null);
  }

  async function handleGenerate({ genre, decade }) {
    setError("");
    setLoading(true);
    try {
      const data = await generatePlaylist({ genre, decade, limit: 15 });
      setGeneratedTracks(data.tracks); // ← change this line
      setResolvedMeta({});
      if (!data.tracks.length) setError("No tracks found.");
      return data;
    } catch (e) {
      setError(e?.message || "Generation failed.");
      throw e;
    } finally {
      setLoading(false);
    }
  }


  async function handleAddSongToSelectedPlaylist(playlistId) {
    if (!playlistSong || !playlistId) return;

    try {
      setAddingToPlaylistId(playlistId);

      const playable = playlistSong.videoId
        ? playlistSong
        : await ensurePlayable(playlistSong);

      await addSongToPlaylist(playlistId, {
        videoId: playable.videoId,
        title: playable.title,
        artist: cleanArtist(playable.artist || playable.channel || ""),
        thumbnail: playable.thumbnail || "",
        spotify: {
          trackId: playable.spotifyTrackId || null,
          artistId: playable.artistId || null,
          albumId: playable.album?.id || null,
          albumName: playable.album?.name || null,
          release_date: playable.album?.release_date || null,
          albumImages: playable.album?.images || [],
        },
        metadata: playable.metadata || null,
      });

      alert("Added to playlist 💿");
      closePlaylistPicker();
      loadPlaylists();
    } catch (err) {
      console.error("Error adding song:", err);
      alert(err?.message || "Failed to add song");
      setAddingToPlaylistId(null);
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

  async function toggleLike(song) {
    try {
      await fetch("http://localhost:5000/api/likes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: JSON.parse(localStorage.getItem("user") || "{}").id || "test-user-id",
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

  const statusLine = useMemo(() => {
    const parts = [];
    if (!ready) parts.push("Loading player...");
    if (loading) parts.push("Searching...");
    if (nowPlaying?.title) parts.push(`Now playing: ${nowPlaying.title}`);
    if (error) parts.push(`(${error})`);
    return parts.join(" ");
  }, [ready, loading, nowPlaying, error]);

  return (
    <div className="home-layout">
      <Sidebar
        onGenerate={handleGenerate}
        generatedTracks={generatedTracks}
        onPlayAll={(tracks, startIdx) => {
          setSearchResults(tracks);
          setResolvedMeta({});
          setTimeout(() => playAtIndex(startIdx), 50);
        }}
        onAddToPlaylist={(track) => openPlaylistPicker(track)}
        onSavePlaylist={async ({ name, tracks }) => {
          const coverInput = window.prompt(
            "Choose a cover type: vinyl, cassette, or cd",
            "vinyl"
          );
          const normalizedCover = String(coverInput || "vinyl").trim().toLowerCase();
          const coverType = ["vinyl", "cassette", "cd"].includes(normalizedCover)
            ? normalizedCover : "vinyl";

          const newPlaylist = await createPlaylist({
            name: name.trim() || "Generated Playlist",
            userId: currentUser?.id || "demo-user",
            coverType,
          });

          for (const track of tracks) {
            if (!track.title) continue;
            await addSongToPlaylist(newPlaylist._id, {
              videoId: track.videoId || null,
              title: track.title,
              artist: track.artist,
              thumbnail: track.thumbnail || "",
              spotify: {
                trackId: track.spotifyTrackId || null,
                artistId: track.artistId || null,
                albumId: track.album?.id || null,
                albumName: track.album?.name || null,
                release_date: track.album?.release_date || null,
                albumImages: track.album?.images || [],
              },
              metadata: track.metadata || null,
            });
          }
        }}
      />
      
      <main className="home-main">
        <div className="search-bar">
          <input
            placeholder="Search Music..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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

        {searchResults.length > 0 && (
          <section style={{ marginTop: "1rem" }}>
            <div className="section-header">
              <h3>SEARCH RESULTS</h3>
              <button onClick={() => playAtIndex(0)}>PLAY FIRST</button>
            </div>

            <div className="search-grid">
              {searchResults.map((item, idx) => {
                const artist = cleanArtist(item.artist || item.channel || "").trim();
                const title = cleanTitle(item.title, artist);
                const meta = item.metadata || resolvedMeta[item.spotifyTrackId];
                console.log("meta for", item.title, ":", meta?.displayGenre);

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
                          openPlaylistPicker(item);
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
                    </div>
                    

                    <div className="yt-under">
                      <div className="meta-row">
                        {meta?.era && (
                          <span className="tag">{meta.era}</span>
                        )}

                        {meta?.styles?.[0] && (
                          <span className="tag">{meta.styles[0]}</span>
                        )}

                        {meta?.styles?.[1] && (
                            <span className="tag subtle">{meta.styles[1]}</span>
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

        {playlistPickerOpen && (
          <div
            className="playlist-modal-backdrop"
            onClick={closePlaylistPicker}
          >
            <div
              className="playlist-modal panel"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="playlist-modal-top">
                <h3>Select Playlist</h3>
                <button
                  className="playlist-close-btn"
                  onClick={closePlaylistPicker}
                  type="button"
                >
                  ✕
                </button>
              </div>

              {playlistError && (
                <p className="playlist-modal-error">{playlistError}</p>
              )}

              {playlistLoading ? (
                <p>Loading playlists...</p>
              ) : playlists.length === 0 ? (
                <p>No playlists yet. Create one from your profile first.</p>
              ) : (
                <div className="playlist-modal-list">
                  {playlists.map((playlist) => (
                    <button
                      key={playlist._id}
                      className="playlist-pick-btn"
                      type="button"
                      onClick={() => handleAddSongToSelectedPlaylist(playlist._id)}
                      disabled={addingToPlaylistId === playlist._id}
                    >
                      <span>{playlist.name}</span>
                      <span className="playlist-pick-count">
                        {addingToPlaylistId === playlist._id
                          ? "Adding..."
                          : `${playlist.songs?.length || 0} songs`}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Home;