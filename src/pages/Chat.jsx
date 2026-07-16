import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import DashboardLayout from '../components/DashboardLayout';
import { Send, MessageSquare, AlertCircle, HardHat } from 'lucide-react';

export default function Chat() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const [chatRooms, setChatRooms] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  
  const [messages, setMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchInitialChatData();
  }, []);

  useEffect(() => {
    if (chatRooms.length > 0) {
      // Determine if a specific room was passed via navigation state
      const queryRoomId = location.state?.selectedChatId;
      if (queryRoomId) {
        const found = chatRooms.find(r => r.id === queryRoomId);
        if (found) setSelectedRoom(found);
      } else if (!selectedRoom) {
        setSelectedRoom(chatRooms[0]);
      }
    }
  }, [chatRooms, location]);

  useEffect(() => {
    if (selectedRoom) {
      fetchMessages(selectedRoom.id);
      
      // Subscribe to real-time message changes
      const channel = supabase.channel(`chat-room-${selectedRoom.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_room_id=eq.${selectedRoom.id}` },
          (payload) => {
            // Check if message is already present to prevent duplicates in mock client
            setMessages((prev) => {
              if (prev.some(m => m.id === payload.new.id)) return prev;
              return [...prev, payload.new];
            });
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    }
  }, [selectedRoom]);

  useEffect(() => {
    // Scroll to bottom whenever messages load/change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchInitialChatData = async () => {
    setLoading(true);
    try {
      // 1. Fetch profiles to resolve names
      const { data: usersData } = await supabase.from('profiles').select('*');
      setProfiles(usersData || []);

      // 2. Fetch equipment to resolve context
      const { data: equipData } = await supabase.from('equipment').select('*');
      setEquipmentList(equipData || []);

      // 3. Fetch chat rooms
      const { data: rooms, error } = await supabase.from('chat_rooms').select('*');
      if (error) throw error;

      // Filter rooms matching the user's role (admins see all)
      let myRooms = [];
      if (profile?.user_type === 'admin') {
        myRooms = rooms || [];
      } else {
        myRooms = (rooms || []).filter(r => r.customer_id === user.id || r.supplier_id === user.id);
      }

      setChatRooms(myRooms);
    } catch (err) {
      console.error('Error fetching chat details:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (roomId) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessageText.trim() || !selectedRoom) return;

    setSending(true);
    const text = newMessageText.trim();
    setNewMessageText(''); // clear input field early for responsiveness

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          chat_room_id: selectedRoom.id,
          sender_id: user.id,
          message_text: text
        });

      if (error) throw error;
      
      // Manually fetch messages if using mock database (mock subscription handles events locally, but re-fetching ensures sync)
      await fetchMessages(selectedRoom.id);
    } catch (err) {
      console.error('Error sending message:', err);
      setNewMessageText(text); // restore typed message
      alert('Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const getChatPartnerName = (room) => {
    const partnerId = user.id === room.customer_id ? room.supplier_id : room.customer_id;
    const partner = profiles.find(p => p.id === partnerId);
    return partner ? partner.full_name : 'Unknown User';
  };

  const getChatPartnerRole = (room) => {
    const partnerId = user.id === room.customer_id ? room.supplier_id : room.customer_id;
    const partner = profiles.find(p => p.id === partnerId);
    return partner ? partner.user_type : 'operator';
  };

  const getEquipmentName = (equipId) => {
    const equip = equipmentList.find(e => e.id === equipId);
    return equip ? equip.name : 'Equipment Inquiry';
  };

  const getSenderName = (senderId) => {
    if (senderId === user.id) return 'You';
    const sender = profiles.find(p => p.id === senderId);
    return sender ? sender.full_name : 'User';
  };

  return (
    <DashboardLayout title="Real-Time Messenger">
      {loading ? (
        <div className="flex-center" style={{ minHeight: '400px' }}>
          <div className="badge badge-warning" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>Initializing Chats...</div>
        </div>
      ) : chatRooms.length === 0 ? (
        <div className="card flex-center container" style={{ minHeight: '300px', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
          <MessageSquare size={48} style={{ color: 'var(--text-muted)' }} />
          <p style={{ color: 'var(--text-muted)' }}>No conversations started yet. Use the "Chat with Supplier" button on any equipment card to begin.</p>
        </div>
      ) : (
        <div className="chat-container">
          
          {/* Chat Rooms Sidebar */}
          <aside className="chat-sidebar">
            <div className="chat-sidebar-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800' }}>Inbox Conversations</h3>
            </div>
            <div style={{ flex: 1 }}>
              {chatRooms.map((room) => {
                const partnerName = getChatPartnerName(room);
                const role = getChatPartnerRole(room);
                const equipName = getEquipmentName(room.equipment_id);
                return (
                  <div
                    key={room.id}
                    onClick={() => setSelectedRoom(room)}
                    className={`chat-list-item ${selectedRoom?.id === room.id ? 'active' : ''}`}
                  >
                    <div className="chat-avatar">
                      {partnerName.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <div className="flex-between" style={{ marginBottom: '0.15rem' }}>
                        <span style={{ fontWeight: '700', color: '#fff', fontSize: '0.95rem' }}>{partnerName}</span>
                        <span className="badge" style={{
                          padding: '0.1rem 0.4rem',
                          fontSize: '0.65rem',
                          background: role === 'supplier' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                          color: role === 'supplier' ? 'var(--primary)' : '#10b981'
                        }}>
                          {role}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        Inquiry: {equipName}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          {/* Active Conversation Main */}
          <section className="chat-main">
            {selectedRoom ? (
              <>
                {/* Header */}
                <div className="chat-header">
                  <div className="chat-avatar" style={{ width: '40px', height: '40px', fontSize: '1rem' }}>
                    {getChatPartnerName(selectedRoom).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#fff' }}>{getChatPartnerName(selectedRoom)}</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <HardHat size={12} />
                      Regarding: {getEquipmentName(selectedRoom.equipment_id)}
                    </span>
                  </div>
                </div>

                {/* Message Log */}
                <div className="chat-messages">
                  {messages.map((m) => {
                    const isSelf = m.sender_id === user.id;
                    return (
                      <div
                        key={m.id}
                        className={`message-bubble ${isSelf ? 'message-sent' : 'message-received'}`}
                      >
                        {!isSelf && (
                          <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--primary)', marginBottom: '0.2rem' }}>
                            {getSenderName(m.sender_id)}
                          </span>
                        )}
                        <p style={{ margin: 0, wordBreak: 'break-word' }}>{m.message_text}</p>
                        <span className="message-timestamp">
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="chat-input-area">
                  <form onSubmit={handleSendMessage} className="chat-input-form">
                    <input
                      type="text"
                      className="form-input"
                      required
                      placeholder="Type your message here..."
                      value={newMessageText}
                      onChange={(e) => setNewMessageText(e.target.value)}
                      disabled={sending}
                      style={{ padding: '0.85rem 1.25rem', borderRadius: '12px' }}
                    />
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={sending || !newMessageText.trim()}
                      style={{ padding: '0.85rem 1.5rem', borderRadius: '12px' }}
                    >
                      <Send size={18} />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-center" style={{ flex: 1, flexDirection: 'column', gap: '1rem' }}>
                <MessageSquare size={36} style={{ color: 'var(--text-muted)' }} />
                <p style={{ color: 'var(--text-muted)' }}>Select a conversation from the sidebar to view messages.</p>
              </div>
            )}
          </section>

        </div>
      )}
    </DashboardLayout>
  );
}
