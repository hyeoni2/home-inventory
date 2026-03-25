import { useState } from 'react';
import fs from 'fs';
import path from 'path';
import { Plus, Trash2, Package, X, AlertCircle, Home as HomeIcon, Check, Minus, Plus as PlusIcon, Edit3, ShoppingCart, Filter } from 'lucide-react';

export async function getServerSideProps() {
  const filePath = path.join(process.cwd(), 'data', 'inventory.md');
  const rawContent = fs.readFileSync(filePath, 'utf8');
  const rows = rawContent.split('\n').filter(line => line.includes('|') && !line.includes('---') && !line.startsWith('#'));
  
  const data = rows.slice(1).map((row, index) => {
    const cols = row.split('|').map(c => c.trim()).filter(Boolean);
    return { 
      id: index, 
      name: cols[0].replace(/\*\*/g, ''), 
      category: cols[1], 
      current: parseInt(cols[2]) || 0, 
      min: parseInt(cols[3]) || 1, 
      unit: cols[4] || '개', 
      status: cols[5] 
    };
  }).sort((a, b) => a.name.localeCompare(b.name, 'ko'));

  return { props: { initialData: data } };
}

export default function Home({ initialData }) {
  const [items, setItems] = useState(initialData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteIndex, setDeleteIndex] = useState(null);
  
  // 🏷️ 필터 상태 추가
  const [activeFilter, setActiveFilter] = useState('전체');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  const [categories, setCategories] = useState(['아기용품', '식재료', '생필품', '비상약']);
  const [newCatInput, setNewCatInput] = useState('');
  const [isAddingCat, setIsAddingCat] = useState(false);
  
  const units = ['개', '팩', '박스', '봉지', '통', 'ml', '캔', '롤'];
  const [formData, setFormData] = useState({ name: '', category: '아기용품', current: 0, min: 2, unit: '개' });

  // 🔍 필터링된 아이템 계산
  const filteredItems = items.filter(item => {
    const matchCategory = activeFilter === '전체' || item.category === activeFilter;
    const matchLowStock = showLowStockOnly ? item.current <= item.min : true;
    return matchCategory && matchLowStock;
  });

  const saveToFile = async (updatedItems) => {
    const sortedItems = [...updatedItems].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    let mdContent = `# 📦 우리집 재고 현황 (구리 두산)\n\n| 품목 | 카테고리 | 현재 | 최소 | 단위 | 상태 |\n| :--- | :--- | :---: | :---: | :--- | :--- |\n`;
    sortedItems.forEach(item => {
      const status = item.current <= item.min ? '🚨 부족' : '✅ 여유';
      mdContent += `| **${item.name}** | ${item.category} | ${item.current} | ${item.min} | ${item.unit} | ${status} |\n`;
    });

    const response = await fetch('/api/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: mdContent }),
    });

    if (response.ok) {
      setItems(sortedItems.map((item, idx) => ({ ...item, id: idx })));
    }
  };

  const openModal = (item = null) => {
    if (item) {
      setFormData({ ...item });
      setEditingId(item.id);
    } else {
      setFormData({ name: '', category: categories[0], current: 0, min: 2, unit: '개' });
      setEditingId(null);
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.name) return;
    let updated = editingId !== null 
      ? items.map(item => item.id === editingId ? formData : item)
      : [...items, formData];
    saveToFile(updated);
    setIsModalOpen(false);
  };

  const confirmDelete = () => {
    const updated = items.filter((_, i) => i !== deleteIndex);
    saveToFile(updated);
    setDeleteIndex(null);
  };

  const addCategory = () => {
    if (newCatInput && !categories.includes(newCatInput)) {
      setCategories([...categories, newCatInput]);
    }
    setNewCatInput('');
    setIsAddingCat(false);
  };

  const removeCategory = (catToDelete) => {
    if (categories.length <= 1) return;
    setCategories(categories.filter(c => c !== catToDelete));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f7] p-6 md:p-20 font-[-apple-system,system-ui,sans-serif] antialiased">
      <div className="max-w-3xl mx-auto">
        
        <header className="mb-16">
          <div className="flex justify-between items-end mb-12 pb-8 border-b border-white/5">
            <div className="space-y-4">
              <p className="text-[12px] font-bold text-[#86868b] tracking-[0.3em] pl-1.5 opacity-60 uppercase italic">Guri Doosan Dashboard</p>
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-[#1c1c1e] rounded-2xl flex items-center justify-center border border-white/5 shadow-2xl">
                  <HomeIcon size={30} className="text-[#0071e3]" />
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-white">재고관리<span className="text-[#0071e3]">.</span></h1>
              </div>
            </div>
            <button onClick={() => openModal()} className="bg-white text-black px-7 py-3.5 rounded-full text-[14px] font-bold hover:scale-105 transition-all shadow-lg">추가</button>
          </div>

          {/* 🔍 [신규] 필터 및 장바구니 섹션 */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between overflow-x-auto pb-2 no-scrollbar">
              <div className="flex gap-2">
                {['전체', ...categories].map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => setActiveFilter(cat)}
                    className={`px-5 py-2.5 rounded-full text-[13px] font-bold transition-all whitespace-nowrap ${activeFilter === cat ? 'bg-[#1c1c1e] text-white border border-white/20' : 'text-[#86868b] hover:text-white'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-bold border transition-all ${showLowStockOnly ? 'bg-[#ff453a]/20 border-[#ff453a] text-[#ff453a]' : 'border-white/10 text-[#86868b]'}`}
              >
                <ShoppingCart size={14} />
                부족한 것만
              </button>
            </div>
          </div>
        </header>

        <div className="space-y-8">
          {filteredItems.length > 0 ? filteredItems.map((item, idx) => (
            <div key={idx} className="group border-b border-white/5 pb-8 flex items-center justify-between transition-all">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-2.5">
                  <h3 className="text-[20px] font-bold text-white group-hover:text-[#0071e3] transition-colors cursor-pointer" onClick={() => openModal(item)}>{item.name}</h3>
                  {item.current <= item.min && <span className="bg-[#ff453a]/15 text-[#ff453a] text-[9px] font-black px-2 py-0.5 rounded-full border border-[#ff453a]/30">🚨</span>}
                </div>
                <div className="flex items-center gap-3 text-[13px] text-[#86868b]">
                  <span className="bg-white/5 px-2 py-0.5 rounded-md">{item.category}</span>
                  <span className="opacity-30">|</span>
                  <span>최소 {item.min}{item.unit} 필요</span>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-[#48484a] mb-0.5 uppercase tracking-tighter">현재</p>
                  <p className="text-[28px] font-bold text-white italic">{item.current}<span className="text-[14px] text-[#86868b] ml-1 not-italic font-normal">{item.unit}</span></p>
                </div>
                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => openModal(item)} className="p-2 text-[#86868b] hover:text-[#0071e3]"><Edit3 size={16} /></button>
                  <button onClick={() => setDeleteIndex(idx)} className="p-2 text-[#48484a] hover:text-[#ff453a]"><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          )) : (
            <div className="py-20 text-center opacity-30">
              <Package size={48} className="mx-auto mb-4" />
              <p>해당하는 품목이 없습니다.</p>
            </div>
          )}
        </div>

        {/* 모달 및 기타 UI는 이전과 동일 (삭제/수정 로직 포함) */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-6">
            <div className="bg-[#1c1c1e] border border-white/10 w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-2xl font-bold text-white tracking-tight">{editingId !== null ? '품목 수정' : '품목 등록'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-[#86868b] hover:text-white p-2 bg-white/5 rounded-full"><X size={22}/></button>
              </div>
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-[#86868b] uppercase tracking-widest ml-1">카테고리</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <div key={cat} className="group/cat relative">
                        <button onClick={() => setFormData({...formData, category: cat})} className={`px-4 py-2 rounded-xl text-[13px] font-bold transition-all ${formData.category === cat ? 'bg-[#0071e3] text-white shadow-lg' : 'bg-white/5 text-[#86868b]'}`}>{cat}</button>
                        <button onClick={(e) => { e.stopPropagation(); removeCategory(cat); }} className="absolute -top-1.5 -right-1.5 bg-[#ff453a] text-white rounded-full p-0.5 opacity-0 group-hover/cat:opacity-100 transition-opacity"><X size={10} /></button>
                      </div>
                    ))}
                    {isAddingCat ? (
                      <div className="flex items-center gap-1">
                        <input autoFocus value={newCatInput} onChange={(e)=>setNewCatInput(e.target.value)} onBlur={addCategory} onKeyDown={(e)=>e.key==='Enter'&&addCategory()} className="bg-white/5 border border-[#0071e3] rounded-xl px-3 py-1.5 text-[13px] text-white w-24 outline-none"/>
                      </div>
                    ) : (
                      <button onClick={() => setIsAddingCat(true)} className="px-4 py-2 rounded-xl border border-dashed border-white/20 text-[#86868b] text-[13px]"><Plus size={14}/></button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#86868b] uppercase tracking-widest ml-1">품목 이름</label>
                    <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-white/5 rounded-2xl p-4 text-white focus:outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#86868b] uppercase tracking-widest ml-1">단위</label>
                    <select value={formData.unit} onChange={(e) => setFormData({...formData, unit: e.target.value})} className="w-full bg-white/5 rounded-2xl p-4 text-white focus:outline-none appearance-none">
                      {units.map(u => <option key={u} value={u} className="bg-[#1c1c1e]">{u}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 text-center bg-white/5 rounded-2xl p-5">
                    <label className="text-[11px] font-bold text-[#86868b] uppercase tracking-widest block mb-3">현재 재고</label>
                    <div className="flex items-center justify-between">
                      <button onClick={() => setFormData(p => ({...p, current: Math.max(0, p.current - 1)}))} className="w-8 h-8 bg-white/5 rounded-full text-[#ff453a]">-</button>
                      <span className="text-2xl font-bold italic">{formData.current}</span>
                      <button onClick={() => setFormData(p => ({...p, current: p.current + 1}))} className="w-8 h-8 bg-white/5 rounded-full text-[#0071e3]">+</button>
                    </div>
                  </div>
                  <div className="space-y-2 text-center bg-white/5 rounded-2xl p-5">
                    <label className="text-[11px] font-bold text-[#86868b] uppercase tracking-widest block mb-3">최소 기준</label>
                    <div className="flex items-center justify-between">
                      <button onClick={() => setFormData(p => ({...p, min: Math.max(0, p.min - 1)}))} className="w-8 h-8 bg-white/5 rounded-full text-[#ff453a]">-</button>
                      <span className="text-2xl font-bold italic">{formData.min}</span>
                      <button onClick={() => setFormData(p => ({...p, min: p.min + 1}))} className="w-8 h-8 bg-white/5 rounded-full text-[#0071e3]">+</button>
                    </div>
                  </div>
                </div>
              </div>
              <button onClick={handleSave} className="w-full bg-[#0071e3] text-white font-bold py-5 rounded-2xl mt-12 shadow-xl active:scale-95 transition-all">저장하기</button>
            </div>
          </div>
        )}

        {deleteIndex !== null && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-xl p-6 text-center">
            <div className="bg-[#1c1c1e] w-full max-w-sm rounded-[32px] p-10 border border-white/10 shadow-2xl animate-in zoom-in-95">
              <h2 className="text-[20px] font-bold mb-8 text-white">삭제하시겠습니까?</h2>
              <div className="flex flex-col gap-3">
                <button onClick={confirmDelete} className="py-4 bg-[#ff453a] text-white rounded-2xl font-semibold transition-all">삭제</button>
                <button onClick={() => setDeleteIndex(null)} className="py-4 text-[#86868b] font-semibold">취소</button>
              </div>
            </div>
          </div>
        )}

        <footer className="mt-40 mb-10 text-center py-10 border-t border-white/5 opacity-40">
          <p className="text-[11px] text-[#86868b] tracking-[0.3em] uppercase italic">Olle Dashboard · Guri Doosan · 2026</p>
        </footer>
      </div>
    </div>
  );
}