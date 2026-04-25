import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { CheckCircle2, Home } from 'lucide-react';

export default function SuccessPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-white sm:rounded-[40px]">
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", damping: 12 }}
        className="w-24 h-24 bg-natural-stone-50 text-natural-primary rounded-full flex items-center justify-center mb-8 border border-stone-100"
      >
        <CheckCircle2 size={56} />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-3xl font-serif italic text-natural-dark mb-3"
      >
        提交完成
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-stone-400 text-sm mb-12 max-w-[240px] mx-auto"
      >
        您的出行采集信息已经成功录入系统
      </motion.p>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        onClick={() => navigate('/')}
        className="flex items-center gap-2 px-10 py-4 bg-natural-dark text-white rounded-2xl font-bold tracking-widest text-xs uppercase shadow-lg shadow-stone-100 hover:scale-[0.98] transition-transform"
      >
        返回活动首页
      </motion.button>
    </div>
  );
}
