import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { getRoleLabel } from "../utils/labels";

function ChatPage() {
  const [contacts, setContacts] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");
  const [selectedContactId, setSelectedContactId] = useState("");

  async function loadRooms() {
    const [contactsResponse, roomsResponse] = await Promise.all([api.get("/chat/contacts"), api.get("/chat/rooms")]);
    setContacts(contactsResponse.data);
    setRooms(roomsResponse.data);
    if (!activeRoomId && roomsResponse.data.length > 0) {
      setActiveRoomId(roomsResponse.data[0].id);
    }
    if (!selectedContactId && contactsResponse.data.length > 0) {
      setSelectedContactId(String(contactsResponse.data[0].id));
    }
  }

  async function loadMessages(roomId) {
    if (!roomId) {
      setMessages([]);
      return;
    }
    const response = await api.get(`/chat/rooms/${roomId}/messages`);
    setMessages(response.data);
  }

  useEffect(() => {
    loadRooms();
    const handler = () => {
      loadRooms();
      if (activeRoomId) {
        loadMessages(activeRoomId);
      }
    };
    window.addEventListener("chat:message", handler);

    return () => window.removeEventListener("chat:message", handler);
  }, [activeRoomId]);

  useEffect(() => {
    loadMessages(activeRoomId);
  }, [activeRoomId]);

  const activeRoom = useMemo(() => rooms.find((room) => room.id === activeRoomId), [rooms, activeRoomId]);

  async function sendMessage(event) {
    event.preventDefault();
    if (!content.trim()) {
      return;
    }

    const payload = activeRoomId
      ? { roomId: activeRoomId, content }
      : { participantId: Number(selectedContactId), content };

    const response = await api.post("/chat", payload);
    setContent("");
    await loadRooms();
    setActiveRoomId(response.data.roomId);
    await loadMessages(response.data.roomId);
  }

  return (
    <section className="grid gap-8 lg:grid-cols-[320px,1fr]">
      <aside className="space-y-6 rounded-[32px] border border-orange-100 bg-white p-6 shadow-panel">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-orange-600">Trò chuyện thời gian thực</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-slate-900">Tin nhắn</h1>
        </div>

        <div className="rounded-[24px] border border-slate-200 p-4">
          <label className="mb-2 block text-sm font-semibold text-slate-700">Bắt đầu cuộc trò chuyện mới</label>
          <select
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            value={selectedContactId}
            onChange={(event) => setSelectedContactId(event.target.value)}
          >
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.full_name} ({getRoleLabel(contact.role)})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          {rooms.map((room) => (
            <button
              key={room.id}
              type="button"
              onClick={() => setActiveRoomId(room.id)}
              className={`w-full rounded-[24px] border p-4 text-left ${
                room.id === activeRoomId ? "border-orange-200 bg-orange-50" : "border-slate-200 bg-slate-50"
              }`}
            >
              <p className="font-semibold text-slate-900">{room.peer_name || `Đoạn chat #${room.id}`}</p>
              <p className="mt-1 text-sm text-slate-500">{room.last_message || "Chưa có tin nhắn"}</p>
            </button>
          ))}
        </div>
      </aside>

      <div className="flex min-h-[620px] flex-col rounded-[32px] border border-orange-100 bg-white p-6 shadow-panel">
        <div className="border-b border-slate-200 pb-4">
          <h2 className="font-display text-2xl font-semibold text-slate-900">
            {activeRoom?.peer_name || "Chọn đoạn chat hoặc gửi tin nhắn mới"}
          </h2>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto py-6">
          {messages.map((message) => (
            <div key={message.id} className="rounded-[24px] bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">{message.sender_name}</p>
              <p className="mt-1 text-sm text-slate-600">{message.content}</p>
              <p className="mt-2 text-xs text-slate-400">{new Date(message.created_at).toLocaleString()}</p>
            </div>
          ))}
          {messages.length === 0 && <p className="text-sm text-slate-500">Chưa có tin nhắn nào.</p>}
        </div>

        <form onSubmit={sendMessage} className="flex gap-3 border-t border-slate-200 pt-4">
          <input
            className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            placeholder="Nhập nội dung..."
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />
          <button type="submit" className="rounded-2xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white">
            Gửi
          </button>
        </form>
      </div>
    </section>
  );
}

export default ChatPage;
