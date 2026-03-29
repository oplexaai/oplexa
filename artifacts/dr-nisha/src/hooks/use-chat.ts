import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListGeminiConversations, 
  useGetGeminiConversation,
  useCreateGeminiConversation,
  useDeleteGeminiConversation,
  getListGeminiConversationsQueryKey,
  getGetGeminiConversationQueryKey,
  type GeminiMessage
} from "@workspace/api-client-react";

export function useConversations() {
  return useListGeminiConversations();
}

export function useConversation(id: number | null) {
  return useGetGeminiConversation(id as number, {
    query: {
      enabled: id !== null && id > 0,
      refetchOnWindowFocus: false,
    }
  });
}

export function useChatActions() {
  const queryClient = useQueryClient();
  const createMutation = useCreateGeminiConversation();
  const deleteMutation = useDeleteGeminiConversation();

  const createConversation = async (title: string = "New Medical Consultation") => {
    const res = await createMutation.mutateAsync({ data: { title } });
    queryClient.invalidateQueries({ queryKey: getListGeminiConversationsQueryKey() });
    return res;
  };

  const deleteConversation = async (id: number) => {
    await deleteMutation.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListGeminiConversationsQueryKey() });
  };

  return {
    createConversation,
    deleteConversation,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function useStreamingChat(conversationId: number | null) {
  const queryClient = useQueryClient();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedResponse, setStreamedResponse] = useState("");
  const [optimisticUserMessage, setOptimisticUserMessage] = useState<string | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    if (!conversationId) return;

    setIsStreaming(true);
    setStreamedResponse("");
    setOptimisticUserMessage(content);

    try {
      const response = await fetch(`/api/gemini/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No reader available");

      let buffer = "";
      
      while (true) {
        const { value, done } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        
        // Keep the last partial line in the buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.done) {
                // Streaming complete
                break;
              } else if (data.content) {
                setStreamedResponse((prev) => prev + data.content);
              }
            } catch (e) {
              console.error("Failed to parse SSE chunk:", line, e);
            }
          }
        }
      }
      
      // When done, invalidate the specific conversation to fetch the real saved messages
      await queryClient.invalidateQueries({
        queryKey: getGetGeminiConversationQueryKey(conversationId),
      });

    } catch (error) {
      console.error("Error streaming chat:", error);
    } finally {
      setIsStreaming(false);
      setOptimisticUserMessage(null);
      setStreamedResponse("");
    }
  }, [conversationId, queryClient]);

  return {
    sendMessage,
    isStreaming,
    streamedResponse,
    optimisticUserMessage
  };
}
