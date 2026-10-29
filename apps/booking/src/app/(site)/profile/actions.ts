"use server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { customerEmailChoices, setNotificationSetting, type NotificationSetting } from "@learnspace/bookings";
import { auth } from "@/lib/auth";
import { getViewer } from "@/lib/viewer";

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
}

export async function toggleSetting(setting: NotificationSetting, on: boolean) {
  const viewer = await getViewer();
  if (!viewer || !(await customerEmailChoices()).some((s) => s.id === setting)) return;
  await setNotificationSetting(viewer.id, setting, on);
  revalidatePath("/profile/notifications");
}
