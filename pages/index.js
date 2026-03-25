import { getInventoryHtml } from '../lib/inventory';

export async function getStaticProps() {
  const inventoryHtml = await getInventoryHtml();
  return {
    props: { inventoryHtml },
    revalidate: 10,
  };
}

export default function Home({ inventoryHtml }) {
  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 md:p-12 font-sans">
      <div className="max-w-3xl mx-auto border border-slate-700 p-8 rounded-3xl bg-slate-800 shadow-2xl">
        <header className="flex justify-between items-center mb-10 border-b border-slate-700 pb-6">
          <h1 className="text-3xl font-black text-emerald-400 tracking-tight">KANG & SONG STOCK</h1>
          <span className="text-[10px] bg-slate-700 px-2 py-1 rounded text-slate-400">Ver 1.0</span>
        </header>
        
        <div 
          className="inventory-content prose prose-invert max-w-none 
          prose-table:border-collapse prose-th:text-emerald-400 prose-th:bg-slate-900/50 prose-th:p-3
          prose-td:p-3 prose-td:border-b prose-td:border-slate-700"
          dangerouslySetInnerHTML={{ __html: inventoryHtml }} 
        />

        <footer className="mt-16 text-center text-slate-500 text-xs">
          <p>구리 두산 아파트 - **올레(여울)** 맞이 준비 프로젝트 👶</p>
        </footer>
      </div>
    </div>
  );
}