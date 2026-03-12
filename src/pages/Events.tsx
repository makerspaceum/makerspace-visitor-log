import { 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  limit, 
  writeBatch,
  getDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { useEffect, useState, FormEvent, MouseEvent } from 'react';
import { API } from '../api';
import { Plus, Calendar, Users, ChevronDown, ChevronUp, Trash2, Edit2 } from 'lucide-react';
import { format } from 'date-fns';

export default function Events() {
  const [events, setEvents] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    description: '',
  });
  const [expandedEvent, setExpandedEvent] = useState<string | number | null>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [visitorIdToAdd, setVisitorIdToAdd] = useState('');
  const [visitors, setVisitors] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmCreate, setShowConfirmCreate] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  
  // Confirmation Modal State
  const [confirmDelete, setConfirmDelete] = useState<{ id: string | number, name: string } | null>(null);

  useEffect(() => {
    loadEvents();
    loadVisitors();
  }, []);

  const loadEvents = async () => {
    try {
      const data = await API.getEvents();
      setEvents(data);
    } catch (error) {
      console.error('Failed to load events:', error);
    }
  };

  const loadVisitors = async () => {
    try {
      const data = await API.getVisitors();
      setVisitors(data);
    } catch (error) {
      console.error('Failed to load visitors:', error);
    }
  };

  const loadRegistrations = async (eventId: string | number) => {
    try {
      // Get registrations for this event
      const q = query(collection(db, 'registrations'), where('event_id', '==', eventId));
      const snapshot = await getDocs(q);
      
      const regs = await Promise.all(snapshot.docs.map(async d => {
        const regData = d.data();
        const vDoc = await getDoc(doc(db, 'visitors', regData.visitor_id));
        return {
          id: d.id,
          ...regData,
          name: vDoc.exists() ? (vDoc.data() as any).name : 'Unknown',
          rfid_tag: vDoc.exists() ? (vDoc.data() as any).name : 'Unknown'
        };
      }));
      setRegistrations(regs);
    } catch (error) {
      console.error('Failed to load registrations:', error);
    }
  };

  const toggleEvent = (eventId: string | number) => {
    if (expandedEvent === eventId) {
      setExpandedEvent(null);
    } else {
      setExpandedEvent(eventId);
      loadRegistrations(eventId);
    }
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    // Basic validation before showing confirmation
    if (!formData.name || !formData.start_date || !formData.end_date) {
      alert('Please fill in all required fields.');
      return;
    }
    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);
    if (endDate <= startDate) {
      alert('End date must be after start date.');
      return;
    }
    
    if (editingEventId) {
      handleSaveEvent(); // Skip confirmation for edits
    } else {
      setShowConfirmCreate(true);
    }
  };

  const handleSaveEvent = async () => {
    setIsSubmitting(true);
    try {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);

      const payload = {
        ...formData,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      };

      if (editingEventId) {
        await API.updateEvent(editingEventId, payload);
      } else {
        await API.createEvent(payload);
      }

      setShowForm(false);
      setShowConfirmCreate(false);
      setEditingEventId(null);
      setFormData({ name: '', start_date: '', end_date: '', description: '' });
      loadEvents();
    } catch (error: any) {
      console.error('Save event error:', error);
      alert(error.message || 'Failed to save event.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (event: any) => {
    setEditingEventId(event.id);
    // Convert ISO strings back to datetime-local format (YYYY-MM-DDTHH:mm)
    const start = new Date(event.start_date);
    const end = new Date(event.end_date);
    
    const formatForInput = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    setFormData({
      name: event.name,
      start_date: formatForInput(start),
      end_date: formatForInput(end),
      description: event.description || '',
    });
    setShowForm(true);
  };

  const handleDeleteEvent = async () => {
    if (!confirmDelete) return;
    
    try {
      await API.deleteEvent(confirmDelete.id);
      if (expandedEvent === confirmDelete.id) setExpandedEvent(null);
      setConfirmDelete(null);
      loadEvents();
    } catch (error: any) {
      alert(error.message || 'Failed to delete event.');
    }
  };

  const handleRegisterVisitor = async (e: FormEvent) => {
    e.preventDefault();
    if (!expandedEvent || !visitorIdToAdd) return;
    try {
      await API.registerVisitor(visitorIdToAdd, expandedEvent);
      loadRegistrations(expandedEvent);
      setVisitorIdToAdd('');
    } catch (error) {
      alert('Failed to register visitor. They might already be registered.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Events</h1>
        <button
          onClick={() => {
            setEditingEventId(null);
            setFormData({ name: '', start_date: '', end_date: '', description: '' });
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Event
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-4">{editingEventId ? 'Edit Event' : 'Create New Event'}</h2>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="datetime-local"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    value={formData.start_date}
                    onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="datetime-local"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    value={formData.end_date}
                    onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingEventId(null);
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : (editingEventId ? 'Update Event' : 'Create Event')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Confirmation Modal */}
      {showConfirmCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Confirm Event Creation</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to create the event <span className="font-bold text-gray-900">"{formData.name}"</span>?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmCreate(false)}
                disabled={isSubmitting}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEvent}
                disabled={isSubmitting}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Confirm & Create'
                )}
              </button>
            </div>
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
              This will also remove all registrations and logs for this event. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEvent}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Delete Event
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {events.map((event) => (
          <div key={event.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div 
              className="p-6 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between"
              onClick={() => toggleEvent(event.id)}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{event.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {format(new Date(event.start_date), 'MMM d, yyyy HH:mm')} - {format(new Date(event.end_date), 'MMM d, yyyy HH:mm')}
                  </p>
                  {event.description && <p className="text-sm text-gray-600 mt-2">{event.description}</p>}
                </div>
              </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(event);
                    }}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Edit Event"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDelete({ id: event.id, name: event.name });
                    }}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Event"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {expandedEvent === event.id ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
                </div>
            </div>

            {expandedEvent === event.id && (
              <div className="border-t border-gray-100 bg-gray-50 p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Registered Visitors ({registrations.length})
                </h4>
                
                <form onSubmit={handleRegisterVisitor} className="flex gap-2 mb-6">
                  <select
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    value={visitorIdToAdd}
                    onChange={e => setVisitorIdToAdd(e.target.value)}
                  >
                    <option value="">Select a visitor to register...</option>
                    {visitors.map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.rfid_tag})</option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={!visitorIdToAdd}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </form>

                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500">
                      <tr>
                        <th className="px-4 py-2">Name</th>
                        <th className="px-4 py-2">RFID</th>
                        <th className="px-4 py-2">Registered At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {registrations.map(reg => (
                        <tr key={reg.id}>
                          <td className="px-4 py-2 font-medium text-gray-900">{reg.name}</td>
                          <td className="px-4 py-2 font-mono text-gray-500">{reg.rfid_tag}</td>
                          <td className="px-4 py-2 text-gray-500">{new Date(reg.registered_at).toLocaleString()}</td>
                        </tr>
                      ))}
                      {registrations.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-4 py-4 text-center text-gray-500">
                            No visitors registered for this event yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
