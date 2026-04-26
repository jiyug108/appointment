import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  Send, 
  User, 
  IdCard, 
  Phone, 
  Calendar,
  Car,
  MapPin,
  AlertCircle,
  Bus
} from 'lucide-react';
import { parseIdCard } from '../services/ocrService';

interface Companion {
  name: string;
  id_type: string;
  id_number: string;
  phone: string;
  birth_date: string;
  gender: string;
}

export default function FormPage() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOcrLoading, setIsOcrLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    id_type: '身份证',
    id_number: '',
    phone: '',
    birth_date: '',
    gender: '男',
    remarks: '',
    transport_type: '统一大巴车',
    car_number: '',
    pickup_location: '',
    luggage_confirmed: false,
    companions: [] as Companion[]
  });

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        setConfig(data);
        if (data.pickup_locations) {
          const locations = data.pickup_locations.split(',');
          if (locations.length > 0) {
            setFormData(prev => ({ ...prev, pickup_location: locations[0] }));
          }
        }
      });
  }, []);

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

  const DatePicker = ({ value, onChange, label }: { value: string, onChange: (val: string) => void, label?: string }) => {
    const [localY, setLocalY] = useState('');
    const [localM, setLocalM] = useState('');
    const [localD, setLocalD] = useState('');

    useEffect(() => {
      if (value) {
        const [y, m, d] = value.split('-');
        setLocalY(y || '');
        setLocalM(m ? parseInt(m).toString() : '');
        setLocalD(d ? parseInt(d).toString() : '');
      } else {
        setLocalY('');
        setLocalM('');
        setLocalD('');
      }
    }, [value]);
    
    const handleDatePartChange = (part: 'y' | 'm' | 'd', val: string) => {
      let newY = localY, newM = localM, newD = localD;
      if (part === 'y') { newY = val; setLocalY(val); }
      if (part === 'm') { newM = val; setLocalM(val); }
      if (part === 'd') { newD = val; setLocalD(val); }
      
      if (newY && newM && newD) {
        onChange(`${newY}-${newM.padStart(2, '0')}-${newD.padStart(2, '0')}`);
      } else {
        onChange('');
      }
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

  const handleOcr = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsOcrLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          const result = await parseIdCard(base64Data, file.type);
          
          setFormData(prev => ({
            ...prev,
            name: result.name || prev.name,
            id_number: result.idNumber || prev.id_number,
            birth_date: result.birthDate || prev.birth_date
          }));
        } catch (err) {
          console.error('OCR Process Error:', err);
          alert('识别失败，请确保图片清晰并手动核对');
        } finally {
          setIsOcrLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('File Reader Error:', err);
      alert('文件读取失败');
      setIsOcrLoading(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validations
    if (!formData.name || !formData.id_number || !formData.phone || !formData.birth_date) {
      alert('请完成主要人员的所有必填信息');
      return;
    }

    if (!validateAge(formData.birth_date)) {
      alert(`主填报人年龄不在允许范围内 (${config.min_age}-${config.max_age}周岁)`);
      return;
    }

    if (formData.transport_type === '自驾' && !formData.car_number) {
      alert('请填写车牌号码');
      return;
    }

    const incompleteCompanion = formData.companions.find(c => !c.name || !c.id_number || !c.phone || !c.birth_date);
    if (incompleteCompanion) {
      alert('所有同行人信息均为必填，请完善同行人资料');
      return;
    }

    for (const comp of formData.companions) {
      if (!validateAge(comp.birth_date)) {
        alert(`同行人 ${comp.name} 年龄不在允许范围内 (${config.min_age}-${config.max_age}周岁)`);
        return;
      }
    }

    if (!formData.luggage_confirmed) {
      alert('请确认行李携带事项');
      return;
    }

    try {
      const res = await fetch('/api/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
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
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-stone-50 flex items-center p-6">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-stone-400">
          <ArrowLeft size={20} />
        </button>
        <h1 className="ml-2 text-sm font-bold uppercase tracking-widest text-stone-800">预约</h1>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-10 flex-1">
        {/* Basic Info Section */}
        <div className="space-y-6">
          <label className="text-[11px] uppercase tracking-wider text-stone-400 font-bold block mb-4">基本人员信息</label>

          <div className="space-y-5">
            <div className="relative">
              <input 
                required
                type="text" 
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="姓名"
                className="w-full border-b border-stone-200 py-3 text-sm focus:outline-none focus:border-natural-primary transition-colors bg-transparent"
              />
            </div>

            <div className="flex gap-4">
              <select 
                value={formData.id_type}
                onChange={(e) => handleInputChange('id_type', e.target.value)}
                className="flex-1 border-b border-stone-200 py-3 text-sm focus:outline-none bg-transparent"
              >
                <option value="身份证">身份证</option>
                <option value="护照">护照</option>
                <option value="港澳通行证">港澳通行证</option>
              </select>
              {formData.id_type === '身份证' && (
                <button
                  type="button"
                  disabled={isOcrLoading}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-6 bg-natural-stone-100 rounded-full text-[10px] font-bold text-natural-dark h-10 mt-1 hover:bg-natural-primary hover:text-white transition-all active:scale-95"
                >
                  <Camera size={14} />
                  {isOcrLoading ? '识别中...' : 'OCR 识别'}
                </button>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleOcr} 
                accept="image/*" 
                className="hidden" 
              />
            </div>

            {formData.id_type === '护照' && (
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] uppercase font-bold text-stone-400 tracking-widest">性别</label>
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
                </div>
              </div>
            )}

            <input 
              required
              type="text" 
              value={formData.id_number}
              onChange={(e) => handleInputChange('id_number', e.target.value)}
              placeholder="证件号码"
              className="w-full border-b border-stone-200 py-3 text-sm focus:outline-none focus:border-natural-primary transition-colors bg-transparent"
            />

            <div className="grid grid-cols-1 gap-6">
              <input 
                required
                type="tel" 
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="手机号码"
                className="w-full border-b border-stone-200 py-3 text-sm focus:outline-none focus:border-natural-primary transition-colors bg-transparent"
              />
              <DatePicker 
                label="生日"
                value={formData.birth_date}
                onChange={(val) => handleInputChange('birth_date', val)}
              />
            </div>
          </div>
        </div>

        {/* Travel Info Section */}
        {config.show_transport && (
          <div className="space-y-6 pt-6 border-t border-stone-50">
            <label className="text-[11px] uppercase tracking-wider text-stone-400 font-bold block mb-4">出行方式</label>

            <div className="grid grid-cols-2 gap-3">
              {[ 
                { value: '统一大巴车', label: '统一大巴', icon: Bus }, 
                { value: '自驾', label: '自驾出行', icon: Car } 
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => handleInputChange('transport_type', item.value)}
                  className={`p-5 rounded-2xl border text-left transition-all flex items-center gap-4 ${
                    formData.transport_type === item.value 
                    ? 'border-natural-primary bg-natural-stone-50 ring-1 ring-natural-primary/20' 
                    : 'border-stone-100 opacity-60'
                  }`}
                >
                  <div className={`p-2 rounded-xl ${formData.transport_type === item.value ? 'bg-natural-primary text-white' : 'bg-stone-100 text-stone-400'}`}>
                    <item.icon size={20} />
                  </div>
                  <div>
                    <span className="text-xs font-bold block">{item.label}</span>
                    <span className="text-[10px] text-stone-400 font-medium tracking-tighter uppercase">Selection</span>
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
                >
                  <input 
                    type="text" 
                    value={formData.car_number}
                    onChange={(e) => handleInputChange('car_number', e.target.value)}
                    placeholder="车牌号码 (如: 京A88888)"
                    className="w-full border-b border-stone-200 py-3 text-sm focus:outline-none focus:border-natural-primary transition-colors bg-transparent"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {config.show_pickup && config.pickup_locations && (
              <div className="space-y-3">
                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">上车地点</span>
                <div className="flex flex-wrap gap-2">
                  {config.pickup_locations.split(',').map((loc: string) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => handleInputChange('pickup_location', loc)}
                      className={`px-4 py-2 rounded-full text-xs font-medium border transition-all ${
                        formData.pickup_location === loc
                        ? 'bg-natural-dark text-white border-natural-dark'
                        : 'bg-white text-stone-500 border-stone-100'
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
              className={`flex items-center gap-4 p-5 rounded-3xl cursor-pointer border transition-all ${
                formData.luggage_confirmed ? 'bg-natural-stone-50 border-natural-primary' : 'bg-stone-50 border-stone-100'
              }`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                formData.luggage_confirmed ? 'bg-natural-primary border-natural-primary text-white' : 'border-stone-300'
              }`}>
                {formData.luggage_confirmed && <Plus size={14} className="rotate-45" />}
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">行李确认</p>
                <p className="text-xs font-medium text-stone-700">我已知晓当天需自备行李箱</p>
              </div>
            </div>
          </div>
        )}

        {/* Remarks Section */}
        <div className="space-y-4 pt-6 border-t border-stone-50">
          <label className="text-[11px] uppercase tracking-wider text-stone-400 font-bold block">备注信息</label>
          <textarea 
            value={formData.remarks}
            onChange={(e) => handleInputChange('remarks', e.target.value)}
            placeholder="如有其他特殊需求或说明，请在此输入..."
            className="w-full h-24 p-4 bg-stone-50 rounded-2xl text-sm border-none focus:ring-1 focus:ring-natural-primary outline-none transition-all resize-none"
          />
        </div>

        {/* Companions Section */}
        <div className="space-y-6 pt-6 border-t border-stone-50">
          <div className="flex justify-between items-center mb-4">
            <label className="text-[11px] uppercase tracking-wider text-stone-400 font-bold">
              同行人 ({formData.companions.length})
            </label>
            <button 
              type="button"
              onClick={addCompanion}
              className="text-[10px] text-natural-accent font-bold uppercase tracking-widest hover:opacity-70"
            >
              + 新增成员
            </button>
          </div>

          <div className="space-y-4">
            {formData.companions.map((comp, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 bg-natural-stone-50 rounded-[32px] border border-stone-100 relative group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-natural-primary border border-stone-100">
                      {idx + 1}
                    </span>
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-tighter">Companion Member</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => removeCompanion(idx)}
                    className="text-stone-300 hover:text-natural-accent transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div className="grid gap-4">
                  <input 
                    required
                    type="text" 
                    value={comp.name}
                    onChange={(e) => updateCompanion(idx, 'name', e.target.value)}
                    placeholder="成员姓名 (必填)"
                    className="w-full bg-white/50 border-b border-stone-200 py-2 px-1 text-sm focus:outline-none focus:border-natural-primary transition-colors"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <select 
                      value={comp.id_type}
                      onChange={(e) => updateCompanion(idx, 'id_type', e.target.value)}
                      className="bg-transparent border-b border-stone-200 py-2 text-sm focus:outline-none"
                    >
                      <option value="身份证">身份证</option>
                      <option value="护照">护照</option>
                      <option value="港澳通行证">港澳通行证</option>
                    </select>
                    {comp.id_type === '护照' && (
                      <div className="flex gap-4 items-center">
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
                    )}
                  </div>
                  <DatePicker 
                    label="生日"
                    value={comp.birth_date}
                    onChange={(val) => updateCompanion(idx, 'birth_date', val)}
                  />
                  <input 
                    required
                    type="text" 
                    value={comp.id_number}
                    onChange={(e) => updateCompanion(idx, 'id_number', e.target.value)}
                    placeholder="成员证件号 (必填)"
                    className="w-full bg-white/50 border-b border-stone-200 py-2 px-1 text-sm focus:outline-none focus:border-natural-primary transition-colors"
                  />
                  <input 
                    required
                    type="tel" 
                    value={comp.phone}
                    onChange={(e) => updateCompanion(idx, 'phone', e.target.value)}
                    placeholder="联系电话 (必填)"
                    className="w-full bg-white/50 border-b border-stone-200 py-2 px-1 text-sm focus:outline-none focus:border-natural-primary transition-colors"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="p-5 bg-[#FAF9F5] rounded-3xl flex gap-3 items-start border border-stone-100">
          <AlertCircle size={16} className="text-natural-accent mt-0.5 shrink-0" />
          <p className="text-[10px] text-stone-500 leading-normal">
            信息仅用于活动投保与统计。数据传输已加密，系统严格遵守隐私政策。
          </p>
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
