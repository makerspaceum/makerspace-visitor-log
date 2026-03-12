import { useEffect, useState } from 'react';
import { API } from '../api';
import { Clock, ArrowRightLeft } from 'lucide-react';
import { clsx } from 'clsx';

export default function Logs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await API.getLogs();
        setLogs(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load logs');
      }
    };
    fetchLogs();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const exportCSV = () => {
    const header = 'Time,Visitor Name,Event,Action\n';
    const rows = logs.map(l => {
      return [
        `"${new Date(l.timestamp).toLocaleString()}"`,
        `"${l.visitor_name}"`,
        `"${l.event_name || 'Unknown'}"`,
        `"${l.action}"`
      ].join(',');
    }).join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'access_logs.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Access Logs</h1>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition-colors"
        >
          Export CSV
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {error && (
          <div className="p-4 bg-red-50 text-red-700 text-sm border-b border-red-100">
            {error}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-3">Time</th>
                <th className="px-6 py-3">Visitor</th>
                <th className="px-6 py-3">Event</th>
                <th className="px-6 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-gray-500 font-mono">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {log.visitor_name}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {log.event_name || 'Unknown Event'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={clsx(
                      "px-2 py-1 rounded text-xs font-bold uppercase",
                      log.action === 'IN' 
                        ? "bg-green-100 text-green-700" 
                        : "bg-blue-100 text-blue-700"
                    )}>
                      {log.action}
                    </span>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
