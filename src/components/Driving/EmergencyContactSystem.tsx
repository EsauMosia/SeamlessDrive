import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export type EmergencyContact = {
  id?: string;
  user_id: string;
  name: string;
  phone: string;
  relationship?: string;
};

export type EmergencyContactSystemProps = {
  userId: string;
  onCall?: (phone: string) => void;
};

export function EmergencyContactSystem({ userId, onCall }: EmergencyContactSystemProps) {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch contacts from Supabase
  const fetchContacts = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('user_id', userId);
    if (error) setError(error.message);
    else setContacts(data || []);
    setLoading(false);
  };

  // Add a new contact
  const addContact = async (contact: EmergencyContact) => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('emergency_contacts')
      .insert([contact])
      .select();
    if (error) setError(error.message);
    else setContacts([...contacts, ...(data || [])]);
    setLoading(false);
  };

  // Remove a contact
  const removeContact = async (id: string) => {
    setLoading(true);
    setError(null);
    const { error } = await supabase
      .from('emergency_contacts')
      .delete()
      .eq('id', id);
    if (error) setError(error.message);
    else setContacts(contacts.filter(c => c.id !== id));
    setLoading(false);
  };

  // Call a contact
  const callContact = (phone: string) => {
    if (onCall) onCall(phone);
    else window.location.href = `tel:${phone}`;
  };

  // Initial fetch
  React.useEffect(() => {
    fetchContacts();
    // eslint-disable-next-line
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-blue-700">Emergency Contacts</h2>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}
      <ul className="space-y-2">
        {contacts.map(contact => (
          <li key={contact.id} className="flex items-center gap-4">
            <span className="font-medium">{contact.name}</span>
            <span className="text-gray-500">{contact.relationship || ''}</span>
            <button
              className="bg-blue-600 text-white px-3 py-1 rounded-lg"
              onClick={() => callContact(contact.phone)}
            >
              Call
            </button>
            <button
              className="bg-red-600 text-white px-3 py-1 rounded-lg"
              onClick={() => removeContact(contact.id!)}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      {/* Add contact form can be implemented here */}
    </div>
  );
}
