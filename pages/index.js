import { useState, useMemo, useRef, useEffect } from 'react';
import fs from 'fs';
import path from 'path';
import { Plus, Trash2, Package, X, AlertCircle, Home as HomeIcon, Check, Minus, Plus as PlusIcon, Edit3, ShoppingCart, Search, ChevronDown, ChevronUp, Bell, Settings2, Copy } from 'lucide-react';

export async function getServerSideProps({ res }) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  try {
    const filePath = path.join(process.cwd(), 'data', 'inventory.md');
    const rawContent = fs.readFileSync(filePath, 'utf8');
    const rows = rawContent.split('\n').filter(line => line.includes('|') && !line.includes('---') && !line.startsWith('#'));
    const data = rows.slice(1).map((row, index) => {
      const cols = row.split('|').map(c => c.trim()).filter(Boolean);
      return { id: index, name: cols[0]?.replace(/\*\*/g, '') || '이름 없음', category: cols[1] || '미분류', current: parseInt(cols[2]) || 0, min: parseInt(cols[3]) || 1, unit: cols[4] || '개' };
    }).sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    return { props: { initialData: data } };
  } catch (e) {
    return { props: { initialData: [] } };
  }
}

export default function Home({ initialData }) {
  const [items, setItems] = useState(initialData || []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteIndex, setDeleteIndex] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [activeFilter, setActiveFilter] = useState('전체');
  const [filterMode, setFilterMode] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCatExpanded, setIsCatExpanded] = useState(false);
  const [needsMoreButton, setNeedsMoreButton] = useState(false);
  const catContainerRef = useRef(null);
  const [isCatManageMode, setIsCatManageMode] = useState(false);
  const [catEditingName, setCatEditingName] = useState({ old: '', new: '' });

  const categories = useMemo(() => {
    const uniqueCats = Array.from(new Set(items.map(item => item.category)));
    return uniqueCats.sort((a, b) => a.localeCompare(b, 'ko'));
  }, [items]);

  const categoryCounts = useMemo(() => {
    const counts = { '전체': items.filter(i => i.current <= i.min).length };
    categories.forEach(cat => {
      counts[cat] = items.filter(i => i.category === cat && i.current <= i.min).length;
    });
    return counts;
  }, [items, categories]);

  const units = ['개', '팩', '박스', '봉지', '통', 'ml', '캔', '롤'];
  const [formData, setFormData] = useState({ name: '', category: '', current: 0, min: 2, unit: '개' });
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');

  useEffect(() => {
    if (catContainerRef.current) {
      const { scrollHeight } = catContainerRef.current;
      setNeedsMoreButton(scrollHeight > 95);
    }
  }, [categories]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const saveToFile = async (updatedItems) => {
    const finalizedItems = updatedItems.map((item, idx) => ({ ...item, id: idx }));
    setItems(finalizedItems);
    const sortedItems = [...finalizedItems].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    let mdContent = `# 📦 우리집 재고 현황 (구리 두산)\n\n| 품목 | 카테고리 | 현재 | 최소 | 단위 | 상태 |\n| :--- | :--- | :---: | :---: | :--- | :--- |\n`;
    sortedItems.forEach(item => {
      let statusText = item.current < item.min ? '🚨 부족' : item.current === item.min ? '⚠️ 준비' : '✅ 여유';
      mdContent += `| **${item.name}** | ${item.category} | ${item.current} | ${item.min} | ${item.unit} | ${statusText} |\n`;
    });
    try {
      const response = await fetch('/api/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: mdContent }),
      });
      if (response.ok) setToastMessage('저장 완료');
    } catch (error) {
      setToastMessage('저장 오류');
    }
  };

  // ✨ 신규 기능: 부족 품목 목록 복사
  const copyShoppingList = () => {
    const lowStockItems = items.filter(item => item.current < item.min);
    if (lowStockItems.length === 0) {
      setToastMessage('부족한 품목이 없습니다! 🎉');
      return;
    }
    
    let text = `📦 구리 두산 장보기 목록\n\n`;
    lowStockItems.forEach((item, index) => {
      text += `${index + 1}. ${item.name} (${item.current}/${item.min}${item.unit} 보유)\n`;
    });
    
    navigator.clipboard.writeText(text).then(() => {
      setToastMessage('목록이 복사되었습니다! ✅');
    }).catch(() => {
      setToastMessage('복사 실패 ❌');
    });
  };

  const handleSave = () => {
    if (!formData.name || !formData.category) return;
    let updated = editingId !== null 
      ? items.map(item => item.id === editingId ? { ...formData } : item)
      : [...items, { ...formData, id: items.length }];
    saveToFile(updated);
    setIsModalOpen(false);
  };

  const handleQuickAdjust = (id, val) => {
    const updated = items.map(item => item.id === id ? { ...item, current: Math.max(0, val) } : item);
    saveToFile(updated);
  };

  const renameCategory = (oldName, newName) => {
    if (!newName || oldName === newName) { setCatEditingName({ old: '', new: '' }); return; }
    const updated = items.map(item => item.category === oldName ? { ...item, category: newName } : item);
    saveToFile(updated);
    setCatEditingName({ old: '', new: '' });
  };

  const deleteCategory = (catName) => {
    const updated = items.map(item => item.category === catName ? { ...item, category: '미분류' } : item);
    saveToFile(updated);
  };

  const openModal = (item = null) => {
    if (item) {
      setFormData({ ...item });
      setEditingId(item.id);
    } else {
      setFormData({ name: '', category: categories[0] || '미분류', current: 0, min: 2, unit: '개' });
      setEditingId(null);
    }
    setIsModalOpen(true);
    setIsAddingCat(false);
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchCategory = activeFilter === '전체' || item.category === activeFilter;
      const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      let matchStatus = true;
      if (filterMode === 'low') matchStatus = item.current < item.min;
      if (filterMode === 'ready') matchStatus = item.current === item.min;
      return matchCategory && matchSearch && matchStatus;
    });
  }, [items, activeFilter, filterMode, searchTerm]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f7] p-4 md:p-20 font-[-apple-system,system-ui,sans-serif] antialiased overflow-x-hidden relative">
      <div className="max-w-3xl mx-auto w-full">
        {toastMessage && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 md:left-auto md:right-10 md:translate-x-0 z-[100] bg-white/10 backdrop-blur-xl border border-white/20 text-white px-6 py-3.5 rounded-2xl font-medium shadow-2xl animate-in fade-in slide-in-from-bottom-4 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#0071e3] shadow-[0_0_10px_#0071e3]"></div>
            <span className="text-[14px] tracking-tight">{toastMessage}</span>
          </div>
        )}

        <header className="mb-10 md:mb-16">
          <div className="flex justify-between items-end mb-8 md:mb-12 pb-6 border-b border-white/5 text-left">
            <div className="space-y-2">
              <p className="text-[10px] md:text-[12px] font-bold text-[#86868b] tracking-[0.2em] opacity-60 uppercase italic">GURI DOOSAN DASHBOARD</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 md:w-14 md:h-14 bg-[#1c1c1e] rounded-xl flex items-center justify-center border border-white/5 shadow-2xl">
                  <HomeIcon size={20} className="text-[#0071e3] md:w-[30px] md:h-[30px]" />
                </div>
                <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-white">우리집 재고관리<span className="text-[#0071e3]">.</span></h1>
              </div>
            </div>
            <button onClick={() => openModal()} className="bg-white text-black px-6 md:px-8 py-2 md:py-3.5 rounded-full text-[14px] font-bold hover:scale-105 transition-all shadow-lg active:scale-95">추가</button>
          </div>

          <div className="flex flex-col gap-6">
            <div className="relative group">
              <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#48484a] group-focus-within:text-[#0071e3]" />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="품목 검색..." className="w-full bg-[#1c1c1e] border border-white/10 rounded-full py-4 pl-14 pr-6 text-[15px] text-white focus:outline-none focus:border-[#0071e3]/50 transition-all"/>
            </div>

            <div className="flex flex-col gap-4 text-left">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] font-bold text-[#48484a] uppercase tracking-widest pl-1">Category</p>
                <button onClick={() => setIsCatManageMode(!isCatManageMode)} className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full transition-all ${isCatManageMode ? 'bg-[#0071e3] text-white' : 'text-[#86868b] hover:text-white bg-white/5'}`}>
                  <Settings2 size={12} /> {isCatManageMode ? '완료' : '편집'}
                </button>
              </div>

              <div ref={catContainerRef} className={`flex flex-wrap gap-2 items-center transition-all duration-300 overflow-hidden ${isCatExpanded ? 'max-h-[500px]' : 'max-h-[105px]'}`}>
                <button onClick={() => {setActiveFilter('전체'); setIsCatManageMode(false);}} className={`px-4 py-2.5 rounded-full text-[13px] font-bold border transition-all ${activeFilter === '전체' && !isCatManageMode ? 'bg-[#1c1c1e] text-white border-white/30' : 'text-[#48484a] border-transparent'}`}>전체</button>
                {categories.map(cat => (
                  <div key={cat} className="flex items-center gap-1">
                    {catEditingName.old === cat ? (
                      <div className="flex items-center bg-[#1c1c1e] border border-[#0071e3] rounded-full px-3 py-1.5">
                        <input autoFocus value={catEditingName.new} onChange={(e) => setCatEditingName({ ...catEditingName, new: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && renameCategory(cat, catEditingName.new)} onBlur={() => renameCategory(cat, catEditingName.new)} className="bg-transparent text-[13px] text-white outline-none w-20" />
                        <Check size={14} className="text-[#0071e3] cursor-pointer" onClick={() => renameCategory(cat, catEditingName.new)} />
                      </div>
                    ) : (
                      <>
                        <button onClick={() => !isCatManageMode && setActiveFilter(cat)} className={`px-4 py-2.5 rounded-full text-[13px] font-bold border transition-all ${activeFilter === cat && !isCatManageMode ? 'bg-[#1c1c1e] text-white border-white/30' : 'text-[#86868b] border-transparent hover:text-white'}`}>
                          {cat} {categoryCounts[cat] > 0 && <span className={`text-[10px] ml-1.5 px-1.5 py-0.5 rounded-md font-black ${activeFilter === cat ? 'bg-[#ff453a] text-white' : 'bg-[#ff453a]/20 text-[#ff453a]'}`}>{categoryCounts[cat]}</span>}
                        </button>
                        {isCatManageMode && (
                          <div className="flex items-center gap-1 ml-1 animate-in slide-in-from-left-2">
                            <button onClick={() => setCatEditingName({ old: cat, new: cat })} className="p-1.5 bg-white/5 rounded-full text-[#86868b] hover:text-[#0071e3]"><Edit3 size={12}/></button>
                            <button onClick={() => deleteCategory(cat)} className="p-1.5 bg-white/5 rounded-full text-[#86868b] hover:text-[#ff453a]"><Trash2 size={12}/></button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
                {needsMoreButton && (
                  <button onClick={() => setIsCatExpanded(!isCatExpanded)} className="flex items-center gap-1 px-3 py-2 text-[11px] font-bold text-[#0071e3] hover:opacity-80 transition-all">
                    {isCatExpanded ? <><ChevronUp size={14}/> 접기</> : <><ChevronDown size={14}/> 더보기</>}
                  </button>
                )}
              </div>
              
              <div className="flex gap-2.5 pt-2">
                <button onClick={() => setFilterMode(filterMode === 'low' ? 'all' : 'low')} className={`flex-1 flex items-center justify-center gap-2.5 px-4 py-4 rounded-2xl text-[13px] font-bold border transition-all ${filterMode === 'low' ? 'bg-[#ff453a]/20 border-[#ff453a] text-[#ff453a]' : 'bg-[#1c1c1e] border-white/5 text-[#86868b]'}`}><ShoppingCart size={15} /> 구매가 필요해요!!</button>
                <button onClick={() => setFilterMode(filterMode === 'ready' ? 'all' : 'ready')} className={`flex-1 flex items-center justify-center gap-2.5 px-4 py-4 rounded-2xl text-[13px] font-bold border transition-all ${filterMode === 'ready' ? 'bg-[#ffcc00]/20 border-[#ffcc00] text-[#ffcc00]' : 'bg-[#1c1c1e] border-white/5 text-[#86868b]'}`}><Bell size={15} /> 따로 준비해요!!</button>
                
                {/* ✨ 추가된 구매 목록 복사 버튼 */}
                <button 
                  onClick={copyShoppingList}
                  title="구매 목록 복사"
                  className="flex items-center justify-center bg-[#1c1c1e] border border-white/10 text-[#86868b] px-4 rounded-2xl hover:text-white hover:bg-white/5 transition-all"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="space-y-4 md:space-y-6">
          {filteredItems.map((item, idx) => {
            const isShort = item.current < item.min;
            const isJustEnough = item.current === item.min;
            return (
              <div key={item.id || idx} className={`group relative border border-white/5 rounded-[2rem] p-6 md:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 transition-all ${isShort ? 'bg-[#ff453a]/5' : isJustEnough ? 'bg-[#ffcc00]/5' : 'bg-[#1c1c1e]/50'}`}>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-3 mb-2.5">
                    <h3 className="text-[20px] md:text-[22px] font-bold text-white cursor-pointer" onClick={() => openModal(item)}>{item.name}</h3>
                    {isShort && <span className="text-[#ff453a] text-[9px] font-black px-1.5 py-0.5 rounded-full border border-[#ff453a]/30 bg-[#ff453a]/15">🚨 부족</span>}
                    {isJustEnough && <span className="text-[#ffcc00] text-[9px] font-black px-1.5 py-0.5 rounded-full border border-[#ffcc00]/30 bg-[#ffcc00]/15">⚠️ 준비</span>}
                  </div>
                  <div className="flex items-center gap-3 text-[13px] text-[#86868b]">
                    <span className="bg-white/5 px-2.5 py-1 rounded-lg font-bold text-white/70 tracking-tight">{item.category}</span>
                    <span className="opacity-20">|</span>
                    <span className="font-medium">기준: {item.min}{item.unit}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between w-full sm:w-auto gap-8">
                  <div className="flex items-center gap-3 bg-black/40 rounded-full p-1.5 border border-white/5 shadow-inner">
                    <button onClick={() => handleQuickAdjust(item.id, item.current - 1)} className="w-8 h-8 rounded-full flex items-center justify-center text-[#ff453a] active:scale-90 font-bold text-xl hover:bg-white/5">-</button>
                    <div className="w-14">
                      <input type="number" value={item.current} onChange={(e) => handleQuickAdjust(item.id, parseInt(e.target.value) || 0)} className="w-full bg-transparent text-[24px] md:text-[28px] font-bold text-white italic text-center focus:outline-none"/>
                    </div>
                    <button onClick={() => handleQuickAdjust(item.id, item.current + 1)} className="w-8 h-8 rounded-full flex items-center justify-center text-[#0071e3] active:scale-90 font-bold text-xl hover:bg-white/5">+</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openModal(item)} className="p-2 text-[#48484a] hover:text-white transition-colors"><Edit3 size={18} /></button>
                    <button onClick={() => setDeleteIndex(idx)} className="p-2 text-[#48484a] hover:text-[#ff453a] transition-colors"><Trash2 size={18} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 overflow-y-auto">
            <div className="bg-[#1c1c1e] border border-white/10 w-full max-w-lg rounded-[2.5rem] p-8 md:p-12 shadow-2xl my-auto animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-2xl font-bold text-white">{editingId !== null ? '품목 수정' : '품목 등록'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-[#86868b] p-2 hover:bg-white/5 rounded-full transition-all"><X size={24}/></button>
              </div>
              <div className="space-y-8 text-left">
                <div className="space-y-4">
                  <label className="text-[11px] font-bold text-[#86868b] uppercase tracking-widest ml-1">카테고리 선택</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <button key={cat} onClick={() => setFormData({...formData, category: cat})} className={`px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all ${formData.category === cat ? 'bg-[#0071e3] text-white' : 'bg-white/5 text-[#86868b]'}`}>{cat}</button>
                    ))}
                    {isAddingCat ? (
                      <input autoFocus value={newCatInput} onChange={(e)=>setNewCatInput(e.target.value)} onBlur={() => {if(newCatInput)setFormData({...formData, category: newCatInput}); setIsAddingCat(false);}} className="bg-white/5 border border-[#0071e3] rounded-xl px-3 py-1.5 text-[13px] text-white w-28 outline-none"/>
                    ) : (
                      <button onClick={() => setIsAddingCat(true)} className="px-4 py-2.5 rounded-xl border border-dashed border-white/20 text-[#86868b] text-[13px]">+ 새 분류</button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#86868b] uppercase tracking-widest ml-1">품목 이름</label>
                    <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-white/10 rounded-2xl p-4 text-white outline-none focus:ring-1 ring-[#0071e3]" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#86868b] uppercase tracking-widest ml-1">단위</label>
                    <select value={formData.unit} onChange={(e) => setFormData({...formData, unit: e.target.value})} className="w-full bg-white/10 rounded-2xl p-4 text-white outline-none appearance-none">
                      {units.map(u => <option key={u} value={u} className="bg-[#1c1c1e] text-white">{u}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white/5 rounded-2xl p-6 border border-white/5 text-center">
                    <label className="text-[11px] font-bold text-[#86868b] uppercase tracking-widest block mb-4">현재 재고</label>
                    <div className="flex items-center justify-between px-2">
                      <button onClick={() => setFormData(p => ({...p, current: Math.max(0, p.current - 1)}))} className="w-10 h-10 rounded-full bg-white/5 text-[#ff453a] font-bold text-xl hover:bg-white/10 transition-all">-</button>
                      <span className="text-3xl font-bold italic text-white">{formData.current}</span>
                      <button onClick={() => setFormData(p => ({...p, current: p.current + 1}))} className="w-10 h-10 rounded-full bg-white/5 text-[#0071e3] font-bold text-xl hover:bg-white/10 transition-all">+</button>
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-6 border border-white/5 text-center">
                    <label className="text-[11px] font-bold text-[#86868b] uppercase tracking-widest block mb-4">최소 유지</label>
                    <div className="flex items-center justify-between px-2">
                      <button onClick={() => setFormData(p => ({...p, min: Math.max(0, p.min - 1)}))} className="w-10 h-10 rounded-full bg-white/5 text-[#ff453a] font-bold text-xl hover:bg-white/10 transition-all">-</button>
                      <span className="text-3xl font-bold italic text-white">{formData.min}</span>
                      <button onClick={() => setFormData(p => ({...p, min: p.min + 1}))} className="w-10 h-10 rounded-full bg-white/5 text-[#0071e3] font-bold text-xl hover:bg-white/10 transition-all">+</button>
                    </div>
                  </div>
                </div>
              </div>
              <button onClick={handleSave} className="w-full bg-[#0071e3] text-white font-bold py-5 rounded-2xl mt-12 shadow-xl hover:scale-[1.01] active:scale-95 transition-all text-[16px]">수정하기</button>
            </div>
          </div>
        )}

        {deleteIndex !== null && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
            <div className="bg-[#1c1c1e] w-full max-w-xs rounded-[2rem] p-8 text-center border border-white/10 shadow-2xl animate-in zoom-in-95">
              <h2 className="text-[18px] font-bold mb-8 text-white tracking-tight">정말 삭제하시겠습니까?</h2>
              <div className="flex flex-col gap-3">
                <button onClick={() => {
                   const updated = items.filter((_, i) => i !== deleteIndex);
                   saveToFile(updated);
                   setDeleteIndex(null);
                }} className="py-4 bg-[#ff453a] text-white rounded-xl font-bold transition-all shadow-lg shadow-[#ff453a]/20">삭제</button>
                <button onClick={() => setDeleteIndex(null)} className="py-4 text-[#86868b] font-medium hover:text-white">취소</button>
              </div>
            </div>
          </div>
        )}

        <footer className="mt-24 mb-10 text-center py-8 border-t border-white/5 opacity-40 text-left">
          <p className="text-[11px] text-[#86868b] tracking-[0.2em] uppercase italic">GURI DOOSAN DASHBOARD · 2026</p>
        </footer>
      </div>
    </div>
  );
}