import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import defaultProfilePic from "../assets/default-profile.jpeg";
import { getAlbum, resolveTrack } from "../lib/youtubeApi";
import {
  getPlaylists,
  createPlaylist,
  deleteSongFromPlaylist,
  deletePlaylist,
} from "../lib/playlistApi";
import { usePlayer } from "../player/PlayerContext";
import { getSavedAlbums, removeSavedAlbum } from "../lib/localAlbums";
import vinylImg from "../assets/vinyl.jpg";
import cassetteImg from "../assets/cassette.webp";
import cdImg from "../assets/cd.webp";
import "./Profile.css";


function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [profileMessage, setProfileMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [bioInput, setBioInput] = useState("");
  const [editingBio, setEditingBio] = useState(false);
  const { playTrack } = usePlayer();
  const [likedSongs, setLikedSongs] = useState([]);

  const [savedAlbums, setSavedAlbums] = useState([]);
  const [albumError, setAlbumError] = useState("");

  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [selectedAlbumTracks, setSelectedAlbumTracks] = useState([]);
  const [selectedAlbumLoading, setSelectedAlbumLoading] = useState(false);

  const [playlists, setPlaylists] = useState([]);
  const [playlistError, setPlaylistError] = useState("");
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (!token || !storedUser) {
      navigate("/auth");
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
    setBioInput(parsedUser.bio || "");

    setSavedAlbums(getSavedAlbums());
    loadPlaylists(parsedUser.id);
    loadLikedSongs(parsedUser.id);
  }, [navigate]);

  function getPlaylistCover(type) {
    switch (type) {
      case "cassette":
        return cassetteImg;
      case "cd":
        return cdImg;
      case "vinyl":
        return vinylImg;
      default:
        return null;
    }
  }

  function shuffleArray(items = []) {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  async function loadPlaylists(userId) {
    const uid = userId || user?.id || "demo-user";
    try {
      setPlaylistLoading(true);
      setPlaylistError("");
      const data = await getPlaylists(uid);
      const nextPlaylists = Array.isArray(data) ? data : [];
      setPlaylists(nextPlaylists);

      setSelectedPlaylist((prev) => {
        if (!prev?._id) return prev;
        return nextPlaylists.find((p) => p._id === prev._id) || null;
      });
    } catch (e) {
      setPlaylistError(e?.message || "Failed to load playlists.");
    } finally {
      setPlaylistLoading(false);
    }
  }

  async function loadLikedSongs(userId) {
    if (!userId) return;
    try {
      const res = await fetch(`http://localhost:5000/api/likes/${userId}`);
      const data = await res.json();
      setLikedSongs(data?.likedSongs || []);
    } catch (e) {
      console.error("Failed to load liked songs", e);
    }
  }

  function refreshSavedAlbums() {
    setSavedAlbums(getSavedAlbums());
  }

  function handleRemoveAlbum(albumId) {
    userId = user?.id || "demo-user";
    removeSavedAlbum(albumId);
    refreshSavedAlbums();

    if (selectedAlbum?.id === albumId) {
      setSelectedAlbum(null);
      setSelectedAlbumTracks([]);
    }
  }

  async function handleCreatePlaylist() {
    const name = window.prompt("Enter a playlist name:");
    if (!name || !name.trim()) return;

    const coverInput = window.prompt(
      "Choose a cover type: vinyl, cassette, or cd",
      "vinyl"
    );

    const normalizedCover = String(coverInput || "vinyl")
      .trim()
      .toLowerCase();

    const coverType = ["vinyl", "cassette", "cd"].includes(normalizedCover)
      ? normalizedCover
      : "vinyl";

    try {
      setCreatingPlaylist(true);
      setPlaylistError("");

      const newPlaylist = await createPlaylist({
        name: name.trim(),
        userId: user?.id || "demo-user",
        coverType,
      });

      setPlaylists((prev) => [newPlaylist, ...prev]);
    } catch (e) {
      setPlaylistError(e?.message || "Failed to create playlist.");
    } finally {
      setCreatingPlaylist(false);
    }
  }

  async function handleOpenSavedAlbum(album) {
    try {
      setSelectedAlbumLoading(true);
      setAlbumError("");

      const localTracks = Array.isArray(album?.tracks) ? album.tracks : [];

      setSelectedAlbum({
        ...album,
        metadata: album.metadata || null,
      });

      if (localTracks.length > 0) {
        setSelectedAlbumTracks(localTracks);
        return;
      }

      const data = await getAlbum(album.id);

      setSelectedAlbum({
        ...(data?.album || album),
        metadata: album.metadata || null,
      });

      setSelectedAlbumTracks(Array.isArray(data?.items) ? data.items : []);

      if (!data?.items?.length) {
        setAlbumError("No tracks found for this album.");
      }
    } catch (e) {
      setAlbumError(e?.message || "Failed to open album.");
    } finally {
      setSelectedAlbumLoading(false);
    }
  }

  async function playAlbumTrack(track, idx) {
    try {
      if (!track) return;

      let playable = track;

      if (!track.videoId) {
        const resolved = await resolveTrack({
          spotifyTrackId: track.spotifyTrackId || null,
          title: track.title,
          artist: track.artist,
          artistId: track.artistId || null,
          album: track.album || selectedAlbum || null,
          thumbnail: track.album?.images?.[0]?.url || "",
          metadata: track.metadata || null,
        });

        playable = {
          ...track,
          videoId: resolved.videoId,
          channel: resolved.channel || track.artist || "",
          thumbnail: track.album?.images?.[0]?.url || resolved.thumbnail || "",
          metadata: resolved.metadata || track.metadata || null,
        };

        setSelectedAlbumTracks((prev) =>
          prev.map((t, i) => (i === idx ? playable : t))
        );
      }

      const queue = selectedAlbumTracks.map((t, i) => (i === idx ? playable : t));

      playTrack(playable, {
        queue,
        startIndex: idx,
      });
    } catch (e) {
      setAlbumError(e?.message || "Could not play track.");
    }
  }

  async function playEntireAlbum() {
    try {
      if (!selectedAlbumTracks.length) {
        setAlbumError("No tracks found.");
        return;
      }

      setAlbumError("");

      let firstTrack = selectedAlbumTracks[0];

      if (!firstTrack?.videoId) {
        const resolved = await resolveTrack({
          spotifyTrackId: firstTrack.spotifyTrackId || null,
          title: firstTrack.title,
          artist: firstTrack.artist,
          artistId: firstTrack.artistId || null,
          album: firstTrack.album || selectedAlbum || null,
          thumbnail: firstTrack.album?.images?.[0]?.url || "",
          metadata: firstTrack.metadata || null,
        });

        firstTrack = {
          ...firstTrack,
          videoId: resolved.videoId,
          channel: resolved.channel || firstTrack.artist || "",
          thumbnail: firstTrack.album?.images?.[0]?.url || resolved.thumbnail || "",
          metadata: resolved.metadata || firstTrack.metadata || null,
        };

        setSelectedAlbumTracks((prev) =>
          prev.map((t, i) => (i === 0 ? firstTrack : t))
        );
      }

      const queue = selectedAlbumTracks.map((t, i) => (i === 0 ? firstTrack : t));

      playTrack(firstTrack, {
        queue,
        startIndex: 0,
      });
    } catch (e) {
      setAlbumError(e?.message || "Failed to play album.");
    }
  }

  async function playPlaylistSong(song, idx) {
    try {
      if (!selectedPlaylist?.songs?.length) {
        setPlaylistError("No songs in this playlist.");
        return;
      }

      setPlaylistError("");

      let playable = song;

      if (!song.videoId) {
        const resolved = await resolveTrack({
          spotifyTrackId:
            song?.spotify?.trackId || song?.metadata?.spotifyTrackId || null,
          title: song.title,
          artist: song.artist,
          artistId: song?.spotify?.artistId || null,
          album: song?.spotify?.albumId
            ? {
                id: song.spotify.albumId,
                name: song.spotify.albumName || "",
                release_date: song.spotify.release_date || null,
                images: song.spotify.albumImages || [],
              }
            : null,
          thumbnail: song.thumbnail || "",
          metadata: song.metadata || null,
        });

        playable = {
          ...song,
          videoId: resolved.videoId,
          channel: resolved.channel || song.artist || "",
          thumbnail: song.thumbnail || resolved.thumbnail || "",
          metadata: resolved.metadata || song.metadata || null,
        };

        setSelectedPlaylist((prev) => {
          if (!prev) return prev;

          const nextSongs = prev.songs.map((s, i) =>
            i === idx ? playable : s
          );

          return {
            ...prev,
            songs: nextSongs,
          };
        });
      }

      const currentSongs = selectedPlaylist.songs || [];
      const queue = currentSongs.map((s, i) => (i === idx ? playable : s));

      playTrack(playable, {
        queue,
        startIndex: idx,
      });
    } catch (e) {
      setPlaylistError(e?.message || "Could not play playlist song.");
    }
  }

  async function playEntirePlaylist() {
    try {
      if (!selectedPlaylist?.songs?.length) {
        setPlaylistError("No songs in this playlist.");
        return;
      }

      setPlaylistError("");
      setPlaylistLoading(true);

      const firstSong = selectedPlaylist.songs[0];
      let playableFirst = firstSong;

      if (!firstSong.videoId) {
        const resolved = await resolveTrack({
          spotifyTrackId:
            firstSong?.spotify?.trackId ||
            firstSong?.metadata?.spotifyTrackId ||
            null,
          title: firstSong.title,
          artist: firstSong.artist,
          artistId: firstSong?.spotify?.artistId || null,
          album: firstSong?.spotify?.albumId
            ? {
                id: firstSong.spotify.albumId,
                name: firstSong.spotify.albumName || "",
                release_date: firstSong.spotify.release_date || null,
                images: firstSong.spotify.albumImages || [],
              }
            : null,
          thumbnail: firstSong.thumbnail || "",
          metadata: firstSong.metadata || null,
        });

        playableFirst = {
          ...firstSong,
          videoId: resolved.videoId,
          channel: resolved.channel || firstSong.artist || "",
          thumbnail: firstSong.thumbnail || resolved.thumbnail || "",
          metadata: resolved.metadata || firstSong.metadata || null,
        };

        setSelectedPlaylist((prev) => {
          if (!prev) return prev;

          const nextSongs = prev.songs.map((s, i) =>
            i === 0 ? playableFirst : s
          );

          return {
            ...prev,
            songs: nextSongs,
          };
        });
      }

      const queue = (selectedPlaylist.songs || []).map((s, i) =>
        i === 0 ? playableFirst : s
      );

      playTrack(playableFirst, {
        queue,
        startIndex: 0,
      });
    } catch (e) {
      setPlaylistError(e?.message || "Failed to play playlist.");
    } finally {
      setPlaylistLoading(false);
    }
  }

  async function shufflePlayPlaylist() {
    try {
      if (!selectedPlaylist?.songs?.length) {
        setPlaylistError("No songs in this playlist.");
        return;
      }

      setPlaylistError("");
      setPlaylistLoading(true);

      const shuffled = shuffleArray(selectedPlaylist.songs);
      if (!shuffled.length) {
        setPlaylistError("No songs in this playlist.");
        return;
      }

      let firstSong = shuffled[0];

      if (!firstSong.videoId) {
        const resolved = await resolveTrack({
          spotifyTrackId:
            firstSong?.spotify?.trackId ||
            firstSong?.metadata?.spotifyTrackId ||
            null,
          title: firstSong.title,
          artist: firstSong.artist,
          artistId: firstSong?.spotify?.artistId || null,
          album: firstSong?.spotify?.albumId
            ? {
                id: firstSong.spotify.albumId,
                name: firstSong.spotify.albumName || "",
                release_date: firstSong.spotify.release_date || null,
                images: firstSong.spotify.albumImages || [],
              }
            : null,
          thumbnail: firstSong.thumbnail || "",
          metadata: firstSong.metadata || null,
        });

        firstSong = {
          ...firstSong,
          videoId: resolved.videoId,
          channel: resolved.channel || firstSong.artist || "",
          thumbnail: firstSong.thumbnail || resolved.thumbnail || "",
          metadata: resolved.metadata || firstSong.metadata || null,
        };

        shuffled[0] = firstSong;
      }

      playTrack(firstSong, {
        queue: shuffled,
        startIndex: 0,
      });
    } catch (e) {
      setPlaylistError(e?.message || "Failed to shuffle playlist.");
    } finally {
      setPlaylistLoading(false);
    }
  }

  async function handleDeletePlaylistSong(songIndex) {
    try {
      if (!selectedPlaylist?._id) return;

      setPlaylistError("");

      const updated = await deleteSongFromPlaylist(selectedPlaylist._id, songIndex);

      setSelectedPlaylist(updated);
      setPlaylists((prev) =>
        prev.map((p) => (p._id === updated._id ? updated : p))
      );
    } catch (e) {
      setPlaylistError(e?.message || "Failed to delete song.");
    }
  }

  async function handleDeletePlaylist() {
    try {
      if (!selectedPlaylist?._id) return;

      const confirmed = window.confirm(
        `Delete playlist "${selectedPlaylist.name}"?`
      );
      if (!confirmed) return;

      setPlaylistError("");

      const deletedId = selectedPlaylist._id;
      await deletePlaylist(deletedId);

      setPlaylists((prev) => prev.filter((p) => p._id !== deletedId));
      setSelectedPlaylist(null);
    } catch (e) {
      setPlaylistError(e?.message || "Failed to delete playlist.");
    }
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setSelectedImage(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSaveProfilePicture = async () => {
    if (!selectedImage) return;
    setUploading(true);
    setProfileMessage("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/api/users/profile-picture", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ profilePicture: selectedImage }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not update profile picture");
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      setSelectedImage(null);
      setProfileMessage("Profile picture updated!");
    } catch (error) {
      setProfileMessage(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveBio = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/api/users/bio", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bio: bioInput }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not update bio");
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      setBioInput(data.user.bio || "");
      setProfileMessage("Bio updated!");
      setEditingBio(false);
    } catch (error) {
      setProfileMessage(error.message);
    }
  };  

  return (
    <div className="profile-layout">
      <div className="profile-left">
        <div className="profile-card panel">
          <img
            className="profile-pic"
            src={selectedImage || user?.profilePicture || defaultProfilePic}
            alt="profile"
          />

          <p className="welcome-back-text">
            Welcome back,{" "}
            <span className="profile-username-highlight">
              @{user?.username || "user"}
            </span>
          </p>

          <div className="profile-picture-actions">
            <label className="upload-pfp-btn">
              Change Picture
              <input type="file" accept="image/*" onChange={handleImageChange} hidden />
            </label>
            {selectedImage && (
              <button className="save-pfp-btn" onClick={handleSaveProfilePicture} disabled={uploading}>
                {uploading ? "Saving..." : "Save Picture"}
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
                <button className="save-bio-btn" onClick={handleSaveBio}>Save Bio</button>
                <button className="cancel-bio-btn" onClick={() => { setBioInput(user?.bio || ""); setEditingBio(false); }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="bio">{user?.bio || "No bio yet."}</p>
              <button className="edit-bio-btn" onClick={() => setEditingBio(true)}>Edit Bio</button>
            </>
          )}

          <Link to="/explore" className="explore-link">Explore Profiles</Link>
        </div>

        <div className="recently-added panel">
          <h3>Liked Songs</h3>
          <div className="recent-list">
            {likedSongs.length === 0 ? (
              <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>No liked songs yet ♡</p>
            ) : (
              likedSongs.slice(0, 8).map((song, idx) => (
                <div key={song.songId || idx} className="recent-item">
                  ✧ {song.title}
                  {song.artist && (
                    <span style={{ opacity: 0.6, fontSize: '0.8rem' }}> — {song.artist}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="profile-right panel">
        <div className="playlists-section">
          <div className="albums-top">
            <h3>Playlists</h3>

            <button
              type="button"
              className="ui-btn ui-btn--small"
              onClick={handleCreatePlaylist}
              disabled={creatingPlaylist}
            >
              {creatingPlaylist ? "Creating..." : "Create Playlist"}
            </button>
          </div>

          {playlistError && !selectedPlaylist && (
            <p style={{ marginBottom: "0.75rem", color: "#ff8080" }}>
              {playlistError}
            </p>
          )}

          {playlistLoading ? (
            <p>Loading playlists...</p>
          ) : playlists.length === 0 ? (
            <div className="playlist-empty">No playlists yet ♫</div>
          ) : (
            <>
              <div className="playlist-grid">
                {playlists.map((playlist) => {
                  const cover = getPlaylistCover(playlist.coverType);

                  return (
                    <div
                      key={playlist._id}
                      className={`playlist-card ${
                        selectedPlaylist?._id === playlist._id ? "is-selected" : ""
                      }`}
                      onClick={() => {
                        setSelectedPlaylist(playlist);
                        setPlaylistError("");
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setSelectedPlaylist(playlist);
                          setPlaylistError("");
                        }
                      }}
                    >
                      {cover ? (
                        <img
                          src={cover}
                          alt={playlist.coverType}
                          className="playlist-cover-img"
                        />
                      ) : (
                        <div className="playlist-cover-default">♫</div>
                      )}

                      <div className="playlist-card-title">{playlist.name}</div>

                      <div className="playlist-card-count">
                        {playlist.songs?.length || 0} songs
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedPlaylist && (
                <div className="panel selected-playlist-panel">
                  <div className="selected-playlist-header">
                    <div className="selected-playlist-info">
                      <h3>{selectedPlaylist.name}</h3>
                      <p className="selected-playlist-sub">
                        {(selectedPlaylist.coverType || "default").toUpperCase()} •{" "}
                        {selectedPlaylist.songs?.length || 0} songs
                      </p>
                    </div>

                    <div className="selected-playlist-actions">
                      <button
                        className="ui-btn"
                        onClick={playEntirePlaylist}
                        disabled={playlistLoading || !selectedPlaylist.songs?.length}
                      >
                        {playlistLoading ? "Loading..." : "Play Playlist"}
                      </button>

                      <button
                        className="ui-btn"
                        onClick={shufflePlayPlaylist}
                        disabled={playlistLoading || !selectedPlaylist.songs?.length}
                      >
                        Shuffle
                      </button>

                      <button
                        className="ui-btn ui-btn--danger"
                        onClick={handleDeletePlaylist}
                      >
                        Delete Playlist
                      </button>
                    </div>
                  </div>

                  {playlistError && (
                    <p style={{ marginTop: "0.75rem", color: "#ff8080" }}>
                      {playlistError}
                    </p>
                  )}

                  {!selectedPlaylist.songs?.length ? (
                    <p style={{ marginTop: "0.75rem" }}>
                      No songs in this playlist yet.
                    </p>
                  ) : (
                    <div className="playlist-tracklist">
                      {selectedPlaylist.songs.map((song, idx) => (
                        <div
                          key={
                            song.videoId ||
                            song.spotify?.trackId ||
                            `${song.title}-${idx}`
                          }
                          className="playlist-track-row"
                        >
                          <div
                            className="playlist-track-main"
                            onClick={() => playPlaylistSong(song, idx)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") playPlaylistSong(song, idx);
                            }}
                          >
                            {song.thumbnail ? (
                              <img
                                src={song.thumbnail}
                                alt={song.title}
                                className="playlist-track-thumb"
                              />
                            ) : (
                              <div className="playlist-track-thumb placeholder">♫</div>
                            )}

                            <div className="playlist-track-meta">
                              <div className="playlist-track-title">
                                {song.title}
                              </div>
                              <div className="playlist-track-artist">
                                {song.artist || "Unknown artist"}
                              </div>
                            </div>
                          </div>

                          <button
                            className="playlist-delete-song-btn"
                            type="button"
                            onClick={() => handleDeletePlaylistSong(idx)}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="albums-section">
          <div className="albums-top">
            <h3>Albums</h3>
          </div>

          <div className="album-grid">
            {savedAlbums.length === 0 ? (
              <div className="album-card">No saved albums yet 💿</div>
            ) : (
              savedAlbums.map((album) => (
                <div
                  key={album.id}
                  className="album-card"
                  onClick={() => handleOpenSavedAlbum(album)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleOpenSavedAlbum(album);
                  }}
                >
                  {album.images?.[0]?.url ? (
                    <img
                      src={album.images[0].url}
                      alt={album.name}
                      style={{
                        width: "72px",
                        height: "72px",
                        objectFit: "cover",
                        borderRadius: "10px",
                        marginBottom: "0.35rem",
                      }}
                    />
                  ) : (
                    <div style={{ marginBottom: "0.5rem" }}>💿</div>
                  )}

                  <div>{album.name}</div>

                  <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                    {album.artist}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "0.35rem",
                      flexWrap: "wrap",
                      marginTop: "0.35rem",
                      justifyContent: "center",
                    }}
                  >
                    {album.metadata?.era && (
                      <span className="meta-pill">{album.metadata.era}</span>
                    )}

                    {album.metadata?.styles?.[0] && (
                      <span className="meta-pill">{album.metadata.styles[0]}</span>
                    )}

                    {!album.metadata?.styles?.[0] &&
                      album.metadata?.genres?.[0] && (
                        <span className="meta-pill">{album.metadata.genres[0]}</span>
                      )}

                    {album.metadata?.styles?.[0] &&
                      album.metadata?.genres?.[0] && (
                        <span className="meta-pill meta-pill--subtle">
                          {album.metadata.genres[0]}
                        </span>
                      )}
                  </div>

                  <button
                    style={{ marginTop: "0.5rem" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveAlbum(album.id);
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {selectedAlbum && (
          <div className="panel selected-album-panel">
            <div className="selected-album-header">
              <div className="selected-album-info">
                <h3>{selectedAlbum.name}</h3>

                <div className="selected-album-tags">
                  {selectedAlbum.metadata?.era && (
                    <span className="meta-pill">{selectedAlbum.metadata.era}</span>
                  )}

                  {selectedAlbum.metadata?.styles?.[0] && (
                    <span className="meta-pill">
                      {selectedAlbum.metadata.styles[0]}
                    </span>
                  )}

                  {!selectedAlbum.metadata?.styles?.[0] &&
                    selectedAlbum.metadata?.genres?.[0] && (
                      <span className="meta-pill">
                        {selectedAlbum.metadata.genres[0]}
                      </span>
                    )}

                  {selectedAlbum.metadata?.styles?.[0] &&
                    selectedAlbum.metadata?.genres?.[0] && (
                      <span className="meta-pill meta-pill--subtle">
                        {selectedAlbum.metadata.genres[0]}
                      </span>
                    )}
                </div>
              </div>

              <button
                className="ui-btn"
                onClick={playEntireAlbum}
                disabled={selectedAlbumLoading || !selectedAlbumTracks.length}
              >
                Play Album
              </button>
            </div>

            {albumError && (
              <p style={{ marginTop: "0.75rem", color: "#ff8080" }}>
                {albumError}
              </p>
            )}

            {selectedAlbumLoading ? (
              <p style={{ marginTop: "0.75rem" }}>Loading tracklist...</p>
            ) : selectedAlbumTracks.length === 0 ? (
              <p style={{ marginTop: "0.75rem" }}>No tracks found.</p>
            ) : (
              <div className="album-tracklist">
                {selectedAlbumTracks.map((track, idx) => (
                  <div
                    key={track.spotifyTrackId || `${track.title}-${idx}`}
                    onClick={() => playAlbumTrack(track, idx)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") playAlbumTrack(track, idx);
                    }}
                    className="album-track-row"
                  >
                    ♫ {track.title}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;