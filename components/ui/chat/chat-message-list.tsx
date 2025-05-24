import * as React from "react";
import { ArrowDown } from "lucide-react";
import { useAutoScroll } from "@/components/ui/chat/hooks/useAutoScroll";

interface ChatMessageListProps extends React.HTMLAttributes<HTMLDivElement> {
  smooth?: boolean;
}

const ChatMessageList = React.forwardRef<HTMLDivElement, ChatMessageListProps>(
  ({ className, children, smooth = false, ...props }, _ref) => {
    const {
      scrollRef,
      isAtBottom,
      autoScrollEnabled,
      scrollToBottom,
      disableAutoScroll,
    } = useAutoScroll({
      smooth,
      content: children,
    });

    return (
      <div className="relative w-full h-full ">
        <div
          className={`custom-scrollbar flex flex-col h-full overflow-x-hidden overflow-y-auto pb-56 px-16 ${className}`}
          
          ref={scrollRef}
          onWheel={disableAutoScroll}
          onTouchMove={disableAutoScroll}
          {...props}>
          <div className="flex flex-col gap-6 text-sm sm:text-lg">{children}</div>
        </div>

        {!isAtBottom && (
          <button
            onClick={() => {
              scrollToBottom();
            }}
            className="text-white fixed bottom-40 left-[48%] flex items-center justify-center w-10 h-10 
          bg-gradient-to-r from-purple-500 to-violet-500 
          rounded-full transition-all duration-300 transform hover:scale-110 shadow-lg 
          border border-white/20 backdrop-blur-sm"
            aria-label="Scroll up">
            <ArrowDown className="w-4 h-4 text-white" />
          </button>
        )}
      </div>
    );
  }
);

ChatMessageList.displayName = "ChatMessageList";

export { ChatMessageList };
