"use client";

import { useState } from "react";
import { Send, MessageCircle, User, Bot, History } from "lucide-react";
import { ExpenseAnalysisResponse } from "@/app/types";
import { Message } from "@/app/types";

// Simple markdown renderer component
const MarkdownRenderer = ({ content }: { content: string }) => {
  const renderMarkdown = (text: string) => {
    // Handle bold text
    text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // Handle italic text
    text = text.replace(/\*(.*?)\*/g, "<em>$1</em>");

    // Handle code blocks
    text = text.replace(
      /```([\s\S]*?)```/g,
      '<pre class="bg-gray-800 text-white p-3 rounded-lg overflow-x-auto my-2"><code>$1</code></pre>'
    );

    // Handle inline code
    text = text.replace(
      /`(.*?)`/g,
      '<code class="bg-gray-200 px-1 py-0.5 rounded text-sm">$1</code>'
    );

    // Handle headers
    text = text.replace(
      /^### (.*$)/gm,
      '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>'
    );
    text = text.replace(
      /^## (.*$)/gm,
      '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>'
    );
    text = text.replace(
      /^# (.*$)/gm,
      '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>'
    );

    // Handle bullet points
    text = text.replace(/^\* (.*$)/gm, '<li class="ml-4">$1</li>');
    text = text.replace(/^- (.*$)/gm, '<li class="ml-4">$1</li>');

    // Handle numbered lists
    text = text.replace(/^\d+\. (.*$)/gm, '<li class="ml-4">$1</li>');

    // Handle line breaks
    text = text.replace(/\n/g, "<br>");

    return text;
  };

  return (
    <div
      className="prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
};

export default function ChatPage({
  analysisResult,
}: {
  analysisResult: ExpenseAnalysisResponse;
}) {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<
    {
      question: string;
      answer: string;
    }[]
  >([]);

  const handleAsk = async () => {
    if (!question.trim()) return;

    setResponse("");
    setLoading(true);

    const currentQuestion = question;
    let fullAnswer = "";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          systemPrompt: analysisResult,
          message: currentQuestion,
          history: messages,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder("utf-8");

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          fullAnswer += chunk;
          setResponse((prev) => prev + chunk);
        }

        setHistory((prev) => [
          { question: currentQuestion, answer: fullAnswer },
          ...prev,
        ]);

        setMessages((prev) => [
          ...prev,
          { role: "user", content: question },
          { role: "model", content: fullAnswer },
        ]);
      }
    } catch (error) {
      console.error("Error:", error);
      setResponse("Sorry, there was an error processing your request.");
    }

    setQuestion("");
    setLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  return (
    <div className=" bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-6 p-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-xl">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                AI Bank Analysis Chat
              </h1>
              <p className="text-gray-600">
                Ask questions about your financial data and get insights
              </p>
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Current Response */}
          {(response || loading) && (
            <div className="border-b border-gray-100">
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-gradient-to-r from-green-500 to-blue-500 p-2 rounded-lg flex-shrink-0">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 mb-2">
                      AI Assistant
                    </div>
                    {loading && !response && (
                      <div className="flex items-center gap-2 text-gray-500">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                        <span>Thinking...</span>
                      </div>
                    )}
                    {response && (
                      <div className="bg-gray-50 rounded-xl p-4">
                        <MarkdownRenderer content={response} />
                        {loading && (
                          <div className="mt-2 flex items-center gap-2 text-gray-500">
                            <div className="animate-pulse w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-sm">
                              Generating response...
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Input Section */}
          <div className="p-6">
            <div className="flex gap-3">
              <div className="flex-1">
                <div className="relative">
                  <textarea
                    className="w-full p-4 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 min-h-[80px]"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask a question about your bank analysis..."
                    disabled={loading}
                  />
                </div>
              </div>
              <button
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-4 rounded-xl transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg hover:shadow-xl"
                onClick={handleAsk}
                disabled={loading || !question.trim()}>
                <Send className="w-5 h-5" />
                {loading ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>

        {/* Chat History */}
        {history.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mt-6 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-2 rounded-lg">
                  <History className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">
                  Chat History
                </h2>
              </div>
            </div>

            <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
              {history
                .map((item, index) => (
                  <div key={index} className="p-6">
                    {/* User Question */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className="bg-gradient-to-r from-gray-500 to-gray-600 p-2 rounded-lg flex-shrink-0">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 mb-1">
                          You
                        </div>
                        <div className="bg-blue-50 rounded-xl p-3 text-gray-800">
                          {item.question}
                        </div>
                      </div>
                    </div>

                    {/* AI Response */}
                    <div className="flex items-start gap-4">
                      <div className="bg-gradient-to-r from-green-500 to-blue-500 p-2 rounded-lg flex-shrink-0">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 mb-1">
                          AI Assistant
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3">
                          <MarkdownRenderer content={item.answer} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
