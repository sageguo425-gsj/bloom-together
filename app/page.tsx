import Link from 'next/link';

export default function Home() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* 全屏背景图片 - 治愈系自然风景 */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2071)',
          filter: 'brightness(0.7)'
        }}
      />

      {/* 渐变遮罩层 - 绿色系 */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/60 via-teal-800/40 to-green-900/70" />

      {/* 居中主内容 */}
      <div className="relative z-10 w-full px-6 text-center">
        <div className="max-w-3xl mx-auto space-y-12">

          {/* 标题区域 */}
          <div className="space-y-8">
            <h1 className="text-6xl md:text-7xl lg:text-8xl text-white font-extralight tracking-tight leading-none">
              Bloom
              <br />
              <span className="font-light">Together</span>
            </h1>

            <p className="text-lg md:text-xl lg:text-2xl text-emerald-50/90 font-light italic tracking-wide">
              "Grow together, bloom together"
            </p>
          </div>

          {/* 按钮组 */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto pt-4">
            <Link
              href="/login"
              className="w-full sm:w-40 px-8 py-3.5 bg-white/95 backdrop-blur-sm text-emerald-700 rounded-full font-medium hover:bg-white transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
            >
              登录
            </Link>

            <Link
              href="/register"
              className="w-full sm:w-40 px-8 py-3.5 bg-white/20 backdrop-blur-md text-white rounded-full font-medium hover:bg-white/30 transition-all duration-300 border border-white/40 hover:border-white/60 hover:scale-105"
            >
              注册
            </Link>
          </div>

        </div>
      </div>

      {/* 装饰性渐变光晕 */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-400/20 rounded-full blur-3xl"></div>
    </div>
  );
}
