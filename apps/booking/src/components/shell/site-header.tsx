import { countUnread } from "@learnspace/bookings";
import { getViewer } from "@/lib/viewer";
import { AppHeader } from "./header";

/** The top bar with the signed-in customer and their unread notification count */
export async function SiteHeader({ overlay }: { overlay?: boolean }) {
  const viewer = await getViewer();
  const unread = viewer ? await countUnread(viewer.id) : 0;
  return <AppHeader viewer={viewer} unread={unread} overlay={overlay} />;
}
