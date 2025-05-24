import * as React from "react";
// import { Textarea } from "@/components/ui/textarea";
import TextInput from "react-autocomplete-input";
import { cn } from "@/lib/utils";
import "react-autocomplete-input/dist/bundle.css";

// interface ChatInputProps
// extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const ChatInput = React.forwardRef<any, any>(({ className, formRef , ...props }, ref) => {
  return (
    <TextInput
      trigger={["/"]}
      options={{ "/": ["imagine" , "code"] }}
      // autoComplete="off"
      ref={formRef}
      name="message"
      className={cn(
        "w-full bg-transparent text-white placeholder-gray-400 resize-none outline-none text-sm leading-relaxed h-fit",
        // "max-h-12 px-4 my-2 mb-2 py-3 bg-background text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 w-full rounded-md flex items-center h-16 resize-none",
        className
      )}
      {...props}
    />
  );
});
ChatInput.displayName = "ChatInput";

export { ChatInput };
