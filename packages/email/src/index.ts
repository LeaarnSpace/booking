// Email interface. Apps get a sender from "@learnspace/email/factory" and templates from
// "@learnspace/email/templates"; each provider adapter has its own entry point.
export type { Address, EmailMessage, EmailSender } from "./types.ts";
export { EmailError, type EmailErrorCode } from "./errors.ts";
