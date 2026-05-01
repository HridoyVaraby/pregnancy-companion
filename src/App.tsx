import { useState } from 'react';
import type { FormEvent } from 'react';
import { useConnectivity } from './hooks/useConnectivity';
import { useSymptomMatch } from './hooks/useSymptomMatch';
import type { Symptom, SymptomSeverity } from './hooks/useSymptomMatch';
import { getSymptomInsights } from './services/gemini';
import { db } from './db/history';
import { AlertCircle, Wifi, WifiOff, Send, Clock, ChevronDown, ChevronUp, Bot, Database } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';

function App() {
  const isOnline = useConnectivity();
  const { findMatch } = useSymptomMatch();

  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    advice: string;
    isAiEnriched: boolean;
    match: Symptom | null;
  } | null>(null);

  const [showHistory, setShowHistory] = useState(false);

  // Use dexie-react-hooks to cleanly observe history
  const historyLogs = useLiveQuery(() => db.logs.orderBy('timestamp').reverse().toArray(), []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setResult(null);

    const match = findMatch(query);
    const insights = await getSymptomInsights(query, match, isOnline);

    const newResult = {
      advice: insights.advice,
      isAiEnriched: insights.isAiEnriched,
      match,
    };

    setResult(newResult);

    // Save to local history
    await db.logs.add({
      query,
      timestamp: new Date(),
      matchId: match?.id,
      matchName: match?.name,
      severity: match?.severity,
      advice: insights.advice,
      isAiEnriched: insights.isAiEnriched,
    });

    setIsLoading(false);
    setQuery('');
  };

  const getSeverityColor = (severity?: SymptomSeverity) => {
    if (severity === 'high') return 'bg-red-100 text-red-800 border-red-200';
    if (severity === 'medium') return 'bg-orange-100 text-orange-800 border-orange-200';
    if (severity === 'low') return 'bg-green-100 text-green-800 border-green-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans pb-16">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10 px-4 py-3 flex justify-between items-center">
        <h1 className="text-xl font-bold text-rose-500">Pregnancy Companion</h1>
        <div className={`flex items-center gap-2 text-sm px-3 py-1 rounded-full ${isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
          {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
          <span className="font-medium">{isOnline ? 'Online' : 'Offline'}</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-2xl mx-auto p-4 flex flex-col gap-6 mt-4">

        {/* Input Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold mb-4 text-slate-800">What are you experiencing?</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <textarea
              className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none resize-none"
              rows={3}
              placeholder="e.g. Sharp pain in my side when I sneeze..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!query.trim() || isLoading}
              className="bg-rose-500 hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              {isLoading ? (
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <Send size={18} />
                  Check Symptom
                </>
              )}
            </button>
          </form>
        </div>

        {/* High Severity Alert */}
        {result?.match?.severity === 'high' && (
          <div className="bg-red-50 border-l-4 border-red-500 p-5 rounded-r-xl shadow-sm animate-pulse">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={24} />
              <div>
                <h3 className="text-red-800 font-bold text-lg">High Severity Alert</h3>
                <p className="text-red-700 mt-1">This symptom may require urgent medical attention. Please contact your healthcare provider or go to the nearest emergency room immediately.</p>
              </div>
            </div>
          </div>
        )}

        {/* Result Card */}
        {result && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 animate-fade-in">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-slate-800">Insight</h3>
              <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getSeverityColor(result.match?.severity)}`}>
                {result.match ? `${result.match.severity} severity` : 'Unknown'}
              </div>
            </div>

            {result.match && (
              <div className="mb-4">
                <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Detected Match</span>
                <p className="font-medium text-lg text-slate-800">{result.match.name}</p>
              </div>
            )}

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
               <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-slate-500">
                 {result.isAiEnriched ? (
                    <><Bot size={16} className="text-indigo-500"/> AI Enriched Answer</>
                 ) : (
                    <><Database size={16} className="text-slate-500" /> Offline Local Database</>
                 )}
               </div>
               <div className="prose prose-slate prose-sm max-w-none text-slate-700 leading-relaxed">
                 {/* Hacky way to handle newlines from Gemini */}
                 {result.advice.split('\n').map((line, i) => (
                    <p key={i} className="mb-2 last:mb-0">{line}</p>
                 ))}
               </div>
            </div>
          </div>
        )}

        {/* History Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full p-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-2 text-slate-700 font-semibold">
              <Clock size={18} />
              Recent Checks
            </div>
            {showHistory ? <ChevronUp size={20} className="text-slate-500" /> : <ChevronDown size={20} className="text-slate-500" />}
          </button>

          {showHistory && (
            <div className="p-4 border-t border-slate-200">
              {historyLogs && historyLogs.length > 0 ? (
                <div className="flex flex-col gap-4 max-h-80 overflow-y-auto pr-2">
                  {historyLogs.map((log) => (
                    <div key={log.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                      <p className="font-medium text-slate-800 mb-2">"{log.query}"</p>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                        <div className="flex gap-2">
                          {log.matchName && (
                            <span className={`px-2 py-0.5 rounded-full border ${getSeverityColor(log.severity)}`}>
                              {log.matchName}
                            </span>
                          )}
                          <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full border border-slate-300">
                            {log.isAiEnriched ? 'AI' : 'Offline'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-500 py-4">No history yet.</p>
              )}
            </div>
          )}
        </div>

      </main>

      {/* Footer / Disclaimer */}
      <footer className="mt-auto bg-slate-900 text-slate-400 p-4 text-xs text-center border-t border-slate-800">
        <p className="max-w-2xl mx-auto">
          <strong>Disclaimer:</strong> This application is for educational and informational purposes only and does not provide medical advice. Always consult with a qualified healthcare provider for medical diagnosis and treatment.
        </p>
      </footer>
    </div>
  );
}

export default App;
