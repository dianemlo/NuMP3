import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAlbum, resolveTrack } from "../lib/youtubeApi";
import { usePlayer } from "../player/PlayerContext";
import { getSavedAlbums, removeSavedAlbum } from "../lib/localAlbums";
import "./Profile.css";

function Profile() {
  const { playTrack } = usePlayer();

  const [savedAlbums, setSavedAlbums] = useState([]);
  const [albumError, setAlbumError] = useState("");

  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [selectedAlbumTracks, setSelectedAlbumTracks] = useState([]);
  const [selectedAlbumLoading, setSelectedAlbumLoading] = useState(false);

  useEffect(() => {
    setSavedAlbums(getSavedAlbums());
  }, []);

  function refreshSavedAlbums() {
    setSavedAlbums(getSavedAlbums());
  }

  function handleRemoveAlbum(albumId) {
    removeSavedAlbum(albumId);
    refreshSavedAlbums();

    if (selectedAlbum?.id === albumId) {
      setSelectedAlbum(null);
      setSelectedAlbumTracks([]);
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

  return (
    <div className="profile-layout">
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

      <div className="profile-right panel">
        <div className="albums-top">
          <h3>Albums</h3>

          <Link to="/create-playlist" className="create-playlist-link">
            Create Playlist
          </Link>
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

                <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginTop: "0.35rem", justifyContent: "center" }}>
                  {album.metadata?.era && (
                    <span className="meta-pill">{album.metadata.era}</span>
                  )}

                  {album.metadata?.styles?.[0] && (
                    <span className="meta-pill">{album.metadata.styles[0]}</span>
                  )}

                  {!album.metadata?.styles?.[0] && album.metadata?.genres?.[0] && (
                    <span className="meta-pill">{album.metadata.genres[0]}</span>
                  )}

                  {album.metadata?.styles?.[0] && album.metadata?.genres?.[0] && (
                    <span className="meta-pill meta-pill--subtle">{album.metadata.genres[0]}</span>
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
                    <span className="meta-pill">{selectedAlbum.metadata.styles[0]}</span>
                  )}

                  {!selectedAlbum.metadata?.styles?.[0] && selectedAlbum.metadata?.genres?.[0] && (
                    <span className="meta-pill">{selectedAlbum.metadata.genres[0]}</span>
                  )}

                  {selectedAlbum.metadata?.styles?.[0] && selectedAlbum.metadata?.genres?.[0] && (
                    <span className="meta-pill meta-pill--subtle">{selectedAlbum.metadata.genres[0]}</span>
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