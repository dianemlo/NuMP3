import { useEffect, useRef, useState, useCallback } from "react";

function loadYouTubeIframeAPI() {
  return new Promise((resolve) => {
    if (window.YT?.Player) return resolve();

    const existing = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]'
    );
    if (existing) {
      const timer = setInterval(() => {
        if (window.YT?.Player) {
          clearInterval(timer);
          resolve();
        }
      }, 50);
      return;
    }

    window.onYouTubeIframeAPIReady = () => resolve();

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
}

export function useYouTubePlayer({ onEnded } = {}) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);

  const onEndedRef = useRef(onEnded);
  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await loadYouTubeIframeAPI();
      if (cancelled) return;

      playerRef.current = new window.YT.Player(containerRef.current, {
        height: "0",
        width: "0",
        videoId: "",
        playerVars: {
          autoplay: 1,
          controls: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: () => setReady(true),
          onStateChange: (e) => {
            if (e?.data === window.YT?.PlayerState?.ENDED) {
              onEndedRef.current?.();
            }
          },
        },
      });
    })();

    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy?.();
      } catch {}
      playerRef.current = null;
      setReady(false);
    };
  }, []);

  const play = useCallback((videoId) => {
    if (!videoId) return;
    playerRef.current?.loadVideoById?.(videoId);
  }, []);

  const pause = useCallback(() => playerRef.current?.pauseVideo?.(), []);
  const resume = useCallback(() => playerRef.current?.playVideo?.(), []);

  // --- NEW: volume + time + seek
  const setVolume = useCallback((vol0to100) => {
    const v = Math.max(0, Math.min(100, Number(vol0to100)));
    playerRef.current?.setVolume?.(v);
  }, []);

  const getVolume = useCallback(() => {
    try {
      return playerRef.current?.getVolume?.() ?? 0;
    } catch {
      return 0;
    }
  }, []);

  const seekTo = useCallback((seconds) => {
    const s = Math.max(0, Number(seconds) || 0);
    // allowSeekAhead=true
    playerRef.current?.seekTo?.(s, true);
  }, []);

  const getCurrentTime = useCallback(() => {
    try {
      return playerRef.current?.getCurrentTime?.() ?? 0;
    } catch {
      return 0;
    }
  }, []);

  const getDuration = useCallback(() => {
    try {
      return playerRef.current?.getDuration?.() ?? 0;
    } catch {
      return 0;
    }
  }, []);
  // --- end new

  return {
    containerRef,
    ready,
    play,
    pause,
    resume,
    setVolume,
    getVolume,
    seekTo,
    getCurrentTime,
    getDuration,
  };
}