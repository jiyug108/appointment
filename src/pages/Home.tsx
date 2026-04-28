import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ChevronRight, Settings } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<any>(null);
  const [stats, setStats] = useState<{total: number}>({ total: 0 });

  useEffect(() => {
    Promise.all([
      fetch('/api/config').then(res => res.json()),
      fetch('/api/stats').then(res => res.json())
    ]).then(([configData, statsData]) => {
      setConfig(configData);
      setStats(statsData);
    });
  }, []);

  if (!config) return <div className="p-10 text-center">加载中...</div>;

  const today = new Date().toISOString().split('T')[0];
  
  let statusText = '开始预约';
  let isDisabled = false;

  if (!config.is_active) {
    statusText = '活动暂未开启';
    isDisabled = true;
  } else if (today < config.start_date) {
    statusText = '活动还未开始';
    isDisabled = true;
  } else if (today > config.end_date) {
    statusText = '活动已结束';
    isDisabled = true;
  } else if (stats.total >= config.max_registrations) {
    statusText = '报名人数已满';
    isDisabled = true;
  }

  return (
    <div className="flex flex-col min-h-screen relative">
      {/* Admin Portal Entry */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        onClick={() => navigate('/admin-login')}
        className="fixed bottom-24 right-6 w-10 h-10 rounded-full bg-white/80 backdrop-blur-md border border-stone-100 flex items-center justify-center text-stone-300 hover:text-stone-600 hover:shadow-md transition-all z-50 group shadow-sm"
        title="管理后台"
      >
        <Settings size={18} className="group-hover:rotate-45 transition-transform duration-500" />
      </motion.button>

      {/* Header Image */}
      <div className="h-64 bg-natural-primary relative flex items-end p-8 overflow-hidden">
        {config.bg_image && (
          <img 
            src={config.bg_image} 
            alt="Background" 
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
        <div className="relative z-10 w-full">
          <span className="text-[10px] uppercase tracking-widest text-white/80 font-bold">Activity Info</span>
          <h1 className="text-2xl text-white font-serif italic leading-tight mt-1">
            {config.title}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="px-2 py-0.5 bg-white/20 backdrop-blur-md rounded text-[9px] text-white font-mono">
              开始: {config.start_date}
            </span>
            <span className="px-2 py-0.5 bg-white/20 backdrop-blur-md rounded text-[9px] text-white font-mono">
              结束: {config.end_date}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8 flex-1">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="prose prose-stone max-w-none text-stone-600 mb-20"
          dangerouslySetInnerHTML={{ __html: config.description }}
        />
      </div>

      {/* Button */}
      <div className="sticky bottom-0 p-6 bg-white/80 backdrop-blur-md border-t border-stone-50 mt-auto">
        <button
          onClick={() => !isDisabled && navigate('/form')}
          disabled={isDisabled}
          className={`w-full h-14 rounded-2xl font-bold tracking-widest text-xs uppercase flex items-center justify-center gap-2 transition-all shadow-lg shadow-stone-200 ${
            isDisabled 
              ? 'bg-stone-200 text-stone-400 cursor-not-allowed' 
              : 'bg-natural-dark text-white active:scale-[0.98]'
          }`}
        >
          {statusText}
          {!isDisabled && <ChevronRight size={16} />}
        </button>
      </div>
    </div>
  );
}
