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
  Check,
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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
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

  const handleClearData = async () => {
    const password = prompt('请输入管理员密码执行清空操作：');
    if (!password) return;

    try {
      const res = await fetch('/api/clear-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (data.success) {
        alert('数据已成功清空');
        fetchData();
      } else {
        alert(data.error || '清空失败');
      }
    } catch (err) {
      alert('网络错误');
    }
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

  const filteredEntries = entries.filter(e => {
    const matchesSearch = e.name.includes(searchTerm) || 
      e.id_number.includes(searchTerm) || 
      e.phone.includes(searchTerm);
    
    if (startDate || endDate) {
      const entryDate = new Date(e.created_at).toISOString().split('T')[0];
      const afterStart = startDate ? entryDate >= startDate : true;
      const beforeEnd = endDate ? entryDate <= endDate : true;
      return matchesSearch && afterStart && beforeEnd;
    }
    
    return matchesSearch;
  });

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
                <div className="flex items-center gap-2">
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-stone-400 font-bold uppercase">From</span>
                      <input 
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="px-3 py-1.5 bg-stone-50 border border-stone-100 rounded-lg text-[10px] outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-stone-400 font-bold uppercase">To</span>
                      <input 
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="px-3 py-1.5 bg-stone-50 border border-stone-100 rounded-lg text-[10px] outline-none"
                      />
                    </div>
                  </div>
                  {(startDate || endDate) && (
                    <button 
                      onClick={() => { setStartDate(''); setEndDate(''); }}
                      className="text-[10px] text-stone-400 font-bold uppercase tracking-widest hover:text-natural-dark"
                    >
                      Clear Range
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <button onClick={fetchData} className="p-2.5 bg-stone-50 text-stone-400 rounded-xl hover:bg-stone-100 transition-colors">
                    <RefreshCw size={18} />
                  </button>
                  <button 
                    onClick={handleClearData}
                    className="px-6 py-2.5 bg-white border border-red-100 text-red-400 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-50 transition-colors"
                  >
                    清空数据
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
                      <th className="px-8 py-5 text-center">交通/地点</th>
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
                          <p className="text-xs text-stone-600 font-medium">{entry.transport_type}</p>
                          <p className="text-[9px] text-stone-400 mt-0.5 truncate max-w-[120px] mx-auto">{entry.pickup_location || entry.car_number || '-'}</p>
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
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase font-bold text-stone-400 tracking-widest block">活动状态控制</label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-10 h-5 rounded-full transition-colors relative ${config.is_active ? 'bg-natural-primary' : 'bg-stone-200'}`}>
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${config.is_active ? 'right-1' : 'left-1'}`} />
                      </div>
                      <input 
                        type="checkbox" 
                        checked={!!config.is_active}
                        onChange={(e) => setConfig({...config, is_active: e.target.checked})}
                        className="hidden"
                      />
                      <span className="text-xs font-medium text-stone-600">{config.is_active ? '活动开启中' : '活动已关闭'}</span>
                    </label>
                  </div>
                  {!config.is_active && (
                    <p className="text-[10px] text-red-400 bg-red-50 p-4 rounded-xl italic font-medium">
                      注意：活动已手动关闭，填报页面将显示“活动暂未开启”。
                    </p>
                  )}
                </div>

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

                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-stone-400 tracking-widest block mb-2">活动开始日期</label>
                    <input 
                      type="date" 
                      value={config.start_date}
                      onChange={(e) => setConfig({...config, start_date: e.target.value})}
                      className="w-full border-b border-stone-100 py-2 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-stone-400 tracking-widest block mb-2">活动结束日期</label>
                    <input 
                      type="date" 
                      value={config.end_date}
                      onChange={(e) => setConfig({...config, end_date: e.target.value})}
                      className="w-full border-b border-stone-100 py-2 text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-8">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-stone-400 tracking-widest block mb-2">报名总人数上限</label>
                    <input 
                      type="number" 
                      value={config.max_registrations}
                      onChange={(e) => setConfig({...config, max_registrations: parseInt(e.target.value)})}
                      className="w-full border-b border-stone-100 py-2 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-stone-400 tracking-widest block mb-2">最小报名年龄</label>
                    <input 
                      type="number" 
                      value={config.min_age}
                      onChange={(e) => setConfig({...config, min_age: parseInt(e.target.value)})}
                      className="w-full border-b border-stone-100 py-2 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-stone-400 tracking-widest block mb-2">最大报名年龄</label>
                    <input 
                      type="number" 
                      value={config.max_age}
                      onChange={(e) => setConfig({...config, max_age: parseInt(e.target.value)})}
                      className="w-full border-b border-stone-100 py-2 text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase font-bold text-stone-400 tracking-widest block">上车地点配置</label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-md border-2 transition-colors ${config.show_pickup ? 'bg-natural-primary border-natural-primary' : 'border-stone-200'}`}>
                        {!!config.show_pickup && <div className="w-full h-full flex items-center justify-center text-white"><Check size={12} /></div>}
                      </div>
                      <input 
                        type="checkbox" 
                        checked={!!config.show_pickup}
                        onChange={(e) => setConfig({...config, show_pickup: e.target.checked})}
                        className="hidden"
                      />
                      <span className="text-xs font-medium text-stone-600">启用上车地点选择</span>
                    </label>
                  </div>
                  
                  {config.show_pickup ? (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                      <input 
                        type="text" 
                        value={config.pickup_locations}
                        onChange={(e) => setConfig({...config, pickup_locations: e.target.value})}
                        placeholder="如：地点A,地点B,地点C (请用逗号分隔)"
                        className="w-full border-b border-stone-100 py-2 text-sm focus:outline-none focus:border-natural-primary transition-colors"
                      />
                      <p className="text-[10px] text-stone-300 mt-2 italic">提示：填报人可在表单中选择预设的上车点</p>
                    </motion.div>
                  ) : (
                    <p className="text-[10px] text-stone-300 bg-stone-50 p-4 rounded-xl italic">
                      上车地点功能已禁用，填报页面将不会展示该选项。
                    </p>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase font-bold text-stone-400 tracking-widest block">推荐人信息配置</label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-md border-2 transition-colors ${config.show_referrer ? 'bg-natural-primary border-natural-primary' : 'border-stone-200'}`}>
                        {!!config.show_referrer && <div className="w-full h-full flex items-center justify-center text-white"><Check size={12} /></div>}
                      </div>
                      <input 
                        type="checkbox" 
                        checked={!!config.show_referrer}
                        onChange={(e) => setConfig({...config, show_referrer: e.target.checked})}
                        className="hidden"
                      />
                      <span className="text-xs font-medium text-stone-600">启用推荐人信息填报</span>
                    </label>
                  </div>
                  {!config.show_referrer && (
                    <p className="text-[10px] text-stone-300 bg-stone-50 p-4 rounded-xl italic">
                      推荐人信息功能已禁用，填报页面将不会展示相关选项。
                    </p>
                  )}
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] uppercase font-bold text-stone-400 tracking-widest block">出行方式配置</label>
                  <div className="flex gap-6">
                    {[
                      { value: 'both', label: '大巴和自驾' },
                      { value: 'bus', label: '仅大巴车' },
                      { value: 'car', label: '仅自驾出行' },
                      { value: 'none', label: '不显示' }
                    ].map((opt) => (
                      <label key={opt.value} className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="radio" 
                          name="transport_config"
                          checked={config.transport_config === opt.value}
                          onChange={() => setConfig({...config, transport_config: opt.value})}
                          className="w-4 h-4 accent-natural-primary"
                        />
                        <span className="text-xs font-medium text-stone-600">{opt.label}</span>
                      </label>
                    ))}
                  </div>
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
