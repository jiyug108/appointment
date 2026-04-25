import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Settings, 
  Database, 
  Download, 
  LogOut, 
  Layout, 
  Save, 
  RefreshCw,
  Search,
  ChevronRight,
  User,
  Users
} from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'config' | 'data'>('data');
  const [entries, setEntries] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    if (localStorage.getItem('isAdmin') !== 'true') {
      navigate('/admin-login');
      return;
    }
    fetchData();
    fetchConfig();
  }, [navigate]);

  const fetchData = async () => {
    const res = await fetch('/api/entries');
    const data = await res.json();
    setEntries(data);
  };

  const fetchConfig = async () => {
    const res = await fetch('/api/config');
    const data = await res.json();
    setConfig(data);
  };

  const handleLogout = () => {
    localStorage.removeItem('isAdmin');
    navigate('/admin-login');
  };

  const saveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('保存中...');
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    const data = await res.json();
    if (data.success) {
      setSaveStatus('保存成功！');
      setTimeout(() => setSaveStatus(''), 2000);
    }
  };

  const exportExcel = () => {
    window.open('/api/export', '_blank');
  };

  const filteredEntries = entries.filter(e => 
    e.name.includes(searchTerm) || 
    e.id_number.includes(searchTerm) || 
    e.phone.includes(searchTerm)
  );

  if (!config) return <div className="p-10 text-center">加载中...</div>;

  return (
    <div className="flex flex-col min-h-screen bg-[#F9F9F6] max-w-full">
      {/* Sidebar / TopNav */}
      <div className="bg-white border-b border-stone-100 flex items-center justify-between px-10 py-6">
        <div>
          <h2 className="text-2xl font-serif italic text-stone-800">数据管理后台</h2>
          <p className="text-stone-400 text-[10px] uppercase tracking-widest mt-1">Management Portal V1.2</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <div className="text-[10px] font-bold uppercase text-stone-400 tracking-tighter">Current Session</div>
            <div className="text-sm text-natural-primary font-medium italic">Admin@123</div>
          </div>
          <button onClick={handleLogout} className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 hover:text-natural-accent transition-colors border border-white shrink-0">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Content Container */}
      <div className="px-10 py-8 space-y-8">
        {/* Navigation Tabs */}
        <div className="flex gap-4">
          <button 
            onClick={() => setActiveTab('data')}
            className={`px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
              activeTab === 'data' ? 'bg-natural-dark text-white shadow-lg shadow-stone-200' : 'bg-white text-stone-400 border border-stone-100'
            }`}
          >
            数据采集结果
          </button>
          <button 
            onClick={() => setActiveTab('config')}
            className={`px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
              activeTab === 'config' ? 'bg-natural-dark text-white shadow-lg shadow-stone-200' : 'bg-white text-stone-400 border border-stone-100'
            }`}
          >
            活动参数配置
          </button>
        </div>

        {activeTab === 'data' ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
                <div className="text-[10px] uppercase font-bold text-stone-400 tracking-widest mb-1">已采集填报</div>
                <div className="text-4xl font-serif text-natural-dark">{entries.length}</div>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
                <div className="text-[10px] uppercase font-bold text-stone-400 tracking-widest mb-1">同行人总数</div>
                <div className="text-4xl font-serif text-natural-accent">
                  {entries.reduce((acc, curr) => acc + (curr.companions?.length || 0), 0)}
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
                <div className="text-[10px] uppercase font-bold text-stone-400 tracking-widest mb-1">刷新频率</div>
                <div className="text-4xl font-serif text-stone-300">Live</div>
              </div>
            </div>

            <div className="bg-white rounded-[32px] border border-stone-100 shadow-sm overflow-hidden p-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 border-b border-stone-50">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search records..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-2 bg-stone-50 border border-stone-100 rounded-full text-xs outline-none focus:border-stone-200 transition-colors"
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={fetchData} className="p-2.5 bg-stone-50 text-stone-400 rounded-xl hover:bg-stone-100 transition-colors">
                    <RefreshCw size={18} />
                  </button>
                  <button 
                    onClick={exportExcel}
                    className="flex items-center gap-2 px-6 py-2.5 bg-natural-accent text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-orange-100 active:scale-95 transition-transform"
                  >
                    <Download size={16} />
                    导出 EXCEL
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] uppercase font-bold text-stone-400 tracking-tighter border-b border-stone-50">
                      <th className="px-8 py-5">登记姓名</th>
                      <th className="px-8 py-5">证件与联系方式</th>
                      <th className="px-8 py-5 text-center">同行人员</th>
                      <th className="px-8 py-5 text-right">采集时间</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {filteredEntries.map((entry) => (
                      <tr key={entry.id} className="border-b border-stone-50 group hover:bg-stone-50/30 transition-colors">
                        <td className="px-8 py-5 font-medium text-stone-700">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-natural-stone-100 text-natural-primary flex items-center justify-center text-[10px] font-bold font-serif italic">
                              {entry.name[0]}
                            </span>
                            {entry.name}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <p className="text-xs text-stone-400">{entry.id_type}: {entry.id_number.slice(0,4)}***{entry.id_number.slice(-4)}</p>
                          <p className="text-[10px] text-stone-300 font-mono mt-0.5">{entry.phone}</p>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${
                            entry.companions?.length > 0 ? 'bg-natural-stone-100 text-natural-primary' : 'bg-stone-50 text-stone-300'
                          }`}>
                            <Users size={12} />
                            {entry.companions?.length || 0} Member
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <p className="text-xs font-medium text-stone-600">{new Date(entry.created_at).toLocaleDateString()}</p>
                          <p className="text-[9px] text-stone-300 uppercase tracking-tighter mt-0.5">Submitted On</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
            <form onSubmit={saveConfig} className="bg-white p-10 rounded-[32px] border border-stone-100 shadow-sm space-y-8">
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] uppercase font-bold text-stone-400 tracking-widest block mb-2">活动显示标题</label>
                  <input 
                    type="text" 
                    value={config.title}
                    onChange={(e) => setConfig({...config, title: e.target.value})}
                    className="w-full border-b border-stone-100 py-2 focus:outline-none focus:border-natural-primary transition-colors text-lg font-serif italic"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-stone-400 tracking-widest block mb-2">详细说明配置 (HTML)</label>
                  <textarea 
                    rows={5}
                    value={config.description}
                    onChange={(e) => setConfig({...config, description: e.target.value})}
                    className="w-full bg-natural-stone-50 rounded-2xl p-4 text-xs font-mono border border-stone-100 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-stone-400 tracking-widest block mb-2">背景 URL</label>
                    <input 
                      type="text" 
                      value={config.bg_image}
                      onChange={(e) => setConfig({...config, bg_image: e.target.value})}
                      className="w-full border-b border-stone-100 py-2 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-stone-400 tracking-widest block mb-2">同行人上限</label>
                    <input 
                      type="number" 
                      value={config.max_companions}
                      onChange={(e) => setConfig({...config, max_companions: parseInt(e.target.value)})}
                      className="w-full border-b border-stone-100 py-2 text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-8">
                   <label className="flex items-center gap-3 cursor-pointer group">
                     <div className={`w-5 h-5 rounded-md border-2 transition-colors ${config.show_transport ? 'bg-natural-primary border-natural-primary' : 'border-stone-200'}`}></div>
                     <input 
                       type="checkbox" 
                       checked={!!config.show_transport}
                       onChange={(e) => setConfig({...config, show_transport: e.target.checked})}
                       className="hidden"
                     />
                     <span className="text-xs font-medium text-stone-600">展示交通方式</span>
                   </label>
                   <label className="flex items-center gap-3 cursor-pointer group">
                     <div className={`w-5 h-5 rounded-md border-2 transition-colors ${config.show_pickup ? 'bg-natural-primary border-natural-primary' : 'border-stone-200'}`}></div>
                     <input 
                       type="checkbox" 
                       checked={!!config.show_pickup}
                       onChange={(e) => setConfig({...config, show_pickup: e.target.checked})}
                       className="hidden"
                     />
                     <span className="text-xs font-medium text-stone-600">展示上车地点</span>
                   </label>
                </div>
              </div>

              <div className="pt-6 flex items-center justify-between">
                <button 
                  type="submit"
                  className="px-8 py-3 bg-natural-dark text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-stone-100 flex items-center gap-2 active:scale-95 transition-transform"
                >
                  <Save size={16} />
                  保存配置
                </button>
                <span className="text-natural-primary font-bold italic text-sm">{saveStatus}</span>
              </div>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
}
