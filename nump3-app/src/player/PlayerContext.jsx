import { createContext, useContext, useMemo, useRef, useEffect, useState, useCallback, } from "react";
import { useYouTubePlayer } from "../hooks/useYouTubePlayer";

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const [nowPlaying, setNowPlaying] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false); 

  // Add this ref near the top of PlayerProvider
  const nowPlayingRef = useRef(null);
  const candidateIndexRef = useRef(0);

  // Keep nowPlayingRef in sync
  useEffect(() => {
    nowPlayingRef.current = nowPlaying;
  }, [nowPlaying]);


  const skipRef = useRef(() => {});
  const { containerRef, ready, play, pause, resume, setVolume, getVolume, seekTo, getCurrentTime, getDuration } =
    useYouTubePlayer({
      onEnded: () => skipRef.current(),
      onError: (code) => {
        console.warn("YouTube Player Error code:", code);

        // 101/150 = embedding disabled (licensing)
        // 100 = video not found/private
        // Try next candidate if available
        if (code === 101 || code === 150 || code === 100 || code === 2) {
          const track = nowPlayingRef.current;
          const candidates = track?.ytCandidates || [];
          const nextIdx = candidateIndexRef.current + 1;

          if (nextIdx < candidates.length) {
            console.log(`Trying candidate ${nextIdx}:`, candidates[nextIdx].videoId);
            candidateIndexRef.current = nextIdx;
            play(candidates[nextIdx].videoId);
            return; // don't stop playback
          }
        }

        // No more candidates — give up
        setIsPlaying(false);
        candidateIndexRef.current = 0;
      }
    });

  const playTrack = useCallback(
    (track, opts = {}) => {
      if (!track?.videoId) return;

      candidateIndexRef.current = 0;

      if (Array.isArray(opts.queue)) {
        const nextQueue = opts.queue.filter((t) => t?.videoId);
        const idx =
          typeof opts.startIndex === "number"
            ? Math.min(Math.max(opts.startIndex, 0), Math.max(nextQueue.length - 1, 0))
            : nextQueue.findIndex((t) => t?.videoId === track.videoId);

        setQueue(nextQueue);
        setCurrentIndex(idx >= 0 ? idx : 0);
      } else {
        const idx = queue.findIndex((t) => t?.videoId === track.videoId);
        if (idx !== -1) {
          setCurrentIndex(idx);
        } else {
          setQueue([track]);
          setCurrentIndex(0);
        }
      }

      setNowPlaying(track);
      play(track.videoId);
      setIsPlaying(true);
    },
    [play, queue]
  );

  const setQueueAndPlay = useCallback(
    (nextQueue, startIndex = 0) => {
      const q = Array.isArray(nextQueue)
        ? nextQueue.filter((t) => t?.videoId)
        : [];
      if (!q.length) return;

      const idx = Math.min(Math.max(Number(startIndex) || 0, 0), q.length - 1);

      setQueue(q);
      setCurrentIndex(idx);

      const track = q[idx];
      setNowPlaying(track);
      play(track.videoId);
      setIsPlaying(true);
    },
    [play]
  );

  const queueTracks = useCallback(
    (tracks, { playImmediately = false } = {}) => {
      const add = Array.isArray(tracks) ? tracks.filter((t) => t?.videoId) : [];
      if (!add.length) return;

      setQueue((prev) => {
        const prevArr = Array.isArray(prev)
          ? prev.filter((t) => t?.videoId)
          : [];

        const merged = [...prevArr, ...add];

        if (playImmediately && merged.length) {
          const startIndex = prevArr.length;
          setCurrentIndex(startIndex);
          const track = merged[startIndex];
          setNowPlaying(track);
          play(track.videoId);
          setIsPlaying(true);
        }

        return merged;
      });
    },
    [play]
  );

  const pauseTrack = useCallback(() => {
    pause();
    setIsPlaying(false);
  }, [pause]);

  const resumeTrack = useCallback(() => {
    resume();
    setIsPlaying(true);
  }, [resume]);

  const skipTrack = useCallback(() => {
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
  }, [queue, currentIndex, play]);

  const previousTrack = useCallback(() => {
    if (!queue.length) return;

    const prevIndex = currentIndex - 1;
    if (prevIndex < 0) return;

    const prev = queue[prevIndex];
    setCurrentIndex(prevIndex);
    setNowPlaying(prev);
    play(prev.videoId);
    setIsPlaying(true);
  }, [queue, currentIndex, play]);

  useEffect(() => {
    skipRef.current = skipTrack;
  }, [skipTrack]);

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

      // album-friendly helpers
      setQueueAndPlay,
      queueTracks,

      // player controls
      setVolume,
      getVolume,
      seekTo,
      getCurrentTime,
      getDuration,
    }),
    [
      ready,
      nowPlaying,
      isPlaying,
      playTrack,
      pauseTrack,
      resumeTrack,
      queue,
      currentIndex,
      skipTrack,
      previousTrack,
      canSkipNext,
      canSkipPrev,
      setQueueAndPlay,
      queueTracks,
      setVolume,
      getVolume,
      seekTo,
      getCurrentTime,
      getDuration,
    ]
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