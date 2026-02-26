import { createContext, useContext, useMemo, useRef, useEffect, useState } from "react";
import { useYouTubePlayer } from "../hooks/useYouTubePlayer";

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const [nowPlaying, setNowPlaying] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  function playTrack(track, opts = {}) {
    if (!track?.videoId) return;

    if (Array.isArray(opts.queue)) {
      const nextQueue = opts.queue;
      const idx =
        typeof opts.startIndex === "number"
          ? opts.startIndex
          : nextQueue.findIndex((t) => t?.videoId === track.videoId);

      setQueue(nextQueue);
      setCurrentIndex(idx >= 0 ? idx : 0);
    } else {
      const idx = queue.findIndex((t) => t?.videoId === track.videoId);
      if (idx !== -1) setCurrentIndex(idx);
    }

    setNowPlaying(track);
    play(track.videoId);
    setIsPlaying(true);
  }

  function pauseTrack() {
    pause();
    setIsPlaying(false);
  }

  function resumeTrack() {
    resume();
    setIsPlaying(true);
  }

  function skipTrack() {
    if (!queue.length) return;

    if (currentIndex === -1) {
      const first = queue[0];
      setCurrentIndex(0);
      setNowPlaying(first);
      play(first.videoId);
      setIsPlaying(true);
      return;
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex >= queue.length) return;

    const next = queue[nextIndex];
    setCurrentIndex(nextIndex);
    setNowPlaying(next);
    play(next.videoId);
    setIsPlaying(true);
  }

  function previousTrack() {
    if (!queue.length) return;
    const prevIndex = currentIndex - 1;
    if (prevIndex < 0) return;

    const prev = queue[prevIndex];
    setCurrentIndex(prevIndex);
    setNowPlaying(prev);
    play(prev.videoId);
    setIsPlaying(true);
  }

  const skipRef = useRef(() => {});
  useEffect(() => {
    skipRef.current = skipTrack;
  }, [queue, currentIndex]);

  const { containerRef, ready, play, pause, resume, setVolume, getVolume, seekTo, getCurrentTime, getDuration, } = useYouTubePlayer({
    onEnded: () => skipRef.current(),
  });

  const canSkipPrev = ready && queue.length > 0 && currentIndex > 0;
  const canSkipNext =
    ready &&
    queue.length > 0 &&
    (currentIndex === -1 || currentIndex < queue.length - 1);

  const value = useMemo(
    () => ({
      ready,
      nowPlaying,
      isPlaying,
      playTrack,
      pauseTrack,
      resumeTrack,

      // queue API
      queue,
      setQueue,
      currentIndex,
      setCurrentIndex,
      skipTrack,
      previousTrack,
      canSkipNext,
      canSkipPrev,

      setVolume,
      getVolume,
      seekTo,
      getCurrentTime,
      getDuration,
    }),
    [ready, nowPlaying, isPlaying, queue, currentIndex, setVolume, getVolume, seekTo, getCurrentTime, getDuration,]
  );

  return (
    <PlayerContext.Provider value={value}>
      <div ref={containerRef} style={{ display: "none" }} />
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used inside PlayerProvider");
  return ctx;
}