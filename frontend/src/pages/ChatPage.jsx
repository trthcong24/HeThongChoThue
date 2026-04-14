import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import PageHeader from "../components/PageHeader";

const ChatPage = () => {
  const { user, isAdmin } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");
  const [selectedContactId, setSelectedContactId] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadRooms = async () => {
    try {
      const [contactsResponse, roomsResponse] = await Promise.all([api.get("/chat/contacts"), api.get("/chat/rooms")]);
      const contactsData = contactsResponse.data || [];
      const roomsData = roomsResponse.data || [];
      setContacts(contactsData);
      setRooms(roomsData);

      if (!activeRoomId && roomsData.length > 0) {
        setActiveRoomId(roomsData[0].id);
      }

      if (!selectedContactId && contactsData.length > 0) {
        setSelectedContactId(String(contactsData[0].id));
      }

      if (!isAdmin && contactsData.length === 1) {
        setSelectedContactId(String(contactsData[0].id));
      }
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Không thể tải dữ liệu chat");
    }
  };

  const loadMessages = async (roomId) => {
    if (!roomId) {
      setMessages([]);
      return;
    }

    try {
      const response = await api.get(`/chat/rooms/${roomId}/messages`);
      setMessages(response.data || []);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Không thể tải lịch sử tin nhắn");
    }
  };

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

  const selectedContact = useMemo(
    () => contacts.find((item) => Number(item.id) === Number(selectedContactId)),
    [contacts, selectedContactId]
  );

  const sendMessage = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    if (!content.trim()) {
      return;
    }

    const targetParticipantId = activeRoom ? activeRoom.peer_id : Number(selectedContactId);
    if (!activeRoomId && !targetParticipantId) {
      setErrorMessage("Vui lòng chọn người nhận trước khi gửi tin nhắn");
      return;
    }

    setIsSending(true);

    const payload = activeRoomId
      ? { roomId: activeRoomId, content }
      : { participantId: targetParticipantId, content };

    try {
      const response = await api.post("/chat", payload);
      setContent("");
      await loadRooms();
      setActiveRoomId(response.data.roomId);
      await loadMessages(response.data.roomId);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Không gửi được tin nhắn");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section className="grid gap-8 lg:grid-cols-[320px,1fr]">
      <aside className="space-y-6 rounded-[32px] border border-orange-100 bg-white p-6 shadow-panel">
        <PageHeader eyebrow="Realtime chat" title="Tin nhắn riêng" />

        {!isAdmin && (
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Bạn đang chat riêng 1-1 với bộ phận admin hỗ trợ.
          </p>
        )}

        <div className="rounded-[24px] border border-slate-200 p-4">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            {isAdmin ? "Chọn user để chat" : "Chọn admin hỗ trợ"}
          </label>
          <select
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            value={selectedContactId}
            onChange={(event) => setSelectedContactId(event.target.value)}
            disabled={!isAdmin && contacts.length <= 1}
          >
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.full_name} ({contact.role})
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
              <p className="font-semibold text-slate-900">{room.peer_name || `Room #${room.id}`}</p>
              <p className="mt-1 text-sm text-slate-500">{room.last_message || "Chua co tin nhan"}</p>
            </button>
          ))}
          {rooms.length === 0 && <p className="text-sm text-slate-500">Chưa có phòng chat. Hãy gửi tin nhắn đầu tiên.</p>}
        </div>
      </aside>

      <div className="flex min-h-[620px] flex-col rounded-[32px] border border-orange-100 bg-white p-6 shadow-panel">
        <div className="border-b border-slate-200 pb-4">
          <h2 className="font-display text-2xl font-semibold text-slate-900">
            {activeRoom?.peer_name || selectedContact?.full_name || "Chọn người để bắt đầu chat"}
          </h2>
          {activeRoom?.peer_role && (
            <p className="mt-1 text-sm text-slate-500">Phòng riêng với {activeRoom.peer_role === "admin" ? "admin" : "user"}</p>
          )}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto py-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`rounded-[24px] p-4 ${Number(message.sender_id) === Number(user?.id) ? "bg-teal-50" : "bg-slate-50"}`}
            >
              <p className="text-sm font-semibold text-slate-900">
                {Number(message.sender_id) === Number(user?.id) ? "Bạn" : message.sender_name}
              </p>
              <p className="mt-1 text-sm text-slate-600">{message.content}</p>
              <p className="mt-2 text-xs text-slate-400">{new Date(message.created_at).toLocaleString()}</p>
            </div>
          ))}
          {messages.length === 0 && <p className="text-sm text-slate-500">Chua co tin nhan nao.</p>}
        </div>

        {errorMessage && <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>}

        <form onSubmit={sendMessage} className="flex gap-3 border-t border-slate-200 pt-4">
          <input
            className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            placeholder="Nhap noi dung..."
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />
          <button
            type="submit"
            disabled={isSending || (!activeRoomId && !selectedContactId)}
            className="rounded-2xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isSending ? "Đang gửi..." : "Gửi"}
          </button>
        </form>
      </div>
    </section>
  );
};

export default ChatPage;
