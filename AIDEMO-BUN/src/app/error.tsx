"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="glass px-8 py-6 rounded-2xl shadow-xl max-w-md text-center space-y-4">
        <div className="text-4xl">😵</div>
        <h2 className="text-lg font-bold text-pink-900">出了点问题</h2>
        <p className="text-sm text-pink-600/80">
          {error.message || "页面发生了未知错误"}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-pink-500 text-white rounded-xl hover:bg-pink-600 transition-colors text-sm"
        >
          重试
        </button>
      </div>
    </div>
  );
}
