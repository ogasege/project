import { customAlphabet } from "nanoid";

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
const gen = customAlphabet(alphabet, 12);

export function uid(prefix = ""): string {
  return prefix ? `${prefix}_${gen()}` : gen();
}
