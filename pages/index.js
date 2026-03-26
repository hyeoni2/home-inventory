import { useState, useMemo, useRef, useEffect } from 'react';
import fs from 'fs';
import path from 'path';
import { Plus, Trash2, Package, X, AlertCircle, Home as HomeIcon, Check, Minus, Plus as PlusIcon, Edit3, ShoppingCart, Search, ChevronDown, ChevronUp } from 'lucide-react';

export async function getServerSideProps({ res }) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  const filePath = path.join(process.cwd(), 'data', 'inventory.md');
  const rawContent = fs.readFileSync(filePath, 'utf8');
  const rows = rawContent.split('\n').filter(line => line.includes('|') && !line.includes('---') && !line.startsWith('#'));
  const data = rows.slice(1).map((row, index) => {
    const cols = row.split('|').map(c => c.trim()).filter(Boolean);
    return { id: index, name: cols[0].replace(/\*\*/g, ''), category: cols[1], current: parseInt(cols[2]) || 0, min: parseInt(cols[3]) || 1, unit: cols[4] || '개', status: cols[5] };
  }).sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  return { props: { initialData: data } };
}

export default function Home({ initialData }) {
  const [items, setItems] = useState(initialData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteIndex, setDeleteIndex] = useState(null);
  
  // ✨ 메시지 알림 상태
  const [toastMessage, setToastMessage] = useState('');

  const [activeFilter, setActiveFilter] = useState('전체');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCatExpanded, setIsCatExpanded] = useState(false);
  const [needsMoreButton, setNeedsMoreButton] = useState(false);
  const catContainerRef = useRef(null);

  const [categories, setCategories] = useState(['아기용품', '식재료', '생필품', '비상약'].sort((a, b) => a.localeCompare(b, 'ko')));
  const [newCatInput, setNewCatInput] = useState('');
  const [isAddingCat, setIsAddingCat] = useState(false);
  
  const units = ['개', '팩', '박스', '봉지', '통', 'ml', '캔', '롤'];
  const [formData, setFormData] = useState({ name: '', category: '아기용품', current: 0, min: 2, unit: '개' });

  useEffect(() => {
    if (catContainerRef.current) {
      const { scrollHeight } = catContainerRef.current;
      setNeedsMoreButton(scrollHeight > 90);
    }
  }, [categories]);

  // ✨ 토스트 메시지 자동 삭제
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchCategory = activeFilter === '전체' || item.category === activeFilter;
      const matchLowStock = showLowStockOnly ? item.current <= item.min : true;
      const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCategory && matchLowStock && matchSearch;
    });
  }, [items, activeFilter, showLowStockOnly, searchTerm]);

  const saveToFile = async (updatedItems) => {
    // 1. 화면에 먼저 반영 (체감 속도 즉시)
    setItems(updatedItems);

    const sortedItems = [...updatedItems].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    let mdContent = `# 📦 우리집 재고 현황 (구리 두산)\n\n| 품목 | 카테고리 | 현재 | 최소 | 단위 | 상태 |\n| :--- | :--- | :---: | :---: | :--- | :--- |\n`;
    sortedItems.forEach(item => {
      const status = item.current <= item.min ? '🚨 부족' : '✅ 여유';
      mdContent += `| **${item.name}** | ${item.category} | ${item.current} | ${item.min} | ${item.unit} | ${status} |\n`;
    });

    try {
      const response = await fetch('/api/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: mdContent }),
      });

      if (response.ok) {
        setToastMessage('수정이 완료되었습니다! ✅');
      } else {
        setToastMessage('저장 실패! 다시 시도해주세요. ❌');
      }
    } catch (error) {
      setToastMessage('연결 오류가 발생했습니다. ❌');
    }
  };

  const handleQuickAdjust = (id, val) => {
    const updated = items.map(item => item.id === id ? { ...item, current: Math.max(0, val) } : item);
    saveToFile(updated);
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
    let updated = editingId !== null ? items.map(item => item.id === editingId ? formData : item) : [...items, { ...formData, id: Date.now() }];
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
      setCategories([...categories, newCatInput].sort((a, b) => a.localeCompare(b, 'ko')));
    }
    setNewCatInput('');
    setIsAddingCat(false);
  };

  const removeCategory = (catToDelete) => {
    if (categories.length <= 1) return;
    setCategories(categories.filter(c => c !== catToDelete).sort((a, b) => a.localeCompare(b, 'ko')));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f7] p-4 md:p-20 font-[-apple-system,system-ui,sans-serif] antialiased overflow-x-hidden">
      <div className="max-w-3xl mx-auto w-full">
        
        {/* ✨ 상단 알림 메시지 (Toast) */}
        {toastMessage && (
          <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] bg-[#0071e3] text-white px-6 py-3 rounded-full font-bold shadow-2xl animate-in fade-in slide-in-from-top-4">
            {toastMessage}
          </div>
        )}

        <header className="mb-8 md:mb-16">
          <div className="flex justify-between items-end mb-8 md:mb-12 pb-6 border-b border-white/5">
            <div className="space-y-2">
              <p className="text-[10px] md:text-[12px] font-bold text-[#86868b] tracking-[0.2em] opacity-60 uppercase italic">GURI DOOSAN DASHBOARD</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 md:w-14 md:h-14 bg-[#1c1c1e] rounded-xl flex items-center justify-center border border-white/5 shadow-2xl">
                  <HomeIcon size={20} className="text-[#0071e3] md:w-[30px] md:h-[30px]" />
                </div>
                <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-white">우리집 재고관리<span className="text-[#0071e3]">.</span></h1>
              </div>
            </div>
            <button onClick={() => openModal()} className="bg-white text-black px-5 md:px-7 py-2 md:py-3 rounded-full text-[13px] md:text-[14px] font-bold hover:scale-105 transition-all shadow-lg active:scale-95">추가</button>
          </div>

          <div className="flex flex-col gap-4">
            <div className="relative group">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#48484a] group-focus-within:text-[#0071e3]" />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="품목 검색..." className="w-full bg-[#1c1c1e] border border-white/10 rounded-full py-3 pl-12 pr-6 text-[14px] text-white focus:outline-none focus:border-[#0071e3]/50 transition-all"/>
            </div>

            <div className="flex flex-col gap-3">
              <div ref={catContainerRef} className={`flex flex-wrap gap-2 items-center transition-all duration-300 overflow-hidden ${isCatExpanded ? 'max-h-[500px]' : 'max-h-[85px] md:max-h-[100px]'}`}>
                {['전체', ...categories].map(cat => (
                  <button key={cat} onClick={() => setActiveFilter(cat)} className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-bold transition-all ${activeFilter === cat ? 'bg-[#1c1c1e] text-white border border-white/20' : 'text-[#86868b] hover:text-white'}`}>
                    {cat}
                    {categoryCounts[cat] > 0 && <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-black ${activeFilter === cat ? 'bg-[#ff453a] text-white' : 'bg-[#ff453a]/15 text-[#ff453a]'}`}>{categoryCounts[cat]}</span>}
                  </button>
                ))}
                {needsMoreButton && (
                  <button onClick={() => setIsCatExpanded(!isCatExpanded)} className="flex items-center gap-1 px-3 py-2 text-[11px] font-bold text-[#0071e3] hover:opacity-80 transition-all">
                    {isCatExpanded ? <><ChevronUp size={14}/> 접기</> : <><ChevronDown size={14}/> 더보기</>}
                  </button>
                )}
              </div>
              <button onClick={() => setShowLowStockOnly(!showLowStockOnly)} className={`flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 rounded-full text-[12px] font-bold border transition-all ${showLowStockOnly ? 'bg-[#ff453a]/20 border-[#ff453a] text-[#ff453a]' : 'bg-[#1c1c1e] border-white/10 text-[#86868b]'}`}>
                <ShoppingCart size={14} /> 구매가 필요해요!!
              </button>
            </div>
          </div>
        </header>

        <div className="space-y-4 md:space-y-6">
          {filteredItems.map((item, idx) => (
            <div key={idx} className={`group relative border border-white/5 rounded-2xl md:rounded-3xl p-5 md:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${item.current <= item.min ? 'bg-[#ff453a]/5' : 'bg-[#1c1c1e]/50'}`}>
              {item.current <= item.min && <div className="absolute left-0 top-4 bottom-4 w-1 bg-[#ff453a] rounded-r-full shadow-lg shadow-[#ff453a]/30"></div>}
              <div className="flex-1 w-full sm:w-auto">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-[18px] md:text-[21px] font-bold text-white group-hover:text-[#0071e3] transition-colors cursor-pointer" onClick={() => openModal(item)}>{item.name}</h3>
                  {item.current <= item.min && <span className="text-[#ff453a] text-[9px] font-black px-1.5 py-0.5 rounded-full border border-[#ff453a]/30 bg-[#ff453a]/15">🚨 부족</span>}
                </div>
                <div className="flex items-center gap-2 text-[12px] text-[#86868b]">
                  <span className="bg-white/5 px-2 py-0.5 rounded-md font-medium text-white/80 shrink-0">{item.category}</span>
                  <span className="opacity-20">|</span>
                  <span className="truncate">기준: {item.min}{item.unit}</span>
                </div>
              </div>
              <div className="flex items-center justify-between w-full sm:w-auto gap-4 md:gap-8">
                <div className="flex items-center gap-2 md:gap-3 bg-black rounded-full p-1 border border-white/5 shadow-inner">
                  <button onClick={() => handleQuickAdjust(item.id, item.current - 1)} className="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-[#ff453a] active:scale-90 font-bold text-lg">-</button>
                  <div className="w-12 md:w-16">
                    <input type="number" value={item.current} onChange={(e) => handleQuickAdjust(item.id, parseInt(e.target.value) || 0)} className="w-full bg-transparent text-[22px] md:text-[28px] font-bold text-white italic text-center focus:outline-none focus:text-[#0071e3]"/>
                  </div>
                  <button onClick={() => handleQuickAdjust(item.id, item.current + 1)} className="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-[#0071e3] active:scale-90 font-bold text-lg">+</button>
                </div>
                <div className="flex items-center gap-1 pr-1">
                  <button onClick={() => openModal(item)} className="p-2 text-[#86868b] hover:text-[#0071e3] transition-colors"><Edit3 size={16} /></button>
                  <button onClick={() => setDeleteIndex(idx)} className="p-2 text-[#48484a] hover:text-[#ff453a] transition-colors"><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 모달 UI */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 overflow-y-auto">
            <div className="bg-[#1c1c1e] border border-white/10 w-full max-w-lg rounded-[1.5rem] p-6 md:p-10 shadow-2xl my-auto animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-6 md:mb-10">
                <h2 className="text-xl md:text-2xl font-bold text-white">{editingId !== null ? '품목 수정' : '품목 등록'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-[#86868b] p-2 bg-white/5 rounded-full"><X size={20}/></button>
              </div>
              <div className="space-y-6 md:space-y-8">
                <div className="space-y-3 text-left">
                  <label className="text-[10px] font-bold text-[#86868b] uppercase tracking-widest ml-1">카테고리</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <div key={cat} className="group/cat relative shrink-0">
                        <button onClick={() => setFormData({...formData, category: cat})} className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${formData.category === cat ? 'bg-[#0071e3] text-white shadow-lg' : 'bg-white/5 text-[#86868b]'}`}>{cat}</button>
                        <button onClick={(e) => { e.stopPropagation(); removeCategory(cat); }} className="absolute -top-1 -right-1 bg-[#ff453a] text-white rounded-full p-0.5 opacity-100"><X size={8} /></button>
                      </div>
                    ))}
                    {isAddingCat ? (
                      <input autoFocus value={newCatInput} onChange={(e)=>setNewCatInput(e.target.value)} onBlur={addCategory} onKeyDown={(e)=>e.key==='Enter'&&addCategory()} className="bg-white/5 border border-[#0071e3] rounded-lg px-2 py-1 text-[12px] text-white w-20 outline-none"/>
                    ) : (
                      <button onClick={() => setIsAddingCat(true)} className="px-3 py-1.5 rounded-lg border border-dashed border-white/20 text-[#86868b] text-[12px]"><Plus size={12}/></button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#86868b] uppercase tracking-widest ml-1">품목 이름</label>
                    <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-white/10 rounded-xl p-3 text-[14px] text-white outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#86868b] uppercase tracking-widest ml-1">단위</label>
                    <select value={formData.unit} onChange={(e) => setFormData({...formData, unit: e.target.value})} className="w-full bg-white/10 rounded-xl p-3 text-[14px] text-white outline-none appearance-none">
                      {units.map(u => <option key={u} value={u} className="bg-[#1c1c1e] text-white">{u}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                    <label className="text-[10px] font-bold text-[#86868b] uppercase tracking-widest block mb-3 text-center">현재 재고</label>
                    <div className="flex items-center justify-between px-2">
                      <button onClick={() => setFormData(p => ({...p, current: Math.max(0, p.current - 1)}))} className="w-8 h-8 rounded-full text-[#ff453a] bg-white/5">-</button>
                      <input type="number" value={formData.current} onChange={(e) => setFormData({...formData, current: parseInt(e.target.value) || 0})} className="w-12 bg-transparent text-2xl font-bold text-center text-white outline-none"/>
                      <button onClick={() => setFormData(p => ({...p, current: p.current + 1}))} className="w-8 h-8 rounded-full text-[#0071e3] bg-white/5">+</button>
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                    <label className="text-[10px] font-bold text-[#86868b] uppercase tracking-widest block mb-3 text-center">최소 유지</label>
                    <div className="flex items-center justify-between px-2">
                      <button onClick={() => setFormData(p => ({...p, min: Math.max(0, p.min - 1)}))} className="w-8 h-8 rounded-full text-[#ff453a] bg-white/5">-</button>
                      <input type="number" value={formData.min} onChange={(e) => setFormData({...formData, min: parseInt(e.target.value) || 0})} className="w-12 bg-transparent text-2xl font-bold text-center text-white outline-none"/>
                      <button onClick={() => setFormData(p => ({...p, min: p.min + 1}))} className="w-8 h-8 rounded-full text-[#0071e3] bg-white/5">+</button>
                    </div>
                  </div>
                </div>
              </div>
              {/* ✨ '수정하기' 문구로 변경 */}
              <button onClick={handleSave} className="w-full bg-[#0071e3] text-white font-bold py-4 rounded-xl mt-8 shadow-xl active:scale-95 transition-all text-[15px]">
                {editingId !== null ? '수정하기' : '등록하기'}
              </button>
            </div>
          </div>
        )}

        {deleteIndex !== null && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
            <div className="bg-[#1c1c1e] w-full max-w-xs rounded-[2rem] p-8 text-center border border-white/10 shadow-2xl animate-in zoom-in-95">
              <h2 className="text-[18px] font-bold mb-8 text-white tracking-tight">정말 삭제하시겠습니까?</h2>
              <div className="flex flex-col gap-3">
                <button onClick={confirmDelete} className="py-4 bg-[#ff453a] text-white rounded-xl font-bold transition-all shadow-lg shadow-[#ff453a]/20">삭제</button>
                <button onClick={() => setDeleteIndex(null)} className="py-4 text-[#86868b] font-medium hover:text-white">취소</button>
              </div>
            </div>
          </div>
        )}

        <footer className="mt-20 mb-10 text-center py-6 border-t border-white/5 opacity-40">
          <p className="text-[10px] text-[#86868b] tracking-[0.2em] uppercase italic">GURI DOOSAN DASHBOARD · 2026</p>
        </footer>
      </div>
    </div>
  );
}