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
  AlertCircle
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface Companion {
  name: string;
  id_type: string;
  id_number: string;
  phone: string;
  birth_date: string;
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
    if (config && formData.companions.length >= config.max_companions) {
      alert(`最多只能添加 ${config.max_companions} 位同行人`);
      return;
    }
    setFormData(prev => ({
      ...prev,
      companions: [...prev.companions, {
        name: '',
        id_type: '身份证',
        id_number: '',
        phone: '',
        birth_date: ''
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
    updated[index] = { ...updated[index], [field]: value };
    setFormData(prev => ({ ...prev, companions: updated }));
  };

  const handleOcr = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsOcrLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: {
            parts: [
              { inlineData: { mimeType: file.type, data: base64Data } },
              { text: "这是一个中国身份证图片。请从中解析并以 JSON 格式返回姓名(name)、身份证号码(idNumber)、出生日期(birthDate, 格式 YYYY-MM-DD)。仅返回 JSON 代码块。" }
            ]
          }
        });

        const text = response.text || '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          setFormData(prev => ({
            ...prev,
            name: parsed.name || prev.name,
            id_number: parsed.idNumber || prev.id_number,
            birth_date: parsed.birthDate || prev.birth_date
          }));
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      alert('OCR 识别失败，请手动录入');
    } finally {
      setIsOcrLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validations
    if (!formData.name || !formData.id_number || !formData.phone) {
      alert('请填写主要人员的必填信息');
      return;
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
        <h1 className="ml-2 text-sm font-bold uppercase tracking-widest text-stone-800">信息采集录入</h1>
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

            <input 
              required
              type="text" 
              value={formData.id_number}
              onChange={(e) => handleInputChange('id_number', e.target.value)}
              placeholder="证件号码"
              className="w-full border-b border-stone-200 py-3 text-sm focus:outline-none focus:border-natural-primary transition-colors bg-transparent"
            />

            <div className="grid grid-cols-2 gap-4">
              <input 
                required
                type="tel" 
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="手机号码"
                className="w-full border-b border-stone-200 py-3 text-sm focus:outline-none focus:border-natural-primary transition-colors bg-transparent"
              />
              <input 
                required
                type="date" 
                value={formData.birth_date}
                onChange={(e) => handleInputChange('birth_date', e.target.value)}
                className="w-full border-b border-stone-200 py-3 text-sm focus:outline-none focus:border-natural-primary transition-colors bg-transparent"
              />
            </div>
          </div>
        </div>

        {/* Travel Info Section */}
        <div className="space-y-6 pt-6 border-t border-stone-50">
          <label className="text-[11px] uppercase tracking-wider text-stone-400 font-bold block mb-4">出行偏好</label>

          {config.show_transport && (
            <div className="grid grid-cols-2 gap-3">
              {[ { value: '统一大巴车', label: '统一大巴' }, { value: '自驾', label: '自驾出行' } ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => handleInputChange('transport_type', item.value)}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    formData.transport_type === item.value 
                    ? 'border-natural-primary bg-natural-stone-50' 
                    : 'border-stone-100 opacity-60'
                  }`}
                >
                  <span className={`text-[10px] block font-bold uppercase mb-1 ${formData.transport_type === item.value ? 'text-natural-primary' : 'text-stone-400'}`}>
                    人员类型
                  </span>
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          )}

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

        {/* Companions Section */}
        <div className="space-y-6 pt-6 border-t border-stone-50">
          <div className="flex justify-between items-center mb-4">
            <label className="text-[11px] uppercase tracking-wider text-stone-400 font-bold">
              同行人 ({formData.companions.length}/{config.max_companions})
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
                    type="text" 
                    value={comp.name}
                    onChange={(e) => updateCompanion(idx, 'name', e.target.value)}
                    placeholder="成员姓名"
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
                    </select>
                    <input 
                      type="date" 
                      value={comp.birth_date}
                      onChange={(e) => updateCompanion(idx, 'birth_date', e.target.value)}
                      className="bg-transparent border-b border-stone-200 py-2 text-sm focus:outline-none"
                    />
                  </div>
                  <input 
                    type="text" 
                    value={comp.id_number}
                    onChange={(e) => updateCompanion(idx, 'id_number', e.target.value)}
                    placeholder="成员证件号"
                    className="w-full bg-white/50 border-b border-stone-200 py-2 px-1 text-sm focus:outline-none focus:border-natural-primary transition-colors"
                  />
                  <input 
                    type="tel" 
                    value={comp.phone}
                    onChange={(e) => updateCompanion(idx, 'phone', e.target.value)}
                    placeholder="联系电话 (选填)"
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
          完成并提交数据
        </button>
      </div>
    </div>
  );
}
