import { Chat } from "@/app/types";

function filteredChats(chats: Chat[]) {
    
const lastTenChats = chats.slice(-10);
return lastTenChats.map((chat) => ({
    role: chat.type === "bot" ? "model" : "user",
    parts: [{ text: chat.content }],
}));
}

export default filteredChats;
