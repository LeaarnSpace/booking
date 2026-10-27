// Team chat messages (Slack today). Apps get a sender from "@learnspace/chat/factory"; each provider adapter has
// its own entry point.
export type { ChatMessage, ChatSender } from "./types.ts";
export { ChatError, type ChatErrorCode } from "./errors.ts";
