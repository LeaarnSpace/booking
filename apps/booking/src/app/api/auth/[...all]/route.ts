import { toNextJsHandler } from "@learnspace/auth-customers/next";
import { auth } from "@/lib/auth";

export const { GET, POST } = toNextJsHandler(auth);
