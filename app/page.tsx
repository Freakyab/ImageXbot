"use client";
import InputBox from "@/components/input";
import MessageBox from "@/components/messageBox";
import Navbar from "@/components/navbar";
import { Chat } from "@/type";
import { useState } from "react";

export default function Home() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [error, setError] = useState<string | null>(null);

  return (
    <main className="flex overflow-y-hidden  h-screen flex-col bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 ">
      <Navbar chats={chats} />
      <div className="flex flex-col relative">
        <MessageBox chats={chats} setChats={setChats} error={error} />
        <div className="fixed bottom-0 w-full z-10">
          <InputBox chats={chats} setChats={setChats} setError={setError} />
        </div>
      </div>
    </main>
  );
}
