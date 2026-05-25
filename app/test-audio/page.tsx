'use client';

import { useEffect, useState } from 'react';

export default function AudioTestPage() {
  const [testResults, setTestResults] = useState<Record<string, string>>({});

  useEffect(() => {
    const testAudio = async (name: string, path: string) => {
      try {
        const audio = new Audio(path);
        audio.addEventListener('loadeddata', () => {
          setTestResults(prev => ({ ...prev, [name]: '✅ 加载成功' }));
        });
        audio.addEventListener('error', (e) => {
          setTestResults(prev => ({ ...prev, [name]: `❌ 加载失败: ${audio.error?.message}` }));
        });
      } catch (error) {
        setTestResults(prev => ({ ...prev, [name]: `❌ 错误: ${error}` }));
      }
    };

    testAudio('雨声 (OGG)', '/sounds/rain-on-leaves.ogg');
    testAudio('钟声 (WAV)', '/sounds/temple-bell.wav');
    testAudio('火声 (WAV)', '/sounds/campfire.wav');
    testAudio('雪声 (WAV)', '/sounds/snow-steps.wav');
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6">音频文件测试</h1>

        <div className="space-y-4">
          {Object.entries(testResults).map(([name, result]) => (
            <div key={name} className="p-4 bg-gray-50 rounded">
              <p className="font-medium">{name}</p>
              <p className="text-sm text-gray-600">{result}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-2">
          <h2 className="font-bold">直接访问测试：</h2>
          <a href="/sounds/rain-on-leaves.ogg" target="_blank" className="block text-blue-600 hover:underline">
            /sounds/rain-on-leaves.ogg
          </a>
          <a href="/sounds/temple-bell.wav" target="_blank" className="block text-blue-600 hover:underline">
            /sounds/temple-bell.wav
          </a>
          <a href="/sounds/campfire.wav" target="_blank" className="block text-blue-600 hover:underline">
            /sounds/campfire.wav
          </a>
          <a href="/sounds/snow-steps.wav" target="_blank" className="block text-blue-600 hover:underline">
            /sounds/snow-steps.wav
          </a>
        </div>
      </div>
    </div>
  );
}
