import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  ArrowLeft, 
  Send, 
  IdCard, 
  Phone, 
  Calendar,
  Car,
  AlertCircle,
  Bus
} from 'lucide-react';

interface Companion {
  name: string;
  id_type: string;
  id_number: string;
  phone: string;
  birth_date: string;
  gender: string;
}

const DatePicker = ({ value, onChange, label }: { value: string, onChange: (val: string) => void, label?: string }) => {
  const [localY, setLocalY] = useState('');
  const [localM, setLocalM] = useState('');
  const [localD, setLocalD] = useState('');

  // Sync with parent ONLY if value is provided (e.g. OCR or initial load)
  // or if the parent explicitly clears it.
  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        setLocalY(parts[0]);
        setLocalM(parseInt(parts[1]).toString());
        setLocalD(parseInt(parts[2]).toString());
      }
    } else {
      // Only clear if parents value is truly empty and we have state
      // but we should be careful not to loop.
    }
  }, [value]);
  
  const handleDatePartChange = (part: 'y' | 'm' | 'd', val: string) => {
    let newY = localY, newM = localM, newD = localD;
    if (part === 'y') { newY = val; setLocalY(val); }
    if (part === 'm') { newM = val; setLocalM(val); }
    if (part === 'd') { newD = val; setLocalD(val); }
    
    // We only call onChange if it's a COMPLETE valid date
    if (newY && newM && newD) {
      onChange(`${newY}-${newM.padStart(2, '0')}-${newD.padStart(2, '0')}`);
    } else if (!newY && !newM && !newD) {
      onChange(''); // All cleared
    }
    // Note: We DON'T call onChange('') if it's just partial, 
    // to prevent the parent from blowing away our local state in the useEffect.
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 120 }, (_, i) => (currentYear - i).toString());
  const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());

  return (
    <div className="space-y-2">
      {label && <label className="text-[10px] uppercase font-bold text-stone-400 tracking-widest">{label}</label>}
      <div className="flex gap-2">
        <select 
          value={localY} 
          onChange={(e) => handleDatePartChange('y', e.target.value)}
          className="flex-1 border-b border-stone-200 py-3 text-sm focus:outline-none bg-transparent"
        >
          <option value="">年</option>
          {years.map(year => <option key={year} value={year}>{year}年</option>)}
        </select>
        <select 
          value={localM} 
          onChange={(e) => handleDatePartChange('m', e.target.value)}
          className="w-16 border-b border-stone-200 py-3 text-sm focus:outline-none bg-transparent"
        >
          <option value="">月</option>
          {months.map(month => <option key={month} value={month}>{month}月</option>)}
        </select>
        <select 
          value={localD} 
          onChange={(e) => handleDatePartChange('d', e.target.value)}
          className="w-16 border-b border-stone-200 py-3 text-sm focus:outline-none bg-transparent"
        >
          <option value="">日</option>
          {days.map(day => <option key={day} value={day}>{day}日</option>)}
        </select>
      </div>
    </div>
  );
};

