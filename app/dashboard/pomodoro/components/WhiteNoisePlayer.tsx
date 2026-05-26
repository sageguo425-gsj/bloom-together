'use client';

import { useEffect, useState } from 'react';
import { usePomodoro } from '@/lib/contexts/PomodoroContext';
import { WHITE_NOISES, type WhiteNoiseMix } from '@/lib/types/whiteNoise';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface WhiteNoisePlayerProps {
  user: User;
}

export default function WhiteNoisePlayer({ user }: WhiteNoisePlayerProps) {
  const { whiteNoise } = usePomodoro();
  const { audioStates, initAudio, togglePlay, setVolume, stopAll, getCurrentMix, loadMix } = whiteNoise;
  const [savedMixes, setSavedMixes] = useState<WhiteNoiseMix[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [mixName, setMixName] = useState('');
  const supabase = createClient();

  useEffect(() => {
    console.log('初始化白噪音...');
    WHITE_NOISES.forEach((sound) => {
      console.log('初始化音频:', sound.id, sound.audioPath);
      initAudio(sound.id, sound.audioPath);
    });
    loadSavedMixes();
  }, [initAudio]);

  const loadSavedMixes = async () => {
    try {
      const { data, error } = await supabase
        .from('white_noise_mixes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedMixes(data || []);
    } catch (error) {
      console.error('加载混音方案失败:', error);
    }
  };

  const handleSaveMix = async () => {
    if (!mixName.trim()) return;

    const currentMix = getCurrentMix();
    if (currentMix.length === 0) {
      alert('请先播放至少一个白噪音');
      return;
    }

    try {
      const { error } = await supabase.from('white_noise_mixes').insert([
        {
          user_id: user.id,
          name: mixName,
          sounds: currentMix,
        },
      ]);

      if (error) throw error;

      setMixName('');
      setShowSaveModal(false);
      await loadSavedMixes();
    } catch (error) {
      console.error('保存混音方案失败:', error);
    }
  };

  const handleLoadMix = async (mix: WhiteNoiseMix) => {
    await loadMix(mix.sounds);
  };

  const handleDeleteMix = async (mixId: string) => {
    try {
      const { error } = await supabase
        .from('white_noise_mixes')
        .delete()
        .eq('id', mixId);

      if (error) throw error;
      await loadSavedMixes();
    } catch (error) {
      console.error('删除混音方案失败:', error);
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">🎵 白噪音</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSaveModal(true)}
            className="px-3 py-1.5 text-xs bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all"
          >
            保存
          </button>
          <button
            onClick={stopAll}
            className="px-3 py-1.5 text-xs bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all"
          >
            停止
          </button>
        </div>
      </div>

      {/* 白噪音网格 - 2x2 正方形 */}
      <div className="grid grid-cols-2 gap-3 flex-1">
        {WHITE_NOISES.map((sound) => {
          const state = audioStates[sound.id];
          const isPlaying = state?.isPlaying || false;
          const volume = state?.volume || 0.5;

          return (
            <div
              key={sound.id}
              className="relative aspect-square rounded-2xl p-4 transition-all duration-300 cursor-pointer flex flex-col justify-between bg-gradient-to-br from-emerald-400 to-teal-500 hover:shadow-lg"
              style={{
                opacity: isPlaying ? 1 : 0.6,
              }}
              onClick={() => {
                togglePlay(sound.id, sound.audioPath);
              }}
            >
              {/* 播放状态指示 */}
              {isPlaying && (
                <div className="absolute top-3 right-3 flex gap-1">
                  <div className="w-1 h-3 bg-white rounded-full animate-pulse"></div>
                  <div className="w-1 h-3 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-1 h-3 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
              )}

              {/* 名称 */}
              <div className="text-white font-medium text-sm">
                {sound.name}
              </div>

              {/* 音量滑块 */}
              <div className="mt-auto">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={(e) => {
                    e.stopPropagation();
                    setVolume(sound.id, parseFloat(e.target.value));
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer transition-all"
                  style={{
                    background: `linear-gradient(to right, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.9) ${volume * 100}%, rgba(255,255,255,0.3) ${volume * 100}%, rgba(255,255,255,0.3) 100%)`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* 已保存的混音方案 */}
      {savedMixes.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">已保存的方案</h4>
          <div className="space-y-2">
            {savedMixes.map((mix) => (
              <div
                key={mix.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all"
              >
                <button
                  onClick={() => handleLoadMix(mix)}
                  className="flex-1 text-left text-sm text-gray-900 hover:text-emerald-600"
                >
                  {mix.name}
                </button>
                <button
                  onClick={() => handleDeleteMix(mix.id)}
                  className="text-gray-400 hover:text-red-500 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 保存混音方案模态框 */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-medium text-gray-900 mb-4">保存混音方案</h3>
            <input
              type="text"
              value={mixName}
              onChange={(e) => setMixName(e.target.value)}
              placeholder="输入方案名称"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleSaveMix}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
