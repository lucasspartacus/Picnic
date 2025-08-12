import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Bar, Pie } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { saveAs } from 'file-saver';

import { categorizarTicket, resumoTexto } from "./categorias";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

export default function SupportTicketsDashboard() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [showOnlyEscalate, setShowOnlyEscalate] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/zendesk_mock_tickets_llm_flavor.json');
        const json = await res.json();
        if (cancelled) return;
        setTickets(json.tickets || []);
      } catch (e) {
        console.error('Falha ao carregar JSON', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; }
  }, []);


  const derived = useMemo(() => {
    const categorized = tickets.map(t => ({
      ...t,
      category: categorizarTicket(t),
      summary: resumoTexto(t),
      created_date: t.created_at ? t.created_at.split('T')[0] : ''
    }));

    const counts = categorized.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + 1;
      return acc;
    }, {});
    return { categorized, counts };
  }, [tickets]);

  const categories = useMemo(() => {
    const cats = Object.keys(derived.counts).sort((a,b)=> derived.counts[b]-derived.counts[a]);
    return ['Todas', ...cats];
  }, [derived]);

  const escalateCategories = useMemo(() => new Set([
    'Bugs & Erros', 
    'Integrações & API', 
    'Performance & Latência'
  ]), []);

  const isEscalate = useCallback(cat => escalateCategories.has(cat), [escalateCategories]);

  const filtered = useMemo(() => {
    return derived.categorized.filter(t => {
      if (selectedCategory !== 'Todas' && t.category !== selectedCategory) return false;
      if (showOnlyEscalate && !isEscalate(t.category)) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return t.summary.toLowerCase().includes(q) || (t.requester?.name || '').toLowerCase().includes(q) || (t.subject || '').toLowerCase().includes(q);
    });
  }, [derived, selectedCategory, showOnlyEscalate, query, isEscalate]);

function buildChartData() {
  const labels = Object.keys(derived.counts);
  const data = labels.map(l => derived.counts[l]);

  const colors = [
    '#4CAF50', 
    '#2196F3', 
    '#FFC107', 
    '#F44336', 

  ];

  return {
    bar: {
      labels,
      datasets: [{
        label: 'Número de tickets',
        data,
        backgroundColor: labels.map((_, i) => colors[i % colors.length]), 
        borderWidth: 1
      }]
    },
  };
}

  function downloadCSV() {
    const headers = ['categoria','assunto','solicitante','email','data','resumo','escala_para_eng'];
    const rows = filtered.map(t => [
      t.category,
      '"' + (t.subject || '').replace(/"/g,'""') + '"',
      t.requester?.name || '',
      t.requester?.email || '',
      t.created_date,
      '"' + (t.summary || '').replace(/"/g,'""') + '"',
      isEscalate(t.category) ? 'SIM' : 'NÃO'
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'tickets_filtrados.csv');
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-6 bg-white rounded-lg shadow">
        <h2 className="text-lg font-medium">Carregando tickets…</h2>
        <p className="text-sm text-gray-500 mt-2">Buscando zendesk_mock_tickets_llm_flavor.json em /public</p>
      </div>
    </div>
  );

  const chartData = buildChartData();
return (
  <div className="min-h-screen bg-gray-50 p-6">
    <header className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard de Tickets de Suporte</h1>
        <p className="text-sm text-gray-600">Visão por categoria e tickets que devem ser escalados para engenharia</p>
      </div>
      <div className="flex gap-3 items-center">
        <button onClick={downloadCSV} className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700">Exportar CSV</button>
        <div className="text-sm text-gray-500">Total: <span className="font-semibold">{tickets.length}</span></div>
      </div>
    </header>

<div className="flex flex-row gap-6 ">
   
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-medium mb-2">Distribuição por Categoria</h3>
          <div className="w-full h-64">
            <Bar data={chartData.bar} options={{ responsive: true, plugins: { legend: { display: false } } }} />
          </div>
        </div>



        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-medium mb-2">Resumo Rápido</h3>
          <div className="mb-3">
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar por assunto, nome ou palavra..." className="w-full p-2 border rounded" />
          </div>
          <div className="flex gap-2 mb-3">
            <select value={selectedCategory} onChange={e=>setSelectedCategory(e.target.value)} className="p-2 border rounded flex-1">
              {categories.map(c => <option key={c} value={c}>{c} {c!=='Todas' && `(${derived.counts[c]||0})`}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showOnlyEscalate} onChange={e=>setShowOnlyEscalate(e.target.checked)} />
              Mostrar só escalados
            </label>
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">Tickets ({filtered.length})</h3>
            <div className="text-sm text-gray-500">Mostrando {selectedCategory === 'Todas' ? 'todas as categorias' : selectedCategory}</div>
          </div>

          <div className="space-y-2">
            {filtered.length === 0 && <div className="p-4 text-sm text-gray-500">Nenhum ticket corresponde aos filtros</div>}
            {filtered.map((t, i) => (
              <details key={i} className={`p-3 border rounded ${isEscalate(t.category) ? 'border-red-300 bg-red-50' : 'bg-white'}`}>
                <summary className="flex items-center justify-between cursor-pointer">
                  <div>
                    <div className="text-sm font-semibold">{t.subject}</div>
                    <div className="text-xs text-gray-600">{t.requester?.name || '—'} • {t.created_date} • <span className="italic">{t.category}</span></div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isEscalate(t.category) && <span className="text-xs font-semibold text-red-700">ESCALAR</span>}
                    <button onClick={(e)=>{ e.stopPropagation(); navigator.clipboard?.writeText(t.summary) }} className="text-xs px-2 py-1 border rounded">Copiar resumo</button>
                  </div>
                </summary>

                <div className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">
                  {t.summary}
                </div>

                <div className="mt-3 flex items-center gap-3 text-sm text-gray-600">
                  <div>Solicitante: <span className="font-medium">{t.requester?.name || '—'}</span></div>
                  <div>Email: <span className="font-medium">{t.requester?.email || '—'}</span></div>
                </div>

                <div className="mt-3 flex gap-2">
                  <button onClick={(e)=>{ e.stopPropagation(); alert('Marcar como resolvido (mock) - implementar backend)'); }} className="px-3 py-1 text-sm bg-blue-600 text-white rounded">Marcar resolvido</button>
                  <button onClick={(e)=>{ e.stopPropagation(); alert('Adicionar nota interna (mock)') }} className="px-3 py-1 text-sm border rounded">Nota interna</button>
                </div>
              </details>
            ))}
        </div>
      </div>
    </div>
  </div>
);

}
