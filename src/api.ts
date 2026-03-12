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
import { db } from './firebase';

export const API = {
  getVisitors: async () => {
    const querySnapshot = await getDocs(collection(db, 'visitors'));
    const visitors = await Promise.all(querySnapshot.docs.map(async visitorDoc => {
      const data = visitorDoc.data();
      
      // Get registrations for this visitor
      const qRegs = query(collection(db, 'registrations'), where('visitor_id', '==', visitorDoc.id));
      const regsSnapshot = await getDocs(qRegs);
      
      const eventNames: string[] = [];
      const eventIds: string[] = [];
      for (const regDoc of regsSnapshot.docs) {
        const reg = regDoc.data();
        const eventDoc = await getDoc(doc(db, 'events', reg.event_id));
        if (eventDoc.exists()) {
          eventNames.push((eventDoc.data() as any).name);
          eventIds.push(eventDoc.id);
        }
      }
      
      return { 
        id: visitorDoc.id, 
        ...data, 
        event_names: eventNames.join(', '),
        event_ids: eventIds
      };
    }));
    return visitors;
  },

  createVisitor: async (data: any) => {
    const { name, rfid_tag: raw_tag, email, phone, institution, faculty, department, event_id } = data;
    const rfid_tag = raw_tag.trim();

    // Check for duplicate RFID
    const q = query(collection(db, 'visitors'), where('rfid_tag', '==', rfid_tag));
    const existing = await getDocs(q);
    if (!existing.empty) {
      throw new Error('RFID tag already exists');
    }

    const newVisitor = {
      name,
      rfid_tag,
      email,
      phone,
      institution,
      faculty,
      department,
      created_at: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, 'visitors'), newVisitor);
    
    if (event_id) {
      await addDoc(collection(db, 'registrations'), {
        visitor_id: docRef.id,
        event_id,
        registered_at: new Date().toISOString()
      });
    }

    return { id: docRef.id, ...newVisitor };
  },

  updateVisitor: async (id: string, data: any) => {
    const { name, rfid_tag: raw_tag, email, phone, institution, faculty, department, event_id } = data;
    const rfid_tag = raw_tag.trim();

    // Check for duplicate RFID (excluding current visitor)
    const q = query(collection(db, 'visitors'), where('rfid_tag', '==', rfid_tag));
    const existing = await getDocs(q);
    if (!existing.empty && existing.docs[0].id !== id) {
      throw new Error('RFID tag already exists on another visitor');
    }

    const batch = writeBatch(db);
    const visitorRef = doc(db, 'visitors', id);
    
    batch.update(visitorRef, {
      name,
      rfid_tag,
      email,
      phone,
      institution,
      faculty,
      department,
      updated_at: new Date().toISOString()
    });

    if (event_id) {
      // Check if already registered for this specific event
      const qReg = query(
        collection(db, 'registrations'), 
        where('visitor_id', '==', id),
        where('event_id', '==', event_id)
      );
      const regSnap = await getDocs(qReg);
      
      if (regSnap.empty) {
        // Add new registration
        const regRef = doc(collection(db, 'registrations'));
        batch.set(regRef, {
          visitor_id: id,
          event_id,
          registered_at: new Date().toISOString()
        });
      }
    }

    await batch.commit();
    return { success: true };
  },

  deleteVisitor: async (id: string) => {
    const batch = writeBatch(db);
    
    // Delete registrations
    const qRegs = query(collection(db, 'registrations'), where('visitor_id', '==', id));
    const regs = await getDocs(qRegs);
    regs.forEach(d => batch.delete(d.ref));
    
    // Delete logs
    const qLogs = query(collection(db, 'access_logs'), where('visitor_id', '==', id));
    const logs = await getDocs(qLogs);
    logs.forEach(d => batch.delete(d.ref));
    
    // Delete visitor
    batch.delete(doc(db, 'visitors', id));
    
    await batch.commit();
    return { success: true };
  },

  getEvents: async () => {
    const querySnapshot = await getDocs(collection(db, 'events'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  createEvent: async (data: any) => {
    const newEvent = { 
      ...data, 
      created_at: new Date().toISOString() 
    };
    const docRef = await addDoc(collection(db, 'events'), newEvent);
    return { id: docRef.id, ...newEvent };
  },

  updateEvent: async (id: string, data: any) => {
    const eventRef = doc(db, 'events', id);
    await writeBatch(db).update(eventRef, {
      ...data,
      updated_at: new Date().toISOString()
    }).commit();
    return { success: true };
  },

  deleteEvent: async (id: string) => {
    const batch = writeBatch(db);
    
    const qRegs = query(collection(db, 'registrations'), where('event_id', '==', id));
    const regs = await getDocs(qRegs);
    regs.forEach(d => batch.delete(d.ref));
    
    const qLogs = query(collection(db, 'access_logs'), where('event_id', '==', id));
    const logs = await getDocs(qLogs);
    logs.forEach(d => batch.delete(d.ref));
    
    batch.delete(doc(db, 'events', id));
    await batch.commit();
    return { success: true };
  },

  registerVisitor: async (visitorId: string, eventId: string) => {
    const q = query(
      collection(db, 'registrations'), 
      where('visitor_id', '==', visitorId),
      where('event_id', '==', eventId)
    );
    const existing = await getDocs(q);
    
    if (!existing.empty) {
      throw new Error('Visitor already registered for this event');
    }

    await addDoc(collection(db, 'registrations'), {
      visitor_id: visitorId,
      event_id: eventId,
      registered_at: new Date().toISOString()
    });
    return { success: true };
  },

  scanRFID: async (rfidTag: string) => {
    const tag = rfidTag.trim();
    const now = new Date().toISOString();
    const nowTime = new Date(now).getTime();
    const gracePeriod = 60 * 60 * 1000; // 1 hour grace period

    try {
      // 1. Find visitor
      const qV = query(collection(db, 'visitors'), where('rfid_tag', '==', tag), limit(1));
      const vSnapshot = await getDocs(qV);
      
      if (vSnapshot.empty) {
        return { 
          error: `Visitor not found for tag: "${tag}". Please register this tag first.`, 
          rfid_tag: tag, 
          _isError: true 
        };
      }
      
      const visitorDoc = vSnapshot.docs[0];
      const visitor = { id: visitorDoc.id, ...visitorDoc.data() as any };

      // 2. Find all events to see if any are active right now
      const eventsSnap = await getDocs(collection(db, 'events'));
      const allEvents = eventsSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
      
      let activeEvent = allEvents.find(e => {
        const startTime = new Date(e.start_date).getTime();
        const endTime = new Date(e.end_date).getTime();
        return nowTime >= (startTime - gracePeriod) && nowTime <= (endTime + gracePeriod);
      });

      // Fallback: If no active event, look for "General Access" or create it
      if (!activeEvent) {
        activeEvent = allEvents.find(e => e.name === 'General Access');
        
        if (!activeEvent) {
          const generalEvent = {
            name: 'General Access',
            description: 'Default access for registered visitors',
            start_date: '2000-01-01T00:00:00.000Z',
            end_date: '2100-01-01T00:00:00.000Z',
            created_at: now
          };
          const newEventRef = await addDoc(collection(db, 'events'), generalEvent);
          activeEvent = { id: newEventRef.id, ...generalEvent };
        }
      }

      // 3. Check if visitor is already registered for this active event
      const qReg = query(
        collection(db, 'registrations'), 
        where('visitor_id', '==', visitor.id),
        where('event_id', '==', activeEvent.id)
      );
      const regSnap = await getDocs(qReg);

      if (regSnap.empty) {
        await addDoc(collection(db, 'registrations'), {
          visitor_id: visitor.id,
          event_id: activeEvent.id,
          registered_at: now,
          auto_registered: true
        });
      }

      // 4. Log access
      await addDoc(collection(db, 'access_logs'), {
        visitor_id: visitor.id,
        event_id: activeEvent.id,
        action: 'IN',
        timestamp: now,
        visitor_name: visitor.name,
        event_name: activeEvent.name,
        rfid_tag: tag
      });

      return { 
        success: true, 
        visitor, 
        event: activeEvent, 
        action: 'IN',
        timestamp: now,
        is_new_registration: regSnap.empty
      };
    } catch (error: any) {
      console.error('Scan process error:', error);
      return { 
        error: `System Error: ${error.message || 'Unknown error during scan'}`, 
        rfid_tag: tag,
        _isError: true,
        debug: {
          error_name: error.name,
          error_message: error.message,
          tag_scanned: tag
        }
      };
    }
  },

  getLogs: async () => {
    try {
      const q = query(collection(db, 'access_logs'), orderBy('timestamp', 'desc'), limit(100));
      const snapshot = await getDocs(q);
      
      return await Promise.all(snapshot.docs.map(async d => {
        const data = d.data();
        let visitorName = data.visitor_name || 'Unknown';
        let eventName = data.event_name || 'Unknown';

        try {
          if (data.visitor_id) {
            const vDoc = await getDoc(doc(db, 'visitors', data.visitor_id));
            if (vDoc.exists()) visitorName = (vDoc.data() as any).name;
          }
          
          if (data.event_id) {
            const eDoc = await getDoc(doc(db, 'events', data.event_id));
            if (eDoc.exists()) eventName = (eDoc.data() as any).name;
          }
        } catch (err) {
          console.warn('Could not fetch related docs for log:', d.id, err);
        }
        
        return {
          id: d.id,
          ...data,
          visitor_name: visitorName,
          event_name: eventName
        };
      }));
    } catch (error: any) {
      console.error('Failed to fetch logs:', error);
      if (error.message.includes('index')) {
        throw new Error('Firestore index required. Please check your browser console for the setup link.');
      }
      return [];
    }
  },

  getStats: async () => {
    const [vSnap, eSnap, lSnap] = await Promise.all([
      getDocs(collection(db, 'visitors')),
      getDocs(collection(db, 'events')),
      getDocs(query(collection(db, 'access_logs'), orderBy('timestamp', 'desc'), limit(100)))
    ]);

    return {
      visitorsCount: vSnap.size,
      eventsCount: eSnap.size,
      logs: lSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    };
  }
};
