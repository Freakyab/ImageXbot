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
    <main className="flex min-h-screen flex-col h-full ">
      <Navbar chats={chats}/>
      <div className="flex flex-col px-8">
        <MessageBox chats={chats} setChats={setChats} error={error}/>
        <InputBox setChats={setChats} setError={setError}/>
      </div>
    </main>
  );
}