export default function FormPage() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    id_type: '身份证',
    id_number: '',
    phone: '',
    birth_date: '',
    gender: '男',
    remarks: '',
    first_time_flying: null as boolean | null,
    transport_type: '统一大巴车',
    car_number: '',
    pickup_location: '',
    referrer_type: '',
    referrer_name: '',
    referrer_dept: '',
    referrer_phone: '',
    luggage_confirmed: false,
    companions: [] as Companion[]
  });

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        setConfig(data);
        const updates: any = {};
        
        if (data.transport_config === 'car') {
          updates.transport_type = '自驾';
        } else if (data.transport_config === 'bus') {
          updates.transport_type = '统一大巴车';
        }
        
        if (Object.keys(updates).length > 0) {
          setFormData(prev => ({ ...prev, ...updates }));
        }
      });
  }, []);

  useEffect(() => {
    if (config?.referrer_config) {
      if (config.referrer_config === 'airport') {
        handleInputChange('referrer_type', '机场');
      } else if (config.referrer_config === 'other') {
        handleInputChange('referrer_type', '其它');
      } else if (config.referrer_config === 'both' && !formData.referrer_type) {
        handleInputChange('referrer_type', '机场');
      }
    }
  }, [config]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addCompanion = () => {
    setFormData(prev => ({
      ...prev,
      companions: [...prev.companions, {
        name: '',
        id_type: '身份证',
        id_number: '',
        phone: '',
        birth_date: '',
        gender: '男'
      }]
    }));
  };

  const removeCompanion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      companions: prev.companions.filter((_, i) => i !== index)
    }));
  };

  const updateCompanion = (index: number, field: string, value: string) => {
    const updated = [...formData.companions];
    updated[index] = { ...updated[index], [field]: value } as Companion;
    setFormData(prev => ({ ...prev, companions: updated }));
  };

  const validateAge = (birthDateStr: string) => {
    if (!birthDateStr || !config) return true;
    const birthDate = new Date(birthDateStr);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= config.min_age && age <= config.max_age;
  };

  const validateIdNumber = (id: string, type: string) => {
    const trimmedId = id.trim();
    if (type === '身份证') {
      return /^[0-9]{17}[0-9Xx]$/.test(trimmedId);
    }
    return trimmedId.length >= 5; 
  };

  const validatePhone = (phone: string) => {
    return /^1[3-9]\d{9}$/.test(phone.trim());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clean data
    const cleanedFormData = {
      ...formData,
      id_number: formData.id_number.trim().toUpperCase(),
      phone: formData.phone.trim(),
      referrer_phone: formData.referrer_phone.trim(),
      companions: formData.companions.map(c => ({
        ...c,
        id_number: c.id_number.trim().toUpperCase(),
        phone: c.phone.trim()
      }))
    };

    // Validations
    if (!cleanedFormData.name || !cleanedFormData.id_number || !cleanedFormData.phone || !cleanedFormData.birth_date) {
      alert('请完成主要人员的所有必填信息');
      return;
    }

    if (!validateIdNumber(cleanedFormData.id_number, cleanedFormData.id_type)) {
      alert(cleanedFormData.id_type === '身份证' ? '请输入正确的18位身份证号码' : '请输入有效的证件号码');
      return;
    }

    if (!validatePhone(cleanedFormData.phone)) {
      alert('请输入正确的11位手机号码');
      return;
    }

    if (!validateAge(cleanedFormData.birth_date)) {
      alert(`主填报人年龄不在允许范围内 (${config.min_age}-${config.max_age}周岁)`);
      return;
    }

    if (cleanedFormData.transport_type === '自驾' && !cleanedFormData.car_number) {
      alert('请填写车牌号码');
      return;
    }

    if (config.referrer_config && config.referrer_config !== 'none') {
      if (!cleanedFormData.referrer_name) {
        alert('请填写推荐人姓名');
        return;
      }
      if (cleanedFormData.referrer_type === '机场' && (!cleanedFormData.referrer_dept || !cleanedFormData.referrer_phone)) {
        alert('请完善机场推荐人的部门及联系方式');
        return;
      }
      if (cleanedFormData.referrer_type === '机场' && !validatePhone(cleanedFormData.referrer_phone)) {
        alert('请输入正确的推荐人11位手机号码');
        return;
      }
    }

    if (cleanedFormData.first_time_flying === null) {
      alert('请选择您是否是第一次乘坐飞机');
      return;
    }

    if (config.show_pickup && cleanedFormData.transport_type === '统一大巴车' && !cleanedFormData.pickup_location) {
      alert('请选择您的上车地点');
      return;
    }

    const incompleteCompanion = cleanedFormData.companions.find(c => !c.name || !c.id_number || !c.phone || !c.birth_date);
    if (incompleteCompanion) {
      alert('所有同行人信息均为必填，请完善同行人资料');
      return;
    }

    for (const comp of cleanedFormData.companions) {
      if (!validateIdNumber(comp.id_number, comp.id_type)) {
        alert(`${comp.name} 的证件号码格式不正确`);
        return;
      }
      if (!validatePhone(comp.phone)) {
        alert(`${comp.name} 的手机号码格式不正确 (需11位)`);
        return;
      }
      if (!validateAge(comp.birth_date)) {
        alert(`同行人 ${comp.name} 年龄不在允许范围内 (${config.min_age}-${config.max_age}周岁)`);
        return;
      }
    }

    if (!cleanedFormData.luggage_confirmed) {
      alert('请确认行李携带事项');
      return;
    }

    try {
      const res = await fetch('/api/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanedFormData)
      });
      const data = await res.json();
      if (data.success) {
        navigate('/success');
      } else {
        alert(data.error || '提交失败');
      }
    } catch (err) {
      alert('提交异常，请稍后重试');
    }
  };

  if (!config) return <div className="p-10 text-center">加载中...</div>;

  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-stone-100 flex items-center justify-between px-6 py-4">
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-stone-400 hover:text-natural-primary transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="ml-2">
            <h1 className="text-sm font-bold uppercase tracking-[0.2em] text-stone-800">服务预约</h1>
            <p className="text-[10px] text-stone-400 font-medium tracking-tight">ENROLLMENT FORM</p>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-natural-stone-50 flex items-center justify-center border border-stone-100">
           <Send size={12} className="text-natural-primary" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-6 py-10 space-y-8 flex-1 max-w-2xl mx-auto w-full">
        {/* Header Summary */}
        <div className="pb-4">
          <h2 className="text-2xl font-light text-stone-900 tracking-tight leading-tight">
            请完善您的<span className="font-medium text-natural-primary">基本信息</span>
          </h2>
        </div>

        {/* Basic Info Section */}
        <section className="bg-white rounded-[32px] p-8 shadow-sm border border-stone-50 space-y-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-xl bg-natural-stone-50 flex items-center justify-center text-natural-primary">
              <IdCard size={18} />
            </div>
            <h3 className="text-sm font-bold text-stone-800 tracking-wide">基本信息</h3>
          </div>

          <div className="space-y-6">
            <div className="group">
              <label className="text-[10px] uppercase font-bold text-stone-400 tracking-widest block mb-1 ml-1 group-focus-within:text-natural-primary transition-colors">姓名</label>
              <input 
                required
                type="text" 
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="请输入真实姓名"
                className="w-full border-b border-stone-200 py-3 text-base focus:outline-none focus:border-natural-primary transition-colors bg-transparent placeholder:text-stone-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="group">
                <label className="text-[10px] uppercase font-bold text-stone-400 tracking-widest block mb-1 ml-1 group-focus-within:text-natural-primary transition-colors">证件类型</label>
                <select 
                  value={formData.id_type}
                  onChange={(e) => handleInputChange('id_type', e.target.value)}
                  className="w-full border-b border-stone-200 py-3 text-base focus:outline-none bg-transparent appearance-none"
                >
                  <option value="身份证">居民身份证</option>
                  <option value="护照">护照</option>
                  <option value="港澳通行证">港澳通行证</option>
                </select>
              </div>
              
              <AnimatePresence>
                {formData.id_type === '护照' && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="group"
                  >
                    <label className="text-[10px] uppercase font-bold text-stone-400 tracking-widest block mb-2 ml-1">性别</label>
                    <div className="flex gap-4">
                      {['男', '女'].map((g) => (
                        <label key={g} className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" 
                            checked={formData.gender === g}
                            onChange={() => handleInputChange('gender', g)}
                            className="w-4 h-4 accent-natural-primary"
                          />
                          <span className="text-sm text-stone-600">{g}</span>
                        </label>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="group">
              <label className="text-[10px] uppercase font-bold text-stone-400 tracking-widest block mb-1 ml-1 group-focus-within:text-natural-primary transition-colors">证件号码</label>
              <input 
                required
                type="text" 
                value={formData.id_number}
                onChange={(e) => handleInputChange('id_number', e.target.value)}
                placeholder={formData.id_type === '身份证' ? "18位二代身份证" : "请输入有效证件号"}
                maxLength={formData.id_type === '身份证' ? 18 : 30}
                className="w-full border-b border-stone-200 py-3 text-base focus:outline-none focus:border-natural-primary transition-colors bg-transparent placeholder:text-stone-300"
              />
            </div>

            <div className="group">
              <label className="text-[10px] uppercase font-bold text-stone-400 tracking-widest block mb-1 ml-1 group-focus-within:text-natural-primary transition-colors">手机号码</label>
              <input 
                required
                type="tel" 
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="11位手机号"
                maxLength={11}
                className="w-full border-b border-stone-200 py-3 text-base focus:outline-none focus:border-natural-primary transition-colors bg-transparent placeholder:text-stone-300"
              />
            </div>

            <div className="pt-8 mb-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-4 bg-natural-primary rounded-full" />
                <span className="text-[11px] text-stone-500 font-bold uppercase tracking-widest">飞行业务确认</span>
              </div>
              <div className="space-y-4 bg-natural-stone-50/50 p-6 rounded-2xl border border-stone-100">
                <span className="text-xs font-bold text-stone-800 block">您是否是第一次乘坐飞机出行？</span>
                <div className="flex gap-4">
                  {[
                    { value: true, label: '是，这是我第一次飞' },
                    { value: false, label: '否，我曾有过飞行经验' }
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => handleInputChange('first_time_flying', opt.value)}
                      className={`flex-1 py-4 px-2 rounded-xl border text-[11px] font-bold transition-all duration-300 transform active:scale-95 ${
                        formData.first_time_flying === opt.value 
                        ? 'border-natural-primary bg-natural-primary text-white shadow-lg shadow-natural-primary/20 scale-[1.02]' 
                        : 'border-white bg-white text-stone-400 shadow-sm hover:border-stone-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <DatePicker 
              label="出生日期"
              value={formData.birth_date}
              onChange={(val) => handleInputChange('birth_date', val)}
            />
          </div>
        </section>

        {/* Travel Info Section */}
        {config.transport_config !== 'none' && (
          <section className="bg-white rounded-[32px] p-8 shadow-sm border border-stone-50 space-y-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-xl bg-natural-stone-50 flex items-center justify-center text-natural-primary">
                <Bus size={18} />
              </div>
              <h3 className="text-sm font-bold text-stone-800 tracking-wide">出行方式</h3>
            </div>

            <div className="space-y-6">
              <div className={`grid ${config.transport_config === 'both' ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                {[ 
                  { value: '统一大巴车', label: '统一大巴', icon: Bus, visible: config.transport_config === 'both' || config.transport_config === 'bus' }, 
                  { value: '自驾', label: '自驾出行', icon: Car, visible: config.transport_config === 'both' || config.transport_config === 'car' } 
                ].filter(item => item.visible).map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => handleInputChange('transport_type', item.value)}
                    className={`p-6 rounded-[24px] border text-left transition-all relative overflow-hidden group ${
                      formData.transport_type === item.value 
                      ? 'border-natural-primary bg-natural-stone-50 ring-2 ring-natural-primary/10' 
                      : 'border-stone-100 hover:border-stone-200'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl mb-3 flex items-center justify-center transition-colors ${formData.transport_type === item.value ? 'bg-natural-primary text-white' : 'bg-stone-50 text-stone-300'}`}>
                      <item.icon size={20} />
                    </div>
                    <div>
                      <span className={`text-xs font-bold block mb-0.5 ${formData.transport_type === item.value ? 'text-stone-800' : 'text-stone-400 group-hover:text-stone-500'}`}>{item.label}</span>
                      <span className="text-[10px] text-stone-300 font-medium tracking-tight uppercase">TRANSPORTATION</span>
                    </div>
                  </button>
                ))}
              </div>

              <AnimatePresence>
                {formData.transport_type === '自驾' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="group">
                      <label className="text-[10px] uppercase font-bold text-stone-400 tracking-widest block mb-1 ml-1 group-focus-within:text-natural-primary transition-colors">车牌号码</label>
                      <input 
                        type="text" 
                        value={formData.car_number}
                        onChange={(e) => handleInputChange('car_number', e.target.value)}
                        placeholder="例：蒙H88888"
                        className="w-full border-b border-stone-200 py-3 text-base focus:outline-none focus:border-natural-primary transition-colors bg-transparent placeholder:text-stone-300 uppercase"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {config.show_pickup && config.pickup_locations && formData.transport_type === '统一大巴车' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">上车地点选择</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {config.pickup_locations.split(',').map((loc: string) => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => handleInputChange('pickup_location', formData.pickup_location === loc ? '' : loc)}
                        className={`px-5 py-2.5 rounded-full text-xs font-semibold border transition-all duration-300 ${
                          formData.pickup_location === loc
                          ? 'bg-natural-dark text-white border-natural-dark shadow-md'
                          : 'bg-stone-50 text-stone-400 border-transparent hover:bg-stone-100 hover:text-stone-600'
                        }`}
                      >
                        {loc}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div 
                onClick={() => handleInputChange('luggage_confirmed', !formData.luggage_confirmed)}
                className={`flex items-start gap-4 p-6 rounded-[24px] cursor-pointer border transition-all duration-300 ${
                  formData.luggage_confirmed ? 'bg-natural-stone-50 border-natural-primary ring-2 ring-natural-primary/5' : 'bg-stone-50/50 border-stone-100 grayscale-[0.5]'
                }`}
              >
                <div className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                  formData.luggage_confirmed ? 'bg-natural-primary border-natural-primary text-white rounded-[6px]' : 'border-stone-300'
                }`}>
                  {formData.luggage_confirmed && <Plus size={16} className="rotate-45" />}
                </div>
                <div className="flex-1">
                  <p className={`text-xs font-bold transition-colors ${formData.luggage_confirmed ? 'text-stone-800' : 'text-stone-400'}`}>自备行李箱确认</p>
                  <p className="text-[10px] text-stone-400 mt-1 leading-relaxed">本人已知晓活动当天需自备20寸及以上行李箱作为活动道具</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Referrer Section */}
        {config.referrer_config && config.referrer_config !== 'none' && (
          <section className="bg-white rounded-[32px] p-8 shadow-sm border border-stone-50 space-y-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-xl bg-natural-stone-50 flex items-center justify-center text-natural-primary">
                <Phone size={18} />
              </div>
              <h3 className="text-sm font-bold text-stone-800 tracking-wide">推荐人信息</h3>
            </div>

            <div className="space-y-6">
              {config.referrer_config === 'both' && (
                <div className="flex p-1.5 bg-stone-50 rounded-2xl gap-2">
                  {['机场', '其它'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleInputChange('referrer_type', type)}
                      className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all duration-300 ${
                        formData.referrer_type === type 
                        ? 'bg-white text-natural-primary shadow-sm' 
                        : 'text-stone-400 hover:text-stone-500'
                      }`}
                    >
                      {type} 推荐
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-6">
                <div className="group">
                  <label className="text-[10px] uppercase font-bold text-stone-400 tracking-widest block mb-1 ml-1 group-focus-within:text-natural-primary transition-colors">推荐人姓名</label>
                  <input 
                    type="text" 
                    value={formData.referrer_name}
                    onChange={(e) => handleInputChange('referrer_name', e.target.value)}
                    placeholder="请输入推荐人姓名"
                    className="w-full border-b border-stone-200 py-3 text-base focus:outline-none focus:border-natural-primary transition-colors bg-transparent placeholder:text-stone-300"
                  />
                </div>
                
                <AnimatePresence>
                  {(config.referrer_config === 'airport' || (config.referrer_config === 'both' && formData.referrer_type === '机场')) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-6 overflow-hidden"
                    >
                      <div className="group">
                        <label className="text-[10px] uppercase font-bold text-stone-400 tracking-widest block mb-1 ml-1 group-focus-within:text-natural-primary transition-colors">推荐人部门</label>
                        <input 
                          type="text" 
                          value={formData.referrer_dept}
                          onChange={(e) => handleInputChange('referrer_dept', e.target.value)}
                          placeholder="请输入推荐人所属部门"
                          className="w-full border-b border-stone-200 py-3 text-base focus:outline-none focus:border-natural-primary transition-colors bg-transparent placeholder:text-stone-300"
                        />
                      </div>
                      <div className="group">
                        <label className="text-[10px] uppercase font-bold text-stone-400 tracking-widest block mb-1 ml-1 group-focus-within:text-natural-primary transition-colors">推荐人联系方式</label>
                        <input 
                          type="tel" 
                          value={formData.referrer_phone}
                          onChange={(e) => handleInputChange('referrer_phone', e.target.value)}
                          placeholder="请输入其11位手机号码"
                          maxLength={11}
                          className="w-full border-b border-stone-200 py-3 text-base focus:outline-none focus:border-natural-primary transition-colors bg-transparent placeholder:text-stone-300"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </section>
        )}

        {/* Remarks Section */}
        <section className="bg-white rounded-[32px] p-8 shadow-sm border border-stone-50 space-y-4">
          <label className="text-[11px] uppercase tracking-wider text-stone-500 font-bold block font-sans">其他特别说明 (选填)</label>
          <textarea 
            value={formData.remarks}
            onChange={(e) => handleInputChange('remarks', e.target.value)}
            placeholder="如有其他特殊需求或随行说明，请在此输入..."
            className="w-full h-32 p-5 bg-stone-50/50 rounded-2xl text-sm border border-stone-100 focus:ring-1 focus:ring-natural-primary outline-none transition-all resize-none placeholder:text-stone-300"
          />
        </section>

        {/* Companions Section */}
        <section className="space-y-6">
          <div className="flex justify-between items-center px-2">
            <div className="flex items-center gap-2">
              <Plus size={16} className="text-natural-primary" />
              <label className="text-[11px] uppercase tracking-[0.2em] text-stone-500 font-bold">
                同行人资料 ({formData.companions.length})
              </label>
            </div>
            <button 
              type="button"
              onClick={addCompanion}
              className="px-4 py-2 bg-white rounded-full border border-stone-200 text-[10px] text-natural-primary font-bold uppercase tracking-widest hover:bg-natural-stone-50 transition-all shadow-sm active:scale-95"
            >
              + 新增随行人员
            </button>
          </div>

          <div className="space-y-6">
            {formData.companions.map((comp, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-8 bg-white rounded-[40px] border border-stone-100 relative shadow-sm"
              >
                <div className="flex items-center justify-between mb-8 border-b border-stone-50 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-natural-primary flex items-center justify-center text-xs font-bold text-white">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="text-[10px] font-bold text-stone-800 uppercase tracking-widest block">Companion</span>
                      <span className="text-[9px] text-stone-300 uppercase tracking-tighter">Sub-Profile</span>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => removeCompanion(idx)}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-stone-300 hover:text-natural-accent hover:bg-natural-stone-50 transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                
                <div className="space-y-6">
                   <div className="group">
                    <label className="text-[10px] uppercase font-bold text-stone-400 tracking-widest block mb-1 ml-1 group-focus-within:text-natural-primary transition-colors">姓名</label>
                    <input 
                      required
                      type="text" 
                      value={comp.name}
                      onChange={(e) => updateCompanion(idx, 'name', e.target.value)}
                      className="w-full border-b border-stone-200 py-2 text-base focus:outline-none focus:border-natural-primary transition-colors bg-transparent placeholder:text-stone-200"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="group">
                      <label className="text-[10px] uppercase font-bold text-stone-400 tracking-widest block mb-1 ml-1 group-focus-within:text-natural-primary transition-colors">证件类型</label>
                      <select 
                        value={comp.id_type}
                        onChange={(e) => updateCompanion(idx, 'id_type', e.target.value)}
                        className="w-full border-b border-stone-200 py-2 text-base focus:outline-none bg-transparent appearance-none"
                      >
                        <option value="身份证">身份证</option>
                        <option value="护照">护照</option>
                        <option value="港澳通行证">港澳通行证</option>
                      </select>
                    </div>
                    {comp.id_type === '护照' && (
                      <div className="group">
                        <label className="text-[10px] uppercase font-bold text-stone-400 tracking-widest block mb-2 ml-1">性别</label>
                        <div className="flex gap-4">
                          {['男', '女'].map((g) => (
                            <label key={g} className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="radio" 
                                checked={comp.gender === g}
                                onChange={() => updateCompanion(idx, 'gender', g)}
                                className="w-3 h-3 accent-natural-primary"
                              />
                              <span className="text-xs text-stone-600">{g}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="group">
                    <label className="text-[10px] uppercase font-bold text-stone-400 tracking-widest block mb-1 ml-1 group-focus-within:text-natural-primary transition-colors">证件号码</label>
                    <input 
                      required
                      type="text" 
                      value={comp.id_number}
                      onChange={(e) => updateCompanion(idx, 'id_number', e.target.value)}
                      placeholder={comp.id_type === '身份证' ? "18位号码" : "证件号"}
                      className="w-full border-b border-stone-200 py-2 text-base focus:outline-none focus:border-natural-primary transition-colors bg-transparent placeholder:text-stone-200"
                    />
                  </div>

                  <div className="group">
                    <label className="text-[10px] uppercase font-bold text-stone-400 tracking-widest block mb-1 ml-1 group-focus-within:text-natural-primary transition-colors">联系方式</label>
                    <input 
                      required
                      type="tel" 
                      value={comp.phone}
                      onChange={(e) => updateCompanion(idx, 'phone', e.target.value)}
                      placeholder="11位手机号"
                      maxLength={11}
                      className="w-full border-b border-stone-200 py-2 text-base focus:outline-none focus:border-natural-primary transition-colors bg-transparent placeholder:text-stone-200"
                    />
                  </div>

                  <DatePicker 
                    label="生日日期"
                    value={comp.birth_date}
                    onChange={(val) => updateCompanion(idx, 'birth_date', val)}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        <div className="p-8 bg-stone-900 rounded-[32px] flex gap-4 items-start border border-black shadow-xl">
          <div className="p-2 bg-natural-primary/20 rounded-full">
            <AlertCircle size={16} className="text-natural-primary" />
          </div>
          <div className="flex-1">
             <p className="text-[10px] font-bold text-white uppercase tracking-widest mb-1">隐私与服务条款</p>
             <p className="text-[10px] text-stone-400 leading-relaxed">
              预约信息仅用于盛乐机场转运体验统计。数据传输已加密处理，提交即代表您同意本平台的个人信息保护政策。
            </p>
          </div>
        </div>
      </form>


      {/* Submit Button */}
      <div className="sticky bottom-0 p-6 bg-white/80 backdrop-blur-md border-t border-stone-50 mt-auto">
        <button
          onClick={handleSubmit}
          className="w-full h-14 bg-natural-dark text-white rounded-2xl font-bold tracking-widest text-xs uppercase flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg shadow-stone-200"
        >
          <Send size={16} />
          提交
        </button>
      </div>
    </div>
  );
}
