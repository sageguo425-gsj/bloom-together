export interface WhiteNoise {
  id: string;
  name: string;
  icon: string;
  audioPath: string;
  color: string;
}

export interface WhiteNoiseMix {
  id: string;
  name: string;
  sounds: {
    soundId: string;
    volume: number;
  }[];
  created_at: string;
}

export const WHITE_NOISES: WhiteNoise[] = [
  {
    id: 'rain',
    name: '雨打树叶',
    icon: '🌧️',
    audioPath: '/sounds/rain-on-leaves.ogg',
    color: 'from-blue-500 to-cyan-600',
  },
  {
    id: 'temple',
    name: '寺庙钟声',
    icon: '🔔',
    audioPath: '/sounds/temple-bell.wav',
    color: 'from-amber-500 to-orange-600',
  },
  {
    id: 'fire',
    name: '篝火声',
    icon: '🔥',
    audioPath: '/sounds/campfire.wav',
    color: 'from-red-500 to-orange-600',
  },
  {
    id: 'snow',
    name: '踩雪声',
    icon: '❄️',
    audioPath: '/sounds/snow-steps.wav',
    color: 'from-slate-400 to-blue-500',
  },
];
