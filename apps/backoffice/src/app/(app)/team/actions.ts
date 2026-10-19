"use server";
// Changes to who can access what. Every action re-checks that the caller manages the Team section.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  isAllowedEmail,
  isLastTeamManager,
  removeStaffMember,
  roleEnum,
  sectionEnum,
  setSectionRole,
} from "@learnspace/auth-staff";
import { requireSection } from "@/lib/viewer";
import { env } from "@/lib/env";

export type ActionResult = { ok: true } | { ok: false; error: string };

const email = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  .refine((e) => isAllowedEmail(e, env.allowedDomains), "Only Learn Space email addresses can be added");
const section = z.enum(sectionEnum.enumValues);
const role = z.enum(roleEnum.enumValues);

export async function setAccess(input: { email: string; section: string; role: string }): Promise<ActionResult> {
  const me = await requireSection("team", "manager");
  const parsed = z.object({ email, section, role: z.union([role, z.literal("none")]) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { email: target, section: s, role: next } = parsed.data;

  const demotingTeamManager = s === "team" && next !== "manager";
  if (demotingTeamManager && target === me.email) {
    return { ok: false, error: "You can't remove your own access to manage the team" };
  }
  if (demotingTeamManager && (await isLastTeamManager(target))) {
    return { ok: false, error: "There must always be at least one team manager" };
  }

  await setSectionRole(target, s, next === "none" ? null : next, me.email);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function addPerson(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const me = await requireSection("team", "manager");
  const parsed = z
    .object({ email, section, role })
    .safeParse({ email: form.get("email"), section: form.get("section"), role: form.get("role") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  await setSectionRole(parsed.data.email, parsed.data.section, parsed.data.role, me.email);
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
  if (await isLastTeamManager(target)) return { ok: false, error: "There must always be at least one team manager" };

  await removeStaffMember(target);
  revalidatePath("/", "layout");
  return { ok: true };
}
