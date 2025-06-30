import { NextRequest } from "next/server";
import { ai } from "@/lib/google";
import { ExpenseAnalysisResponse, Message } from "@/app/types";

export async function POST(req: NextRequest) {
  const { systemPrompt, message, history }: {
    systemPrompt: ExpenseAnalysisResponse;
    message: string;
    history: Message[];
  } = await req.json();

  const chatHistory = [
    {
      role: "model" as const,
      parts: [{ text: `Hello ${systemPrompt.account_Name}` }],
    },
    ...history.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.content }],
    })),
  ];

  const chat = ai.chats.create({
    model: "gemini-2.5-flash",
    config: {
      systemInstruction: `
        You will answer questions based on this JSON bank analysis:
        ${JSON.stringify(systemPrompt, null, 2)}
        Respond only based on this. If not available, say: "I don't have enough information."
        If any question is not related to the analysis, say: "I don't have enough information." but find the closest related information from the your database and provide it.
      `,
    },
    history: chatHistory,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const responseStream = await chat.sendMessageStream({ message });

      for await (const chunk of responseStream) {
        controller.enqueue(encoder.encode(chunk.text));
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "no-cache",
    },
  });
}
