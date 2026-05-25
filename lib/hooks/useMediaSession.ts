import { useEffect } from 'react';

interface MediaSessionConfig {
  title: string;
  artist?: string;
  album?: string;
  artwork?: { src: string; sizes: string; type: string }[];
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
}

export function useMediaSession(config: MediaSessionConfig) {
  useEffect(() => {
    if (!('mediaSession' in navigator)) {
      console.warn('Media Session API 不支持');
      return;
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: config.title,
      artist: config.artist || 'Bloom Together',
      album: config.album || '番茄钟',
      artwork: config.artwork || [
        {
          src: '/icon-96.png',
          sizes: '96x96',
          type: 'image/png',
        },
        {
          src: '/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
    });

    const actionHandlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', config.onPlay || (() => {})],
      ['pause', config.onPause || (() => {})],
      ['stop', config.onStop || (() => {})],
    ];

    actionHandlers.forEach(([action, handler]) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch (error) {
        console.warn(`不支持 ${action} 操作:`, error);
      }
    });

    return () => {
      actionHandlers.forEach(([action]) => {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch (error) {
          console.warn(`清除 ${action} 操作失败:`, error);
        }
      });
    };
  }, [config.title, config.artist, config.album, config.onPlay, config.onPause, config.onStop]);

  const updatePlaybackState = (state: MediaSessionPlaybackState) => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = state;
    }
  };

  return { updatePlaybackState };
}
