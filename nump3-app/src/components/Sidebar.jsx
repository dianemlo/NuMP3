import { useState } from "react";
import "./Sidebar.css";

const GENRES = [
  "rock", "alternative rock", "new wave", "pop", "hip hop",
  "electronic", "house", "techno", "ambient", "jazz",
  "funk", "soul", "r&b", "metal", "punk", "folk",
  "country", "blues", "classical", "latin", "reggae",
];

const DECADES = [
  { label: "40s", value: "40s" },
  { label: "50s", value: "50s" },
  { label: "60s", value: "60s" },
  { label: "70s", value: "70s" },
  { label: "80s", value: "80s" },
  { label: "90s", value: "90s" },
  { label: "00s", value: "00s" },
  { label: "10s", value: "10s" },
  { label: "20s", value: "20s" },
];

function Sidebar({ onGenerate, generatedTracks = [], onAddToPlaylist, onSavePlaylist, onReset }) {
  const [formOpen, setFormOpen] = useState(true);
  const [genre, setGenre] = useState("pop");
  const [decade, setDecade] = useState("00s");
  const [trackCount, setTrackCount] = useState(12);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [playlistName, setPlaylistName] = useState("");
  const [resultsOpen, setResultsOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  async function handleGenerate() {
    if (!onGenerate) return;
    setError("");
    setSaveSuccess(false);
    setLoading(true);
    try {
      const data = await onGenerate({ genre, decade, limit: trackCount });
      if (data?.tracks?.length) {
        setPlaylistName(`${decade} ${genre}`);
        setResultsOpen(true);
        setFormOpen(false);
      } else {
        setError("No tracks found for that combination.");
      }
    } catch (e) {
      setError(e?.message || "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!onSavePlaylist || !generatedTracks.length) return;
    setSaving(true);
    try {
      await onSavePlaylist({ name: playlistName, tracks: generatedTracks });
      setSaveSuccess(true);
    } catch (e) {
      setError(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <aside className="sidebar">

      {/* ── Generate form ── */}
      <div className="sidebar-generate">
        <div
          className="sidebar-section-header"
        >
          <p className="sidebar-section-title">GENERATE PLAYLIST</p>
          <span className="sidebar-collapse-icon">{formOpen ? "▲" : "▼"}</span>
        </div>

        {formOpen && (
          <div className="generate-form">
            <label>
              Genre
              <select value={genre} onChange={(e) => setGenre(e.target.value)}>
                {GENRES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </label>

            <label>
              Decade
              <select value={decade} onChange={(e) => setDecade(e.target.value)}>
                {DECADES.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </label>

            <label>
              Tracks — {trackCount}
              <input
                type="range"
                min={5}
                max={10}
                step={1}
                value={trackCount}
                onChange={(e) => setTrackCount(Number(e.target.value))}
                className="track-count-slider"
              />
            </label>

            {error && <p className="generate-error">{error}</p>}

            <button
              className="generate-submit"
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? "Generating..." : "Generate"}
            </button>
          </div>
        )}
      </div>

      {/* ── Generated playlist container ── */}
      {generatedTracks.length > 0 && (
        <div className="generated-playlist">

          {/* header — collapsable */}
          <div
            className="generated-playlist-header"
            onClick={() => setResultsOpen((v) => !v)}
          >
            <div className="generated-playlist-header-text">
              <span className="generated-playlist-count">
                {generatedTracks.length} tracks
              </span>
            </div>
            <span className="sidebar-collapse-icon">{resultsOpen ? "▲" : "▼"}</span>
          </div>

          {/* editable name */}
          <input
            className="generated-playlist-name"
            value={playlistName}
            onChange={(e) => setPlaylistName(e.target.value)}
            placeholder="Playlist name..."
          />

          {/* track list */}
          {resultsOpen && (
            <div className="generated-results">
              {generatedTracks.map((track, idx) => (
                <div
                  key={track.spotifyTrackId || idx}
                  className="generated-track"
                  onClick={() => onPlayAll?.(generatedTracks, idx)}
                >
                  {track.thumbnail ? (
                    <img
                      className="generated-track-thumb"
                      src={track.thumbnail}
                      alt=""
                    />
                  ) : (
                    <div className="generated-track-thumb--placeholder">🎵</div>
                  )}

                  <div className="generated-track-info">
                    <div className="generated-track-title">{track.title}</div>
                    <div className="generated-track-artist">{track.artist}</div>
                  </div>

                  <button
                    className="generated-track-add"
                    title="Add to playlist"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToPlaylist?.(track);
                    }}
                  >
                    +
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* actions */}
          <div className="generated-actions">
            <button
              className="generated-save-btn"
              onClick={handleSave}
              disabled={saving || saveSuccess}
            >
              {saveSuccess ? "✓ Saved" : saving ? "Saving..." : `💾 Save(${generatedTracks.filter(t => t.videoId).length}/${generatedTracks.length})`}
            </button>

            <button
              className="generated-reset-btn"
              onClick={() => {
                setFormOpen(true)
                setSaveSuccess(false)
                setError("")
                onReset?.()
              }}
            >
              ↩ Reset
            </button>
          </div>

        </div>
      )}

    </aside>
  );
}

export default Sidebar;