"use client";
import { useCallback } from "react";
import { googleLogout, useGoogleLogin } from "@react-oauth/google";
import { backendUrl } from "../lib/backendUrl";
import { useUser } from "./context/userContext";
import toast from "react-hot-toast";
import { Chat } from "@/type";

export default function Navbar({ chats }: { chats: Chat[] }) {
  // Mock authentication state - replace with your actual auth state
  const { user, setUser } = useUser();
  

  const handleLogout = () => {
    googleLogout();
    setUser(null);
  };

  const calculateTokens = useCallback(() => {
    return chats.reduce((acc, chat) => {
      return acc + (chat.tokenUsed || 0);
    }, 0);
  }, [chats]);

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        toast.loading("Logging in...");
        // Get user info from Google
        const userInfoResponse = await fetch(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: {
              Authorization: `Bearer ${tokenResponse.access_token}`,
            },
          }
        );
        const userInfo = await userInfoResponse.json();

        // Login to your backend
        const response = await fetch(`${backendUrl}/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: userInfo.email,
            password: userInfo.sub + userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture,
          }),
        });
        const data = await response.json();
        toast.dismiss();
        if (data.status) {
          setUser(data.user);
        } else {
          toast.error(data.message);
        }
      } catch (error) {
        toast.dismiss();
        toast.error("Login failed");
        console.error("Error during login:", error);
      }
    },
    onError: () => {
      console.error("Login Failed");
    },
  });

  return (
    <nav className="relative z-20 bg-black/10 backdrop-blur-xl border-b border-white/20">
      <div className=" mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex items-center text-white font-bold text-xl">
              <span className="text-blue-400">Image</span>
              <span className="text-gray-200">-X-</span>
              <span className="text-blue-400">Bot</span>
            </div>
          </div>

          {/* Authentication Buttons */}
          <div className="flex items-center space-x-4">
            {!user?._id ? (
              <button
                onClick={() => login()}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm transition-all duration-200 border border-white/20">
                Sign In
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleLogout()}
                  className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm transition-all duration-200 border border-white/20">
                  Log out
                </button>
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-violet-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium capitalize">
                    {user.name.charAt(0)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
