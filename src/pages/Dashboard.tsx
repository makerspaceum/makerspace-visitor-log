import { useEffect, useState } from 'react';
import { API } from '../api';
import { Users, Calendar, CheckCircle, XCircle } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    visitors: 0,
    events: 0,
    activeVisitors: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<{ connected: boolean } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching dashboard stats...');
      const data = await API.getStats();
      setDbStatus({ connected: true });

      console.log('Stats received:', data);

      // Calculate active visitors (last action was IN)
      // Since we currently only have 'IN' logs, we'll consider someone "inside" 
      // if they scanned in within the last 12 hours.
      const activeVisitors = new Set();
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
      
      const sortedLogs = [...(data.logs || [])].sort((a: any, b: any) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      sortedLogs.forEach((log: any) => {
        const logTime = new Date(log.timestamp);
        if (logTime > twelveHoursAgo) {
          if (log.action === 'IN') {
            activeVisitors.add(log.visitor_id);
          } else if (log.action === 'OUT') {
            activeVisitors.delete(log.visitor_id);
          }
        }
      });

      setStats({
        visitors: data.visitorsCount || 0,
        events: data.eventsCount || 0,
        activeVisitors: activeVisitors.size,
      });
    } catch (err: any) {
      console.error('Dashboard fetchData error:', err);
      setDbStatus({ connected: false });
      setError('Failed to load dashboard statistics. Please check your Firebase configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <button 
          onClick={fetchData}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm">
          {error}
        </div>
      )}

      {dbStatus && !dbStatus.connected && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <div className="p-2 bg-red-100 rounded-full text-red-600 shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-red-800">❌ Database Connection Error</h3>
            <p className="text-sm text-red-700 mt-1">
              Could not connect to Firebase. Please check your internet connection and Firebase configuration in src/firebase.ts.
            </p>
          </div>
        </div>
      )}

      {dbStatus && dbStatus.connected && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
          <div className="p-2 bg-emerald-100 rounded-full text-emerald-600 shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-emerald-800">✅ Direct Cloud Access Active</h3>
            <p className="text-sm text-emerald-700 mt-1">
              The app is communicating directly with Firebase Firestore from your browser.
            </p>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Visitors</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {loading ? '...' : stats.visitors}
              </p>
            </div>
            <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Active Events</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {loading ? '...' : stats.events}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg text-green-600">
              <Calendar className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Currently Inside</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {loading ? '...' : stats.activeVisitors}
              </p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg text-orange-600">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a href="/scan" className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <h3 className="font-medium text-indigo-600">Open Scan Terminal</h3>
            <p className="text-sm text-gray-500 mt-1">Start scanning visitor badges for entry/exit.</p>
          </a>
          <a href="/visitors" className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <h3 className="font-medium text-indigo-600">Register New Visitor</h3>
            <p className="text-sm text-gray-500 mt-1">Add a new visitor to the system.</p>
          </a>
        </div>
      </div>
    </div>
  );
}
