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

export function useYouTubePlayer({ onEnded, onError } = {}) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const pendingVideoIdRef = useRef(null);
  const isPlayerReadyRef = useRef(false);

  const onEndedRef = useRef(onEnded);
  const onErrorRef = useRef(onError);
  const DEFAULT_VOLUME = 50;

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await loadYouTubeIframeAPI();
      if (cancelled || !containerRef.current) return;

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
          onReady: () => {
            if (cancelled) return;

            isPlayerReadyRef.current = true;
            try {
              playerRef.current?.setVolume?.(DEFAULT_VOLUME);
            } catch {}

            setReady(true);

            if (pendingVideoIdRef.current) {
              try {
                playerRef.current?.loadVideoById?.(pendingVideoIdRef.current);
              } catch (err) {
                console.error("Failed to load pending YouTube video:", err);
              }
              pendingVideoIdRef.current = null;
            }
          },

          onStateChange: (e) => {
            if (e?.data === window.YT?.PlayerState?.ENDED) {
              onEndedRef.current?.();
            }
          },

          onError: (e) => {
            console.error("YouTube player error:", e?.data);
            onErrorRef.current?.(e?.data);
          },
        },
      });
    })();

    return () => {
      cancelled = true;
      isPlayerReadyRef.current = false;
      pendingVideoIdRef.current = null;

      try {
        playerRef.current?.destroy?.();
      } catch {}

      playerRef.current = null;
      setReady(false);
    };
  }, []);

  const play = useCallback((videoId) => {
    if (!videoId) return;

    if (!isPlayerReadyRef.current || !playerRef.current) {
      pendingVideoIdRef.current = videoId;
      return;
    }

    try {
      playerRef.current.setVolume(DEFAULT_VOLUME);
      playerRef.current.loadVideoById(videoId);
    } catch (err) {
      console.error("YouTube loadVideoById failed:", err);
    }
  }, []);

  const pause = useCallback(() => {
    try {
      playerRef.current?.pauseVideo?.();
    } catch {}
  }, []);

  const resume = useCallback(() => {
    try {
      playerRef.current?.playVideo?.();
    } catch {}
  }, []);

  const setVolume = useCallback((vol0to100) => {
    const v = Math.max(0, Math.min(100, Number(vol0to100)));
    try {
      playerRef.current?.setVolume?.(v);
    } catch {}
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
    try {
      playerRef.current?.seekTo?.(s, true);
    } catch {}
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