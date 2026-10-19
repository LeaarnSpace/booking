import { toNextJsHandler } from "@learnspace/auth-staff/next";
import { auth } from "@/lib/auth";

export const { GET, POST } = toNextJsHandler(auth);
