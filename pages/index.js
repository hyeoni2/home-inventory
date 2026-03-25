import { useState } from 'react';
import fs from 'fs';
import path from 'path';
import { Plus, Trash2, Package, X, AlertCircle, Home as HomeIcon, Check, PlusCircle } from 'lucide-react';

export async function getServerSideProps() {
  const filePath = path.join(process.cwd(), 'data', 'inventory.md');
  const rawContent = fs.readFileSync(filePath, 'utf8');
  const rows = rawContent.split('\n').filter(line => line.includes('|') && !line.includes('---') && !line.startsWith('#'));
  const data = rows.slice(1).map(row => {
    const cols = row.split('|').map(c => c.trim()).filter(Boolean);
    return { name: cols[0].replace(/\*\*/g, ''), category: cols[1], current: parseInt(cols[2]) || 0, min: parseInt(cols[3]) || 1, unit: cols[4], status: cols[5] };
  });
  return { props: { initialData: data } };
}

export default function Home({ initialData }) {
  const [items, setItems] = useState(initialData);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState(null);
  
  // 카테고리 상태 관리 (초기값 설정)
  const [categories, setCategories] = useState(['아기용품', '식재료', '생필품', '비상약']);
  const [newCatInput, setNewCatInput] = useState('');
  const [isAddingCat, setIsAddingCat] = useState(false);

  const [newItem, setNewItem] = useState({ name: '', category: '아기용품', current: 0, min: 2, unit: '팩', status: '✅ 여유' });

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
    setItems(updatedItems);
  };

  // 카테고리 추가 로직
  const addCategory = () => {
    if (newCatInput && !categories.includes(newCatInput)) {
      setCategories([...categories, newCatInput]);
      setNewItem({ ...newItem, category: newCatInput });
      setNewCatInput('');
      setIsAddingCat(false);
    }
  };

  // 카테고리 삭제 로직
  const removeCategory = (catToDelete) => {
    if (categories.length <= 1) return; // 최소 하나는 유지
    const updatedCats = categories.filter(c => c !== catToDelete);
    setCategories(updatedCats);
    if (newItem.category === catToDelete) {
      setNewItem({ ...newItem, category: updatedCats[0] });
    }
  };

  const addItem = () => {
    if (!newItem.name) return;
    saveToFile([...items, newItem]);
    setIsAddModalOpen(false);
    setNewItem({ ...newItem, name: '', current: 0 });
  };

  const confirmDelete = () => {
    saveToFile(items.filter((_, i) => i !== deleteIndex));
    setDeleteIndex(null);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f7] p-6 md:p-20 font-[-apple-system,BlinkMacSystemFont,sans-serif] selection:bg-[#0071e3]/30">
      <div className="max-w-3xl mx-auto">
        
        {/* 헤더 */}
        <header className="flex justify-between items-end mb-24 pb-8 border-b border-white/5">
          <div className="space-y-4">
            <p className="text-[13px] font-semibold text-[#86868b] tracking-[0.3em] pl-1.5 opacity-60 uppercase">Guri Doosan Dashboard</p>
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-[#1c1c1e] rounded-2xl flex items-center justify-center border border-white/5 shadow-2xl">
                <HomeIcon size={36} className="text-[#0071e3]" strokeWidth={2} />
              </div>
              <h1 className="text-5xl font-bold tracking-[-0.04em] text-white">우리집 재고관리<span className="text-[#0071e3]">.</span></h1>
            </div>
          </div>
          <button onClick={() => setIsAddModalOpen(true)} className="bg-white text-black px-8 py-4 rounded-full text-[15px] font-bold hover:scale-105 transition-all shadow-xl">품목 추가</button>
        </header>

        {/* 리스트 영역 */}
        <div className="space-y-10">
          {items.map((item, idx) => (
            <div key={idx} className="group relative border-b border-white/10 pb-10 flex items-center justify-between transition-all">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-3">
                  <h3 className="text-[24px] font-bold tracking-tight text-white group-hover:text-[#0071e3] transition-colors">{item.name}</h3>
                  {item.current <= item.min && (
                    <span className="bg-[#ff453a]/15 text-[#ff453a] text-[11px] font-black px-3 py-1 rounded-full border border-[#ff453a]/30">재고 부족</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[15px] text-[#86868b] font-medium">
                  <Package size={16} className="opacity-40" />
                  <span>{item.category}</span>
                  <span className="w-1 h-1 rounded-full bg-white/20"></span>
                  <span>최소 유지: {item.min}{item.unit}</span>
                </div>
              </div>
              <div className="flex items-center gap-14">
                <div className="text-right">
                  <span className="block text-[12px] font-bold text-[#48484a] uppercase tracking-widest mb-2">현재 재고</span>
                  <span className="text-[36px] font-bold tracking-tight text-white italic">{item.current}<span className="text-[18px] text-[#86868b] ml-2 font-normal not-italic">{item.unit}</span></span>
                </div>
                <button onClick={() => setDeleteIndex(idx)} className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-[#48484a] hover:text-[#ff453a]"><Trash2 size={22} /></button>
              </div>
            </div>
          ))}
        </div>

        {/* ➕ 카테고리 관리 기능이 포함된 모달 */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-2xl p-6">
            <div className="bg-[#1c1c1e] border border-white/10 w-full max-w-2xl rounded-[40px] p-16 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-[#0071e3] to-transparent opacity-50"></div>
              
              <div className="flex justify-between items-center mb-12 relative z-10">
                <h2 className="text-4xl font-bold tracking-tight text-white">품목 등록</h2>
                <button onClick={() => setIsAddModalOpen(false)} className="text-[#86868b] hover:text-white p-2.5 bg-white/5 rounded-full"><X size={28}/></button>
              </div>

              <div className="space-y-12 relative z-10">
                {/* 🏷️ 동적 카테고리 선택 및 관리 영역 */}
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <label className="text-[13px] font-bold text-[#86868b] uppercase tracking-[0.2em] ml-1">CATEGORY / 카테고리 관리</label>
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                    {categories.map((cat) => (
                      <div key={cat} className="group/cat relative">
                        <button
                          onClick={() => setNewItem({...newItem, category: cat})}
                          className={`px-6 py-3.5 rounded-2xl text-[15px] font-bold transition-all flex items-center gap-2 ${
                            newItem.category === cat 
                            ? 'bg-[#0071e3] text-white shadow-lg shadow-[#0071e3]/30 scale-105' 
                            : 'bg-[#2c2c2e] text-[#86868b] hover:bg-[#3a3a3c] hover:text-white'
                          }`}
                        >
                          {newItem.category === cat && <Check size={16} strokeWidth={3} />}
                          {cat}
                        </button>
                        {/* 카테고리 삭제 버튼 (마우스 오버 시 노출) */}
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeCategory(cat); }}
                          className="absolute -top-2 -right-2 bg-[#ff453a] text-white rounded-full p-1 opacity-0 group-hover/cat:opacity-100 transition-opacity shadow-lg"
                        >
                          <X size={12} strokeWidth={4} />
                        </button>
                      </div>
                    ))}

                    {/* 카테고리 추가 입력창 */}
                    {isAddingCat ? (
                      <div className="flex items-center gap-2 animate-in slide-in-from-left-2">
                        <input 
                          autoFocus
                          type="text" 
                          value={newCatInput} 
                          onChange={(e) => setNewCatInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                          className="bg-[#2c2c2e] border border-[#0071e3] rounded-2xl px-4 py-3 text-[15px] text-white focus:outline-none w-32"
                          placeholder="새 분류..."
                        />
                        <button onClick={addCategory} className="text-[#0071e3] p-2 hover:bg-[#0071e3]/10 rounded-full"><Check size={20} /></button>
                        <button onClick={() => setIsAddingCat(false)} className="text-[#86868b] p-2"><X size={20} /></button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setIsAddingCat(true)}
                        className="px-5 py-3.5 rounded-2xl border border-dashed border-white/20 text-[#86868b] hover:border-[#0071e3] hover:text-[#0071e3] transition-all flex items-center gap-2"
                      >
                        <PlusCircle size={18} />
                        추가
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[13px] font-bold text-[#86868b] uppercase tracking-[0.2em] ml-1">ITEM NAME / 품목 이름</label>
                  <input type="text" value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} className="w-full bg-[#2c2c2e] border border-white/10 rounded-3xl p-6 text-[20px] text-white focus:outline-none focus:ring-4 focus:ring-[#0071e3]/20 transition-all placeholder:text-[#48484a]" placeholder="이름을 입력하세요" />
                </div>
                
                <div className="grid grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <label className="text-[13px] font-bold text-[#86868b] uppercase tracking-[0.2em] ml-1">STOCK / 현재 수량</label>
                    <input type="number" value={newItem.current} onChange={(e) => setNewItem({...newItem, current: parseInt(e.target.value) || 0})} className="w-full bg-[#2c2c2e] border border-white/10 rounded-3xl p-6 text-[20px] text-white focus:outline-none transition-all" />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[13px] font-bold text-[#86868b] uppercase tracking-[0.2em] ml-1">UNIT / 단위</label>
                    <input type="text" value={newItem.unit} onChange={(e) => setNewItem({...newItem, unit: e.target.value})} className="w-100 bg-[#2c2c2e] border border-white/10 rounded-3xl p-6 text-[20px] text-white focus:outline-none transition-all" />
                  </div>
                </div>
              </div>

              <button onClick={addItem} className="w-full bg-[#0071e3] text-white font-bold py-6 rounded-3xl mt-16 text-[18px] hover:bg-[#0077ed] transition-all shadow-2xl shadow-[#0071e3]/30 active:scale-[0.98] relative z-10">
                목록에 추가하기
              </button>
            </div>
          </div>
        )}

        {/* 삭제 확인 모달 생략 (동일) */}
        {deleteIndex !== null && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-xl p-6">
            <div className="bg-[#1c1c1e] w-full max-w-md rounded-[40px] p-12 text-center border border-white/10 shadow-2xl">
              <div className="w-20 h-20 bg-[#ff453a]/10 text-[#ff453a] rounded-full flex items-center justify-center mx-auto mb-10"><AlertCircle size={40} /></div>
              <h2 className="text-3xl font-bold mb-4 text-white tracking-tight">정말 삭제할까요?</h2>
              <div className="flex flex-col gap-4">
                <button onClick={confirmDelete} className="py-5 bg-[#ff453a] text-white rounded-[20px] font-bold text-[17px]">품목 삭제</button>
                <button onClick={() => setDeleteIndex(null)} className="py-5 text-[#86868b] font-semibold text-[17px]">취소</button>
              </div>
            </div>
          </div>
        )}

        <footer className="mt-48 mb-10 text-center py-12 border-t border-white/5 opacity-50 font-medium">
          <p className="text-[12px] text-[#48484a] tracking-[0.3em] uppercase italic">Olle Dashboard · Guri Doosan 2026</p>
        </footer>

      </div>
    </div>
  );
}