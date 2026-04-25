import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ChevronRight } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => setConfig(data));
  }, []);

  if (!config) return <div className="p-10 text-center">加载中...</div>;

  return (
    <div className="flex flex-col min-h-screen">
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
          onClick={() => navigate('/form')}
          className="w-full h-14 bg-natural-dark text-white rounded-2xl font-bold tracking-widest text-xs uppercase flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg shadow-stone-200"
        >
          开始录入信息
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
