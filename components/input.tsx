"use client";
import React from "react";
import { ChatInput } from "./ui/chat/chat-input";
import { Button } from "./ui/button";
import { CornerDownLeft, Paperclip } from "lucide-react";
import { useUser } from "./context/userContext";
import { backendUrl } from "../lib/backendUrl";
import { Chat } from "@/type";
import { toast } from "react-hot-toast";
import { timer } from "@/lib/timer";
import filteredChats from "@/lib/filteredChats";

function InputBox({
  chats,
  setChats,
  setError,
}: {
  chats: Chat[];
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  const { user } = useUser();
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [coolDownTime, setCoolDownTime] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);
  const [value, setValue] = React.useState("");


  const handleInputChange = (event: string) => {
    const inputValue = event;
    setValue(inputValue);
    if (inputValue.length === 0 || inputValue.includes("/imagine")) {
      setShowSuggestions(false);
    } else if (
      inputValue.includes("/") ||
      inputValue.includes("imagine") ||
      inputValue.includes("generate") ||
      inputValue.includes("create")
    ) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" && event.ctrlKey) {
        event.preventDefault();
        const form = document.querySelector("form");
        if (form) {
          (form as HTMLFormElement).requestSubmit();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    try {
      event.preventDefault();
      setIsLoading(true);
      if (user === null) {
        toast.error("Please login to send a message");
        return;
      }

      setShowSuggestions(false);
      setError(null);

      let imageUrl = "";
      const existingFormData = new FormData(event.currentTarget);
      const context = existingFormData.get("message");

      if (!context) {
        toast.error("Please enter a message");
        return;
      }

      if (coolDownTime > 0 && context.toString().includes("/imagine")) {
        toast.error(
          `Please wait before sending another message. time left : ${
            timer - coolDownTime
          } seconds`
        );
        return;
      }

      if (context.toString().includes("/imagine")) {
        toast.loading("Generating image...");
      }

      setChats((prev) => [
        ...prev,
        {
          _id: "temp-id",
          userId: user._id,
          content: context.toString(),
          imageUrl: file ? URL.createObjectURL(file) : "",
          isImage: !!file,
          type: "user",
          tokenUsed: 0,
          createdAt: new Date().toISOString(),
        },
      ]);

      if (file) {
        const formData = new FormData();
        // change name of file as imageBot_generated_image_${Date.now()}
        const fileName = `imageBot_generated_image_${Date.now()}`;
        formData.append("file", file, fileName);
        // formData.append("file", file);

        formData.append("upload_preset", "default-preset"); // make sure this preset is unsigned

        const uploadResponse = await fetch(
          "https://api.cloudinary.com/v1_1/dz2vnojqy/image/upload",
          {
            method: "POST",
            body: formData,
          }
        );

        const uploadData = await uploadResponse.json();
        imageUrl = uploadData.secure_url;
      }

      const response = await fetch(`${backendUrl}/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({
          context,
          imageUrl,
          userId: user._id,
          history: filteredChats(chats),
        }),
      });
      const data = await response.json();
      toast.dismiss();
      if (data.status) {
        const userMessage = data.chats.user;
        const botMessage = data.chats.ai;

        setChats((prev) => {
          const filteredChats = prev.filter((chat) => chat._id !== "temp-id");
          return [
            ...filteredChats,
            {
              _id: userMessage._id,
              userId: userMessage.userId,
              content: userMessage.content,
              imageUrl: userMessage.imageUrl,
              isImage: userMessage.isImage,
              type: "user",
              tokenUsed: userMessage.tokenUsed,
              createdAt: new Date().toISOString(),
            },

            {
              _id: botMessage._id,
              userId: botMessage.userId,
              content: botMessage.content,
              imageUrl: botMessage.imageUrl,
              isImage: botMessage.isImage,
              type: "bot",
              tokenUsed: botMessage.tokenUsed,
              createdAt: new Date().toISOString(),
            },
          ];
        });

        if (context.toString().includes("/imagine")) {
          setCoolDownTime(0);
          setTimeout(() => {
            setCoolDownTime(timer);
          }, 1000);

          const interval = setInterval(() => {
            setCoolDownTime((prev) => {
              if (prev <= 0) {
                clearInterval(interval);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      } else {
        toast.error("Failed to send message");
        setError(data.message);
        setChats((prev) => prev.filter((chat) => chat._id !== "temp-id"));
      }
    } catch (error) {
      toast.dismiss();
      toast.error("An error occurred while sending the message");
      console.error("Error sending message:", error);
      setError("Failed to send message. Please try again.");
      setChats((prev) => prev.filter((chat) => chat._id !== "temp-id"));
    } finally {
      console.log("Fetch chats completed");
      setFile(null);
      setPreview(null); 
      setValue("");
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files[0]) return;

    const selectedFile = files[0];
    setFile(selectedFile);

    // Show preview as base64
    await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
        resolve(true);
      };
      reader.readAsDataURL(selectedFile);
    });
  };

  return (
    <div className="flex w-full">
      {file && (
        <div className="group relative w-10 h-10 m-2">
          <img
            src={preview ?? ""}
            alt="Uploaded"
            className="object-cover w-10 h-10 rounded-lg"
          />
          <button
            className="hidden group-hover:block absolute top-0 text-white bg-black w-10 h-10 rounded-lg"
            onClick={() => {
              setFile(null);
              setPreview(null);
              // setImage(null);
            }}>
            X
          </button>
        </div>
      )}
      <form
        onSubmit={handleFormSubmit}
        className="relative w-full rounded-lg border bg-background focus-within:ring-1 focus-within:ring-ring p-1">
        {showSuggestions && (
          <div className="absolute -top-10 left-0 w-full p-2 rounded-t-lg border bg-background  shadow-md">
            <p className="text-sm text-gray-700">
              Suggestions: <span className="font-bold">/imagine </span> to
              generate an image
            </p>
          </div>
        )}
        <ChatInput
          value={value}
          onChange={handleInputChange}
          placeholder="Type your message here..."
          className="min-h-12 resize-none rounded-lg bg-background border-0 p-3 shadow-none focus-visible:ring-0"
        />
        <div className="flex items-center p-3 pt-0">
          <input
            type="file"
            id="file-upload"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <Paperclip className="size-4" />
            <span className="sr-only">Attach file</span>
          </label>

          {/* <Button variant="ghost" size="icon">
            <Mic className="size-4" />
            <span className="sr-only">Use Microphone</span>
          </Button> */}

          <Button size="sm" className="ml-auto gap-1.5" disabled={isLoading}>
            Send Message
            <CornerDownLeft className="size-3.5" />
          </Button>
        </div>
      </form>
    </div>
  );
}

export default InputBox;
