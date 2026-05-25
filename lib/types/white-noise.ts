// 白噪音类型定义

export type WhiteNoiseType =
  | 'river'
  | 'rain'
  | 'fire'
  | 'wind'
  | 'cafe'
  | 'forest'
  | 'waterfall'
  | 'snow';

export interface WhiteNoiseSource {
  type: WhiteNoiseType;
  name: string;
  icon: string;
  url: string;
}

export interface WhiteNoiseMix {
  id: string;
  name: string;
  sources: {
    type: WhiteNoiseType;
    volume: number; // 0-100
  }[];
}

export const WHITE_NOISE_SOURCES: WhiteNoiseSource[] = [
  {
    type: 'river',
    name: '河流',
    icon: '🌊',
    url: '/audio/white-noise/river.mp3',
  },
  {
    type: 'rain',
    name: '雨声',
    icon: '🌧️',
    url: '/audio/white-noise/rain.mp3',
  },
  {
    type: 'fire',
    name: '篝火',
    icon: '🔥',
    url: '/audio/white-noise/fire.mp3',
  },
  {
    type: 'wind',
    name: '风声',
    icon: '💨',
    url: '/audio/white-noise/wind.mp3',
  },
  {
    type: 'cafe',
    name: '咖啡馆',
    icon: '☕',
    url: '/audio/white-noise/cafe.mp3',
  },
  {
    type: 'forest',
    name: '森林',
    icon: '🌲',
    url: '/audio/white-noise/forest.mp3',
  },
  {
    type: 'waterfall',
    name: '瀑布',
    icon: '💧',
    url: '/audio/white-noise/waterfall.mp3',
  },
  {
    type: 'snow',
    name: '雪地',
    icon: '❄️',
    url: '/audio/white-noise/snow.mp3',
  },
];
