'use client';

import { useState } from 'react';
import type { Task } from '@/lib/types/task';

interface BatchActionsProps {
  selectedTasks: string[];
  tasks: Task[];
  onBatchDelete: (taskIds: string[]) => void;
  onBatchMove: (taskIds: string[], newDate: string) => void;
  onBatchStatusChange: (taskIds: string[], status: Task['status']) => void;
  onClearSelection: () => void;
}

export default function BatchActions({
  selectedTasks,
  tasks,
  onBatchDelete,
  onBatchMove,
  onBatchStatusChange,
  onClearSelection,
}: BatchActionsProps) {
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);

  if (selectedTasks.length === 0) return null;

  const handleBatchMove = () => {
    onBatchMove(selectedTasks, targetDate);
    setShowMoveModal(false);
    onClearSelection();
  };

  return (
    <>
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-xl">
            <span className="text-sm font-medium text-emerald-700">
              已选择 {selectedTasks.length} 个任务
            </span>
          </div>

          <div className="h-8 w-px bg-gray-200"></div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onBatchStatusChange(selectedTasks, 'completed')}
              className="px-4 py-2 bg-green-100 text-green-700 rounded-xl text-sm font-medium hover:bg-green-200 transition-all"
              title="批量完成"
            >
              ✅ 完成
            </button>

            <button
              onClick={() => onBatchStatusChange(selectedTasks, 'in_progress')}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-200 transition-all"
              title="批量开始"
            >
              ▶️ 开始
            </button>

            <button
              onClick={() => setShowMoveModal(true)}
              className="px-4 py-2 bg-purple-100 text-purple-700 rounded-xl text-sm font-medium hover:bg-purple-200 transition-all"
              title="批量移动"
            >
              📅 移动
            </button>

            <button
              onClick={() => {
                if (confirm(`确定要删除选中的 ${selectedTasks.length} 个任务吗？`)) {
                  onBatchDelete(selectedTasks);
                  onClearSelection();
                }
              }}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-xl text-sm font-medium hover:bg-red-200 transition-all"
              title="批量删除"
            >
              🗑️ 删除
            </button>
          </div>

          <div className="h-8 w-px bg-gray-200"></div>

          <button
            onClick={onClearSelection}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-medium transition-all"
          >
            取消
          </button>
        </div>
      </div>

      {/* 移动日期选择模态框 */}
      {showMoveModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-medium text-gray-900 mb-4">
              移动任务到新日期
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              将选中的 {selectedTasks.length} 个任务移动到：
            </p>

            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all mb-6"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setShowMoveModal(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleBatchMove}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
              >
                确认移动
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
