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
import { Chat } from "@/app/types";
import { backendUrl } from "../lib/backendUrl";
import { useUser } from "./context/userContext";
import toast from "react-hot-toast";
import { marked } from "marked";
import DOMPurify from "dompurify";

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
          setChats([]);
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
          console.error("Error fetching chats:", data.message);
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

  const SpecialKeywords = ({ content }: { content: string }) => {
    const keywords = ["/imagine"];
    const keywordRegex = new RegExp(`(${keywords.join("|")})`, "g");
    // Sanitize the markdown before rendering
    const html = marked.parse(content);
    const sanitizedHtml = DOMPurify.sanitize(
      typeof html === "string" ? html : ""
    );

    // Replace keywords in the HTML with span elements
    const replacedHtml = sanitizedHtml.replace(keywordRegex, (match) => {
      return `<span class="font-bold text- special-keyword" data-keyword="${match}">${match}</span>`;
    });

    // Use useEffect to add click handlers after rendering
    React.useEffect(() => {
      const handler = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains("special-keyword")) {
          console.log("Keyword clicked:", target.dataset.keyword);
        }
      };
      document.addEventListener("click", handler);
      return () => document.removeEventListener("click", handler);
    }, []);

    return (
      <span
        key={content}
        className="prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: replacedHtml }}
      />
    );
  };

  return (
    // <div className="flex w-full h-[calc(100vh-16rem)] sm:h-[calc(100vh-14rem)] overflow-y-auto py-2">
    <div className="flex w-full overflow-y-auto py-2 h-screen">
      <div
        className="h-36 flex items-center justify-center fixed -bottom-0 left-0 right-0 mx-auto pointer-events-none
        bg-gradient-to-b from-transparent to-gray-900/85
        "
        style={{
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)", // For Safari compatibility
          zIndex: 1,
        }}></div>

      <ChatMessageList>
        {chats.map((message) => {
          const variant = message.type === "user" ? "sent" : "received";
          return (
            <ChatBubble key={message._id} layout="ai">
              <ChatBubbleAvatar
                className="rounded-lg shadow-lg"
                fallback={variant === "sent" ? "US" : "AI"}
                src={(variant === "sent" && user?.picture) || ""}
              />
              <ChatBubbleMessage>
                <SpecialKeywords content={message.content} />
                {message.imageUrl && (
                  <div className="py-4">
                    <img
                      src={message.imageUrl}
                      alt="Preview is not available"
                      className="w-64 h-auto rounded-lg"
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
                  <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 disabled:from-gray-600 disabled:to-gray-700 transition-all duration-200 text-white shadow-lg px-2 py-0.5 text-xs">
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
