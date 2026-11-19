// The random code in a job page's address. Letters and digits that can't be mistaken for each other (no 0/o, 1/l/i),
// 10 of them: about 10^14 possibilities, so a link-only role can't be found by guessing.
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const LENGTH = 10;

export function newRoleCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(LENGTH));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export const isRoleCode = (s: string) => new RegExp(`^[${ALPHABET}]{${LENGTH}}$`).test(s);
