'use client';

import { useState } from 'react';

export default function SimpleAudioTest() {
  const [playing, setPlaying] = useState<Record<string, boolean>>({});

  const sounds = [
    { id: 'rain', name: '雨声', path: '/sounds/rain-on-leaves.ogg' },
    { id: 'temple', name: '钟声', path: '/sounds/temple-bell.wav' },
    { id: 'fire', name: '火声', path: '/sounds/campfire.wav' },
    { id: 'snow', name: '雪声', path: '/sounds/snow-steps.wav' },
  ];

  const handlePlay = (id: string) => {
    const audio = document.getElementById(`audio-${id}`) as HTMLAudioElement;
    if (audio) {
      if (audio.paused) {
        audio.play();
        setPlaying({ ...playing, [id]: true });
      } else {
        audio.pause();
        setPlaying({ ...playing, [id]: false });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6">简单音频测试</h1>

        <div className="grid grid-cols-2 gap-4">
          {sounds.map((sound) => (
            <div key={sound.id} className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">{sound.name}</h3>
              <audio
                id={`audio-${sound.id}`}
                src={sound.path}
                loop
                preload="metadata"
                onError={(e) => console.error(`${sound.name} 加载失败:`, e)}
                onLoadedData={() => console.log(`${sound.name} 加载成功`)}
              />
              <button
                onClick={() => handlePlay(sound.id)}
                className={`w-full px-4 py-2 rounded ${
                  playing[sound.id]
                    ? 'bg-red-500 text-white'
                    : 'bg-blue-500 text-white'
                }`}
              >
                {playing[sound.id] ? '暂停' : '播放'}
              </button>
              <p className="text-xs text-gray-500 mt-2">{sound.path}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
