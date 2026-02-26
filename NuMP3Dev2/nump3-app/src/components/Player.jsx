import "./Player.css";
import { useEffect, useRef, useState } from "react";
import { usePlayer } from "../player/PlayerContext";

function fmt(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function Player() {
  const {
    ready,
    nowPlaying,
    isPlaying,
    pauseTrack,
    resumeTrack,
    previousTrack,
    skipTrack,
    canSkipPrev,
    canSkipNext,

    setVolume,
    getVolume,
    seekTo,
    getCurrentTime,
    getDuration,
  } = usePlayer();

  // start at 50 (UI) and also set YouTube to 50 once ready
  const [volume, setVolumeUI] = useState(50);
  const didInitVol = useRef(false);

  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);

  const [scrubbing, setScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);

  function handlePlayPause() {
    if (!ready || !nowPlaying) return;
    if (isPlaying) pauseTrack();
    else resumeTrack();
  }

  // init volume when ready (only once)
  useEffect(() => {
    if (!ready) return;

    if (!didInitVol.current) {
      didInitVol.current = true;
      setVolumeUI(50);
      if (typeof setVolume === "function") setVolume(50);
      return;
    }

    // optional: keep UI synced with player volume
    const v = typeof getVolume === "function" ? getVolume() : 50;
    setVolumeUI(Number.isFinite(v) ? v : 50);
  }, [ready, setVolume, getVolume]);

  // poll time/duration
  useEffect(() => {
    if (!ready || !nowPlaying) {
      setCur(0);
      setDur(0);
      setScrubbing(false);
      setScrubValue(0);
      return;
    }

    const tick = () => {
      const d = typeof getDuration === "function" ? getDuration() : 0;
      const c = typeof getCurrentTime === "function" ? getCurrentTime() : 0;

      setDur(Number.isFinite(d) ? d : 0);
      if (!scrubbing) setCur(Number.isFinite(c) ? c : 0);
    };

    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [ready, nowPlaying, getCurrentTime, getDuration, scrubbing]);

  const canScrub = ready && !!nowPlaying && dur > 0;
  const shownCur = scrubbing ? scrubValue : cur;

  function beginScrub() {
    if (!canScrub) return;
    setScrubbing(true);
    setScrubValue(cur);
  }

  function updateScrub(val) {
    if (!canScrub) return;
    const v = Number(val);
    setScrubValue(Number.isFinite(v) ? v : 0);
  }

  function endScrub(val) {
    if (!canScrub) return;
    const v = Number(val);
    const finalValue = Number.isFinite(v) ? v : scrubValue;

    setScrubbing(false);
    setCur(finalValue);
    if (typeof seekTo === "function") seekTo(finalValue);
  }

  return (
    <div className="player">
      <div className="display">
        <span>{nowPlaying ? (isPlaying ? "PLAY" : "PAUSE") : "--:--"}</span>
        <span>YT • STEREO</span>
      </div>

      <div className="track">
        <span className="track-scroll">
          {nowPlaying
            ? (nowPlaying.title ?? nowPlaying.channel ?? "UNKNOWN").toUpperCase()
            : "NO TRACK SELECTED"}
        </span>
      </div>

      {/* PROGRESS */}
      <div className="progress">
        <span className="time">{fmt(shownCur)}</span>

        <input
          className="progress-slider"
          type="range"
          min={0}
          max={dur || 0}
          step={0.25}
          value={shownCur}
          disabled={!canScrub}
          onPointerDown={(e) => {
            beginScrub();
            updateScrub(e.currentTarget.value);
          }}
          onPointerUp={(e) => {
            endScrub(e.currentTarget.value);
          }}
          onChange={(e) => {
            if (scrubbing) updateScrub(e.target.value);
            else endScrub(e.target.value); // click-to-seek
          }}
        />

        <span className="time">{fmt(dur)}</span>
      </div>

      {/* CONTROLS */}
      <div className="controls">
        <button onClick={previousTrack} disabled={!canSkipPrev}>
          ⏮
        </button>

        <button onClick={handlePlayPause} disabled={!ready || !nowPlaying}>
          {isPlaying ? "⏸" : "▶"}
        </button>

        <button onClick={skipTrack} disabled={!canSkipNext}>
          ⏭
        </button>
      </div>

      {/* VOLUME */}
      <div className="volume">
        <span className="vol-label">VOL</span>

        <input
          className="volume-slider"
          type="range"
          min={0}
          max={100}
          step={1}
          value={volume}
          disabled={!ready}
          onChange={(e) => {
            const v = Number(e.target.value);
            setVolumeUI(v);
            if (typeof setVolume === "function") setVolume(v);
          }}
        />

        <span className="vol-value">{Math.round(volume)}</span>
      </div>
    </div>
  );
}

export default Player;