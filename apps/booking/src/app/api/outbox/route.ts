// Called by the back office after staff approve, decline or release a booking: sends the messages that queued.
// Sending lives here only, so email and Slack settings are needed in this app alone.
import { refuseUnlessBackoffice } from "@/lib/backoffice-calls";
import { sendQueuedMessages } from "@/lib/messages";

export async function POST(request: Request) {
  const refused = refuseUnlessBackoffice(request);
  if (refused) return refused;
  return Response.json(await sendQueuedMessages());
}
