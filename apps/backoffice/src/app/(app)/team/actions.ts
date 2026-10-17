"use server";
// Changes to who can access what. Every action re-checks that the caller manages the Team section.
import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db, roleEnum, sectionAccess, sectionEnum, session, user } from "@learnspace/db";
import { requireSection } from "@/lib/viewer";
import { isAllowedEmail } from "@/lib/env";

export type ActionResult = { ok: true } | { ok: false; error: string };

const email = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  .refine(isAllowedEmail, "Only Learn Space email addresses can be added");
const section = z.enum(sectionEnum.enumValues);
const roleOrNone = z.enum([...roleEnum.enumValues, "none"]);

/** Would this change leave the Team section with no manager? */
async function removesLastTeamManager(target: string) {
  const others = await db
    .select({ email: sectionAccess.email })
    .from(sectionAccess)
    .where(and(eq(sectionAccess.section, "team"), eq(sectionAccess.role, "manager"), ne(sectionAccess.email, target)));
  return others.length === 0;
}

export async function setAccess(input: { email: string; section: string; role: string }): Promise<ActionResult> {
  const me = await requireSection("team", "manager");
  const parsed = z.object({ email, section, role: roleOrNone }).safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { email: target, section: s, role } = parsed.data;

  const demotingTeamManager = s === "team" && role !== "manager";
  if (demotingTeamManager && target === me.email) {
    return { ok: false, error: "You can't remove your own access to manage the team" };
  }
  if (demotingTeamManager && (await removesLastTeamManager(target))) {
    return { ok: false, error: "There must always be at least one team manager" };
  }

  if (role === "none") {
    await db.delete(sectionAccess).where(and(eq(sectionAccess.email, target), eq(sectionAccess.section, s)));
  } else {
    await db
      .insert(sectionAccess)
      .values({ email: target, section: s, role, grantedBy: me.email })
      .onConflictDoUpdate({
        target: [sectionAccess.email, sectionAccess.section],
        set: { role, grantedBy: me.email },
      });
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function addPerson(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const me = await requireSection("team", "manager");
  const parsed = z
    .object({ email, section, role: z.enum(roleEnum.enumValues) })
    .safeParse({ email: form.get("email"), section: form.get("section"), role: form.get("role") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { email: target, section: s, role } = parsed.data;
  await db
    .insert(sectionAccess)
    .values({ email: target, section: s, role, grantedBy: me.email })
    .onConflictDoUpdate({ target: [sectionAccess.email, sectionAccess.section], set: { role, grantedBy: me.email } });
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Takes away all access and signs the person out everywhere */
export async function removePerson(input: { email: string }): Promise<ActionResult> {
  const me = await requireSection("team", "manager");
  const parsed = z.object({ email: z.string().trim().toLowerCase().email() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown person" };
  const target = parsed.data.email;
  if (target === me.email) return { ok: false, error: "You can't remove yourself" };
  if (await removesLastTeamManager(target))
    return { ok: false, error: "There must always be at least one team manager" };

  await db.delete(sectionAccess).where(eq(sectionAccess.email, target));
  const [account] = await db.select({ id: user.id }).from(user).where(eq(user.email, target));
  if (account) await db.delete(session).where(eq(session.userId, account.id));
  revalidatePath("/", "layout");
  return { ok: true };
}
