import { useState } from 'react';
import fs from 'fs';
import path from 'path';
import { Plus, Trash2, Package, X, AlertCircle, Home as HomeIcon, Check, Minus, Plus as PlusIcon } from 'lucide-react';

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
  const [categories, setCategories] = useState(['아기용품', '식재료', '생필품', '비상약']);
  const [newCatInput, setNewCatInput] = useState('');
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', category: '아기용품', current: 0, min: 2, unit: '팩' });

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
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f7] p-6 md:p-20 font-[-apple-system,system-ui,sans-serif] antialiased">
      <div className="max-w-3xl mx-auto">
        
        {/* 헤더 */}
        <header className="flex justify-between items-end mb-24 pb-8 border-b border-white/5">
          <div className="space-y-4">
            <p className="text-[12px] font-bold text-[#86868b] tracking-[0.3em] pl-1.5 opacity-60 uppercase">Guri Doosan Dashboard</p>
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-[#1c1c1e] rounded-2xl flex items-center justify-center border border-white/5 shadow-2xl">
                <HomeIcon size={30} className="text-[#0071e3]" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-white">우리집 재고관리<span className="text-[#0071e3]">.</span></h1>
            </div>
          </div>
          <button onClick={() => setIsAddModalOpen(true)} className="bg-white text-black px-7 py-3.5 rounded-full text-[14px] font-bold hover:scale-105 transition-all active:scale-95 shadow-lg shadow-white/5">품목 추가</button>
        </header>

        {/* 리스트 영역 */}
        <div className="space-y-10">
          {items.map((item, idx) => (
            <div key={idx} className="group relative border-b border-white/10 pb-10 flex items-center justify-between transition-all">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-3">
                  <h3 className="text-[22px] font-bold tracking-tight text-white group-hover:text-[#0071e3] transition-colors">{item.name}</h3>
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
              <div className="flex items-center gap-14 text-right">
                <div>
                  <span className="block text-[11px] font-bold text-[#48484a] uppercase tracking-widest mb-1">현재 재고</span>
                  <span className="text-[32px] font-bold text-white italic">{item.current}<span className="text-[16px] text-[#86868b] ml-1.5 font-normal not-italic">{item.unit}</span></span>
                </div>
                <button onClick={() => setDeleteIndex(idx)} className="opacity-0 group-hover:opacity-100 p-2 text-[#48484a] hover:text-[#ff453a] transition-all"><Trash2 size={20} /></button>
              </div>
            </div>
          ))}
        </div>

        {/* ➕ [최종] 밸런스 잡힌 품목 등록 모달 */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-6">
            <div className="bg-[#1c1c1e] border border-white/10 w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-200">
              
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-2xl font-bold text-white tracking-tight">품목 등록</h2>
                <button onClick={() => setIsAddModalOpen(false)} className="text-[#86868b] hover:text-white p-2 bg-white/5 rounded-full transition-colors"><X size={22}/></button>
              </div>

              <div className="space-y-8">
                {/* 카테고리 선택 */}
                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-[#86868b] uppercase tracking-widest ml-1">카테고리</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <button key={cat} onClick={() => setNewItem({...newItem, category: cat})} className={`px-4 py-2 rounded-xl text-[13px] font-bold transition-all ${newItem.category === cat ? 'bg-[#0071e3] text-white shadow-lg shadow-[#0071e3]/20' : 'bg-white/5 text-[#86868b] hover:bg-white/10'}`}>{cat}</button>
                    ))}
                    <button onClick={() => setIsAddingCat(true)} className="px-4 py-2 rounded-xl border border-dashed border-white/20 text-[#86868b] text-[13px] hover:border-white/40"><Plus size={14}/></button>
                  </div>
                </div>

                {/* 품목 이름 */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-[#86868b] uppercase tracking-widest ml-1">품목 이름</label>
                  <input type="text" value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} className="w-full bg-white/5 rounded-2xl p-4 text-[16px] text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40 transition-all border border-transparent" placeholder="예: 신생아 기저귀" />
                </div>
                
                {/* 수량 및 단위 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#86868b] uppercase tracking-widest ml-1">현재 수량</label>
                    <input type="number" value={newItem.current} onChange={(e) => setNewItem({...newItem, current: parseInt(e.target.value) || 0})} className="w-full bg-white/5 rounded-2xl p-4 text-[16px] text-white focus:outline-none border border-transparent" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#86868b] uppercase tracking-widest ml-1">단위</label>
                    <input type="text" value={newItem.unit} onChange={(e) => setNewItem({...newItem, unit: e.target.value})} className="w-full bg-white/5 rounded-2xl p-4 text-[16px] text-white focus:outline-none border border-transparent" placeholder="팩, 개, 통" />
                  </div>
                </div>

                {/* 최소 수량 조절 - 정돈된 디자인 */}
                <div className="bg-[#2c2c2e]/50 rounded-[1.5rem] p-6 border border-white/5">
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-[11px] font-bold text-[#86868b] uppercase tracking-widest flex items-center gap-1.5">
                      <AlertCircle size={14} className="text-[#ff453a]"/> 최소 유지 수량
                    </label>
                    <span className="text-[13px] font-bold text-white bg-white/10 px-2.5 py-0.5 rounded-md">{newItem.min} {newItem.unit}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <button onClick={() => setNewItem(p => ({...p, min: Math.max(0, p.min - 1)}))} className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-[#ff453a] hover:bg-white/10 transition-all border border-white/5"><Minus size={20} /></button>
                    <div className="flex-1 text-center text-3xl font-bold tracking-tighter text-white italic">{newItem.min}</div>
                    <button onClick={() => setNewItem(p => ({...p, min: p.min + 1}))} className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-[#0071e3] hover:bg-white/10 transition-all border border-white/5"><PlusIcon size={20} /></button>
                  </div>
                </div>
              </div>

              <button onClick={addItem} className="w-full bg-[#0071e3] text-white font-bold py-5 rounded-2xl mt-10 text-[16px] hover:bg-[#0077ed] transition-all shadow-xl shadow-[#0071e3]/20 active:scale-[0.98]">
                목록에 추가하기
              </button>
            </div>
          </div>
        )}

        {/* 삭제 확인 모달 */}
        {deleteIndex !== null && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-xl p-6">
            <div className="bg-[#1c1c1e] w-full max-w-sm rounded-[32px] p-10 text-center border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-[#ff453a]/10 text-[#ff453a] rounded-full flex items-center justify-center mx-auto mb-8 border border-[#ff453a]/20"><AlertCircle size={32} /></div>
              <h2 className="text-[20px] font-bold mb-3 text-white tracking-tight">정말 삭제하시겠습니까?</h2>
              <p className="text-[#86868b] text-[15px] mb-10 leading-relaxed px-4">선택한 항목이 목록에서 영구히 삭제됩니다.</p>
              <div className="flex flex-col gap-3">
                <button onClick={confirmDelete} className="py-4 bg-[#ff453a] text-white rounded-2xl font-semibold text-[15px] hover:bg-[#ff3b30] transition-colors shadow-lg shadow-[#ff453a]/20">삭제</button>
                <button onClick={() => setDeleteIndex(null)} className="py-4 text-[#0071e3] font-semibold text-[15px] hover:text-[#0a84ff]">취소</button>
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