"use client";
import React from "react";
import {
  ChatBubble,
  ChatBubbleAvatar,
  ChatBubbleMessage,
  ChatBubbleAction,
} from "./ui/chat/chat-bubble";
import { ChatMessageList } from "./ui/chat/chat-message-list";
import { Copy, DownloadIcon, RefreshCcw, Zap } from "lucide-react";
import { Chat } from "@/type";
import { backendUrl } from "../lib/backendUrl";
import { useUser } from "./context/userContext";
import toast from "react-hot-toast";

function MessageBox({
  chats,
  error,
  setChats,
}: {
  chats: Chat[];
  error: string | null;
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
}) {
  const { user } = useUser();

  React.useEffect(() => {
    const fetchChats = async () => {
      try {
        if (user === null) {
          throw new Error("User is not logged in");
        }

        const response = await fetch(`${backendUrl}/getChats/${user._id}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            // Authorization: `Bearer ${user?.token}`,
          },
        });
        const data = await response.json();
        if (data.status) {
          setChats(data.chats);
        } else {
          console.log("Error fetching chats:", data.message);
        }
      } catch (error) {
        console.error("Error fetching chats:", error);
      } finally {
        console.log("Fetch chats completed");
      }
    };

    fetchChats();
  }, [user]);

  const actionIcons = [
    { icon: Copy, type: "Copy" },
    { icon: RefreshCcw, type: "Regenerate" },
  ];

  const handleDownload = (url: string) => {
    fetch(url)
      .then((response) => response.blob())
      .then((blob) => {
        const link = document.createElement("a");
        const objectUrl = URL.createObjectURL(blob);
        link.href = objectUrl;
        link.download = "image.jpg"; // Set the desired filename
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(objectUrl);
      })
      .catch((error) => {
        console.error("Download failed:", error);
      });
  };

  const specialKeywords = (content: string) => {
    const keywords = ["/imagine"];
    const keywordRegex = new RegExp(`(${keywords.join("|")})`, "g");
    const parts = content.split(keywordRegex);
    console.log("Parts:", parts);
    const keywordElements = parts.map((part, index) => {
      if (keywords.includes(part)) {
        return (
          <span
            key={index}
            className="font-bold text-blue-600"
            onClick={() => {
              console.log("Keyword clicked:", part);
            }}>
            {part}
          </span>
        );
      }
      return part;
    });
    return (
      <span key={content} className="">
        {keywordElements}
      </span>
    );
  };

  return (
    <div className="flex w-full h-[calc(100vh-12rem)] overflow-y-auto py-2">
      <ChatMessageList>
        {chats.map((message, index) => {
          const variant = message.type === "user" ? "sent" : "received";
          return (
            <ChatBubble key={message._id} layout="ai">
              <ChatBubbleAvatar fallback={variant === "sent" ? "US" : "AI"} />
              <ChatBubbleMessage>
                {specialKeywords(message.content) as React.ReactNode}
                {message.imageUrl && (
                  <div className="py-4">
                    <img
                      src={message.imageUrl}
                      alt="deleted from server"
                      className="w-64 h-auto mt-2 rounded-lg"
                    />
                  </div>
                )}
                {message.type === "bot" && (
                  <div>
                    {actionIcons.map(({ icon: Icon, type }) => (
                      <ChatBubbleAction
                        className="size-6"
                        key={type}
                        icon={<Icon className="size-3" />}
                        onClick={() => {
                          if (type === "Copy") {
                            navigator.clipboard.writeText(message.content);
                            toast.success("Copied to clipboard");
                          } else if (type === "Regenerate") {
                            console.log("Regenerate clicked");
                          }
                        }}
                      />
                    ))}
                    {message.imageUrl && (
                      <ChatBubbleAction
                        className="size-6"
                        icon={<DownloadIcon className="size-3" />}
                        onClick={() => handleDownload(message.imageUrl!)}
                      />
                    )}
                  </div>
                )}
                {message.tokenUsed !== 0 && (
                  <div className="absolute bottom-1 right-1 flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600 shadow-sm">
                    <Zap className="size-3" />
                    <span>
                      {message.tokenUsed.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}
              </ChatBubbleMessage>
            </ChatBubble>
          );
        })}
        {chats.length % 2 !== 0 && error === null && (
          <ChatBubble variant="received">
            <ChatBubbleAvatar fallback="AI" />
            <ChatBubbleMessage isLoading />
          </ChatBubble>
        )}
      </ChatMessageList>
    </div>
  );
}

export default MessageBox;
