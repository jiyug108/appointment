import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Lock, ShieldCheck, ArrowLeft } from 'lucide-react';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'Admin@123') {
      localStorage.setItem('isAdmin', 'true');
      navigate('/admin');
    } else {
      setError('密码错误，请重新输入');
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F9F9F6] p-6 lg:p-12">
      <button 
        onClick={() => navigate('/')}
        className="mb-12 flex items-center gap-2 text-stone-400 hover:text-natural-primary transition-colors text-xs font-bold uppercase tracking-widest"
      >
        <ArrowLeft size={16} />
        返回活动页
      </button>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 bg-natural-dark text-white rounded-[28px] flex items-center justify-center shadow-2xl shadow-stone-200 mb-6 group overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
              <ShieldCheck size={36} className="relative z-10" />
            </div>
            <h1 className="text-2xl font-serif italic text-stone-800">管理后台登录</h1>
            <p className="text-[10px] text-stone-400 uppercase tracking-[0.2em] mt-2">Restricted Area</p>
          </div>

          <motion.form 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleLogin}
            className="bg-white p-10 rounded-[40px] shadow-sm border border-stone-100"
          >
            <div className="space-y-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-1 flex items-center pointer-events-none text-stone-300">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  placeholder="请输入访问密钥"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-8 py-4 bg-transparent border-b border-stone-100 focus:outline-none focus:border-natural-primary text-sm transition-all placeholder:text-stone-200"
                  required
                />
              </div>

              {error && (
                <motion.p 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="text-natural-accent text-[10px] font-bold uppercase text-center"
                >
                  {error}
                </motion.p>
              )}

              <button
                type="submit"
                className="w-full py-4 bg-natural-dark text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest active:scale-[0.98] transition-transform shadow-lg shadow-stone-100"
              >
                验证权限
              </button>
            </div>
          </motion.form>
          
          <p className="text-center mt-10 text-[9px] text-stone-300 uppercase tracking-widest leading-loose">
            如果忘记密码请联系<br/>系统管理员进行重置
          </p>
        </div>
      </div>
    </div>
  );
}
