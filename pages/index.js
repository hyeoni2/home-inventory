import { useState } from 'react';
import fs from 'fs';
import path from 'path';
import { Plus, Trash2, Package, X, AlertCircle, Home as HomeIcon, Check, Minus, Plus as PlusIcon, Edit3 } from 'lucide-react';

export async function getServerSideProps() {
  const filePath = path.join(process.cwd(), 'data', 'inventory.md');
  const rawContent = fs.readFileSync(filePath, 'utf8');
  const rows = rawContent.split('\n').filter(line => line.includes('|') && !line.includes('---') && !line.startsWith('#'));
  const data = rows.slice(1).map((row, index) => {
    const cols = row.split('|').map(c => c.trim()).filter(Boolean);
    return { id: index, name: cols[0].replace(/\*\*/g, ''), category: cols[1], current: parseInt(cols[2]) || 0, min: parseInt(cols[3]) || 1, unit: cols[4], status: cols[5] };
  });
  return { props: { initialData: data } };
}

export default function Home({ initialData }) {
  const [items, setItems] = useState(initialData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null); // 수정 중인 아이템 ID
  const [deleteIndex, setDeleteIndex] = useState(null);
  const [categories, setCategories] = useState(['아기용품', '식재료', '생필품', '비상약']);
  const [newCatInput, setNewCatInput] = useState('');
  const [isAddingCat, setIsAddingCat] = useState(false);
  
  const initialForm = { name: '', category: '아기용품', current: 0, min: 2, unit: '팩' };
  const [formData, setFormData] = useState(initialForm);

  const saveToFile = async (updatedItems) => {
    let mdContent = `# 📦 우리집 재고 현황 (구리 두산)\n\n| 품목 | 카테고리 | 현재 | 최소 | 단위 | 상태 |\n| :--- | :--- | :---: | :---: | :--- | :--- |\n`;
    updatedItems.forEach(item => {
      const status = item.current <= item.min ? '🚨 부족' : '✅ 여유';
      mdContent += `| **${item.name}** | ${item.category} | ${item.current} | ${item.min} | ${item.unit} | ${status} |\n`;
    });
    await fetch('/api/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: mdContent }),
    });
    setItems(updatedItems.map((item, idx) => ({ ...item, id: idx })));
  };

  // 모달 열기 (추가/수정 공용)
  const openModal = (item = null) => {
    if (item) {
      setFormData({ ...item });
      setEditingId(item.id);
    } else {
      setFormData(initialForm);
      setEditingId(null);
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.name) return;
    let updated;
    if (editingId !== null) {
      updated = items.map(item => item.id === editingId ? formData : item);
    } else {
      updated = [...items, formData];
    }
    saveToFile(updated);
    setIsModalOpen(false);
  };

  const confirmDelete = () => {
    saveToFile(items.filter((_, i) => i !== deleteIndex));
    setDeleteIndex(null);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f7] p-6 md:p-20 font-[-apple-system,system-ui,sans-serif] antialiased">
      <div className="max-w-3xl mx-auto">
        
        <header className="flex justify-between items-end mb-24 pb-8 border-b border-white/5">
          <div className="space-y-4">
            <p className="text-[12px] font-bold text-[#86868b] tracking-[0.3em] pl-1.5 opacity-60 uppercase tracking-tighter italic">Guri Doosan Dashboard</p>
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-[#1c1c1e] rounded-2xl flex items-center justify-center border border-white/5 shadow-2xl">
                <HomeIcon size={30} className="text-[#0071e3]" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-white">우리집 재고관리<span className="text-[#0071e3]">.</span></h1>
            </div>
          </div>
          <button onClick={() => openModal()} className="bg-white text-black px-7 py-3.5 rounded-full text-[14px] font-bold hover:scale-105 transition-all active:scale-95 shadow-lg">품목 추가</button>
        </header>

        <div className="space-y-10">
          {items.map((item, idx) => (
            <div key={idx} className="group relative border-b border-white/10 pb-10 flex items-center justify-between transition-all">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-3">
                  <h3 className="text-[22px] font-bold tracking-tight text-white group-hover:text-[#0071e3] transition-colors cursor-pointer" onClick={() => openModal(item)}>{item.name}</h3>
                  {item.current <= item.min && (
                    <span className="bg-[#ff453a]/15 text-[#ff453a] text-[10px] font-black px-2.5 py-1 rounded-full border border-[#ff453a]/30 shadow-lg shadow-[#ff453a]/10">부족</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[14px] text-[#86868b] font-medium">
                  <Package size={14} className="opacity-40" />
                  <span>{item.category}</span>
                  <span className="w-1 h-1 rounded-full bg-white/20"></span>
                  <span>최소 유지: {item.min}{item.unit}</span>
                </div>
              </div>
              <div className="flex items-center gap-8 text-right">
                <div>
                  <span className="block text-[11px] font-bold text-[#48484a] uppercase tracking-widest mb-1">현재 재고</span>
                  <span className="text-[32px] font-bold text-white italic">{item.current}<span className="text-[16px] text-[#86868b] ml-1.5 font-normal not-italic">{item.unit}</span></span>
                </div>
                <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => openModal(item)} className="p-2 text-[#86868b] hover:text-[#0071e3]"><Edit3 size={18} /></button>
                  <button onClick={() => setDeleteIndex(idx)} className="p-2 text-[#48484a] hover:text-[#ff453a]"><Trash2 size={18} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-6">
            <div className="bg-[#1c1c1e] border border-white/10 w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-2xl font-bold text-white tracking-tight">{editingId !== null ? '품목 수정' : '품목 등록'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-[#86868b] hover:text-white p-2 bg-white/5 rounded-full"><X size={22}/></button>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-[#86868b] uppercase tracking-widest ml-1">카테고리</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <button key={cat} onClick={() => setFormData({...formData, category: cat})} className={`px-4 py-2 rounded-xl text-[13px] font-bold transition-all ${formData.category === cat ? 'bg-[#0071e3] text-white shadow-lg shadow-[#0071e3]/20' : 'bg-white/5 text-[#86868b] hover:bg-white/10'}`}>{cat}</button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-[#86868b] uppercase tracking-widest ml-1">품목 이름</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-white/5 rounded-2xl p-4 text-[16px] text-white focus:outline-none border border-transparent" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 text-center bg-white/5 rounded-2xl p-4">
                    <label className="text-[11px] font-bold text-[#86868b] uppercase tracking-widest block mb-2">현재 재고 ({formData.unit})</label>
                    <div className="flex items-center justify-between">
                      <button onClick={() => setFormData(p => ({...p, current: Math.max(0, p.current - 1)}))} className="p-2 bg-white/5 rounded-full text-[#ff453a]"><Minus size={18}/></button>
                      <span className="text-2xl font-bold italic">{formData.current}</span>
                      <button onClick={() => setFormData(p => ({...p, current: p.current + 1}))} className="p-2 bg-white/5 rounded-full text-[#0071e3]"><PlusIcon size={18}/></button>
                    </div>
                  </div>
                  <div className="space-y-2 text-center bg-white/5 rounded-2xl p-4">
                    <label className="text-[11px] font-bold text-[#86868b] uppercase tracking-widest block mb-2">최소 유지 ({formData.unit})</label>
                    <div className="flex items-center justify-between">
                      <button onClick={() => setFormData(p => ({...p, min: Math.max(0, p.min - 1)}))} className="p-2 bg-white/5 rounded-full text-[#ff453a]"><Minus size={18}/></button>
                      <span className="text-2xl font-bold italic">{formData.min}</span>
                      <button onClick={() => setFormData(p => ({...p, min: p.min + 1}))} className="p-2 bg-white/5 rounded-full text-[#0071e3]"><PlusIcon size={18}/></button>
                    </div>
                  </div>
                </div>
              </div>

              <button onClick={handleSave} className="w-full bg-[#0071e3] text-white font-bold py-5 rounded-2xl mt-10 text-[16px] shadow-xl shadow-[#0071e3]/20 active:scale-[0.98]">
                {editingId !== null ? '변경사항 저장하기' : '목록에 추가하기'}
              </button>
            </div>
          </div>
        )}

        {deleteIndex !== null && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-xl p-6">
            <div className="bg-[#1c1c1e] w-full max-w-sm rounded-[32px] p-10 text-center border border-white/10 shadow-2xl">
              <div className="w-16 h-16 bg-[#ff453a]/10 text-[#ff453a] rounded-full flex items-center justify-center mx-auto mb-8 border border-[#ff453a]/20"><AlertCircle size={32} /></div>
              <h2 className="text-[20px] font-bold mb-3 text-white">정말 삭제하시겠습니까?</h2>
              <div className="flex flex-col gap-3">
                <button onClick={confirmDelete} className="py-4 bg-[#ff453a] text-white rounded-2xl font-semibold hover:bg-[#ff3b30]">삭제</button>
                <button onClick={() => setDeleteIndex(null)} className="py-4 text-[#0071e3] font-semibold">취소</button>
              </div>
            </div>
          </div>
        )}

        <footer className="mt-40 mb-10 text-center py-10 border-t border-white/5 opacity-40">
          <p className="text-[11px] text-[#86868b] font-medium tracking-[0.3em] uppercase">Olle Dashboard · Guri Doosan · 2026</p>
        </footer>
      </div>
    </div>
  );
}