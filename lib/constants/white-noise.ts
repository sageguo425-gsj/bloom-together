// 白噪音配置
export interface WhiteNoise {
  id: string;
  name: string;
  icon: string;
  audioUrl: string;
  category: 'nature' | 'environment' | 'music';
}

export const WHITE_NOISES: WhiteNoise[] = [
  {
    id: 'river',
    name: '河流',
    icon: '🌊',
    audioUrl: '/sounds/river.mp3',
    category: 'nature'
  },
  {
    id: 'rain',
    name: '雨声',
    icon: '🌧️',
    audioUrl: '/sounds/rain.mp3',
    category: 'nature'
  },
  {
    id: 'campfire',
    name: '篝火',
    icon: '🔥',
    audioUrl: '/sounds/campfire.mp3',
    category: 'environment'
  },
  {
    id: 'wind',
    name: '风声',
    icon: '💨',
    audioUrl: '/sounds/wind.mp3',
    category: 'nature'
  },
  {
    id: 'cafe',
    name: '咖啡馆',
    icon: '☕',
    audioUrl: '/sounds/cafe.mp3',
    category: 'environment'
  },
  {
    id: 'forest',
    name: '森林',
    icon: '🌲',
    audioUrl: '/sounds/forest.mp3',
    category: 'nature'
  },
  {
    id: 'waterfall',
    name: '瀑布',
    icon: '💧',
    audioUrl: '/sounds/waterfall.mp3',
    category: 'nature'
  },
  {
    id: 'snow',
    name: '雪地',
    icon: '❄️',
    audioUrl: '/sounds/snow.mp3',
    category: 'nature'
  }
];
