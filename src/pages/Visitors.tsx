import { useEffect, useState, FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { API } from '../api';
import { Plus, Search, User, Trash2, Edit2 } from 'lucide-react';

export default function Visitors() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [visitors, setVisitors] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    rfid_tag: '',
    email: '',
    phone: '',
    institution: '',
    faculty: '',
    department: '',
    event_id: '',
  });
  const [search, setSearch] = useState('');
  const [events, setEvents] = useState<any[]>([]);
  const [editingVisitorId, setEditingVisitorId] = useState<string | null>(null);
  
  // Confirmation Modal State
  const [confirmDelete, setConfirmDelete] = useState<{ id: string | number, name: string } | null>(null);

  useEffect(() => {
    loadVisitors();
    loadEvents();

    const rfidParam = searchParams.get('rfid');
    if (rfidParam) {
      setFormData(prev => ({ ...prev, rfid_tag: rfidParam }));
      setShowForm(true);
      // Clear the param so it doesn't pop up again on refresh if closed
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  const loadVisitors = async () => {
    const data = await API.getVisitors();
    setVisitors(data);
  };

  const loadEvents = async () => {
    const data = await API.getEvents();
    setEvents(data);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (editingVisitorId) {
        await API.updateVisitor(editingVisitorId, formData);
      } else {
        await API.createVisitor(formData);
      }
      setShowForm(false);
      setEditingVisitorId(null);
      setFormData({ name: '', rfid_tag: '', email: '', phone: '', institution: '', faculty: '', department: '', event_id: '' });
      loadVisitors();
    } catch (error: any) {
      alert(error.message || 'Failed to save visitor.');
    }
  };

  const handleEdit = (visitor: any) => {
    setEditingVisitorId(visitor.id);
    setFormData({
      name: visitor.name || '',
      rfid_tag: visitor.rfid_tag || '',
      email: visitor.email || '',
      phone: visitor.phone || '',
      institution: visitor.institution || '',
      faculty: visitor.faculty || '',
      department: visitor.department || '',
      event_id: visitor.event_ids?.[0] || '', // Pre-select the first event if any
    });
    setShowForm(true);
  };

  const handleDeleteVisitor = async () => {
    if (!confirmDelete) return;
    
    try {
      await API.deleteVisitor(confirmDelete.id);
      setConfirmDelete(null);
      loadVisitors();
    } catch (error: any) {
      alert(error.message || 'Failed to delete visitor.');
    }
  };

  const filteredVisitors = visitors.filter(v => 
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.rfid_tag.toLowerCase().includes(search.toLowerCase()) ||
    v.institution.toLowerCase().includes(search.toLowerCase()) ||
    (v.event_names && v.event_names.toLowerCase().includes(search.toLowerCase()))
  );

  const exportCSV = () => {
    const header = 'Name,RFID Tag,Institution,Faculty,Department,Email,Phone,Registered At\n';
    const rows = visitors.map(v => {
      return [
        `"${v.name}"`,
        `"${v.rfid_tag}"`,
        `"${v.institution}"`,
        `"${v.faculty || ''}"`,
        `"${v.department || ''}"`,
        `"${v.email || ''}"`,
        `"${v.phone || ''}"`,
        `"${v.created_at}"`
      ].join(',');
    }).join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'visitors.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Visitors</h1>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition-colors"
          >
            Export CSV
          </button>
          <button
            onClick={() => {
              setEditingVisitorId(null);
              setFormData({ name: '', rfid_tag: '', email: '', phone: '', institution: '', faculty: '', department: '', event_id: '' });
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Visitor
          </button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
            <h2 className="text-xl font-bold mb-4">{editingVisitorId ? 'Edit Participant' : 'Register New Visitor'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">RFID Tag ID *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono"
                    value={formData.rfid_tag}
                    onChange={e => setFormData({ ...formData, rfid_tag: e.target.value })}
                    placeholder="Scan card or type ID"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Institution *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    value={formData.institution}
                    onChange={e => setFormData({ ...formData, institution: e.target.value })}
                    placeholder="e.g. University of Malaya"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Faculty *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    value={formData.faculty}
                    onChange={e => setFormData({ ...formData, faculty: e.target.value })}
                    placeholder="e.g. Computer Science"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    value={formData.department}
                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g. AI Lab"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event *</label>
                  <select
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    value={formData.event_id}
                    onChange={e => setFormData({ ...formData, event_id: e.target.value })}
                  >
                    <option value="">-- Select Event --</option>
                    {events.map(event => (
                      <option key={event.id} value={event.id}>{event.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                  <input
                    type="tel"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingVisitorId(null);
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  {editingVisitorId ? 'Update Details' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <Trash2 className="w-6 h-6" />
              <h2 className="text-xl font-bold">Confirm Delete</h2>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <span className="font-bold text-gray-900">"{confirmDelete.name}"</span>? 
              This will also remove all registrations and logs for this visitor. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteVisitor}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Delete Visitor
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search visitors by name, RFID, institution, or event..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Institution</th>
                <th className="px-6 py-3">Events</th>
                <th className="px-6 py-3">RFID Tag</th>
                <th className="px-6 py-3">Contact</th>
                <th className="px-6 py-3">Registered</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredVisitors.map((visitor) => (
                <tr key={visitor.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                      <User className="w-4 h-4" />
                    </div>
                    {visitor.name}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">{visitor.institution}</span>
                      <span className="text-xs">{[visitor.faculty, visitor.department].filter(Boolean).join(' • ')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {visitor.event_names ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {visitor.event_names}
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">None</span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-mono text-gray-500">{visitor.rfid_tag}</td>
                  <td className="px-6 py-4 text-gray-500">
                    <div className="flex flex-col">
                      <span>{visitor.email}</span>
                      <span className="text-xs">{visitor.phone}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(visitor.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(visitor)}
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Edit Visitor"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete({ id: visitor.id, name: visitor.name })}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Visitor"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredVisitors.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No visitors found matching your search.
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
