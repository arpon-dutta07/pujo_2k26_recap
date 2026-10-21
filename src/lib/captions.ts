// Ready-to-paste Instagram captions. Each copied caption ends with a line that
// tags the page (@handle followed by a space, so Instagram links it) and the
// hashtags. Short, everyday Kolkata talk: no slogans.
import { SITE } from "../config";

export type Mood = "moja" | "adda" | "bari" | "doshomi";

export const MOODS: Array<[Mood, string]> = [
  ["moja", "মজার"],
  ["adda", "বন্ধুরা"],
  ["bari", "বাড়ি"],
  ["doshomi", "দশমী"],
];

export type Caption = { text: string; mood: Mood };

export const CAPTIONS: Caption[] = [
  { mood: "moja", text: "লাইনে দাঁড়ালাম ৪০ মিনিট, ঠাকুর দেখলাম ৪০ সেকেন্ড। তাও worth it." },
  { mood: "moja", text: "মা বলেছিল দশটার মধ্যে ফিরবি। ফিরলাম রাত তিনটেয়।" },
  { mood: "moja", text: "অঞ্জলি দিয়েই সোজা রোলের দোকানে।" },
  { mood: "moja", text: "শাড়ি সামলে pandal hopping করলাম। Achievement unlocked." },
  { mood: "moja", text: "ছবি তোলার আগে দশবার 'আরেকটা তোল' বলেছি। ভালোগুলো এখানে।" },
  { mood: "moja", text: "Pujo dump. ঝাপসা ছবিগুলোও রাখলাম, ওগুলোতেই বেশি মজা ছিল।" },
  { mood: "moja", text: "চার দিনে ঘুম হয়েছে মোটে চার ঘণ্টা। আবার হলে আবার করব।" },
  { mood: "adda", text: "কলেজের গ্রুপটা এই কদিন আবার এক হল।" },
  { mood: "adda", text: "ভিড় ঠেলে ঠাকুর দেখে বেরিয়েই ফুচকা। এই রুটিন বদলাবে না।" },
  { mood: "adda", text: "নতুন জামা পরে সেই পুরনো আড্ডার জায়গাতেই বসলাম।" },
  { mood: "adda", text: "সারা রাত হাঁটলাম, গল্প ফুরোল না।" },
  { mood: "adda", text: "'সবাই একটু চেপে দাঁড়া' বলে বলে গ্রুপ ছবিটা অবশেষে উঠল।" },
  { mood: "bari", text: "বাড়ির পুজোয় সবাই একসাথে, বছরে এই একবারই হয়।" },
  { mood: "bari", text: "এই পাঞ্জাবিটা শুধু পুজোতেই আলমারি থেকে বেরোয়।" },
  { mood: "bari", text: "দিদার হাতের নাড়ু না খেলে পুজো শুরুই হয় না।" },
  { mood: "bari", text: "সন্ধিপুজোর ঢাকের আওয়াজ এখনও কানে বাজছে।" },
  { mood: "bari", text: "এবার সবচেয়ে বেশি সময় কাটল পাড়ার প্যান্ডেলেই।" },
  { mood: "doshomi", text: "দশমীর বিকেলটা সবসময় তাড়াতাড়ি চলে আসে।" },
  { mood: "doshomi", text: "সিঁদুর খেলার লাল এখনও গাল থেকে যায়নি।" },
  { mood: "doshomi", text: "আসছে বছর আবার হবে। ততদিন এই ছবিগুলো দিয়েই চালাব।" },
  { mood: "doshomi", text: "বিজয়ার মিষ্টির প্লেট হাতে এল, বুঝলাম পুজো শেষ।" },
];

export const HANDLE = `@${SITE.instagram}`;
export const PROFILE_URL = `https://www.instagram.com/${SITE.instagram}/`;

// A space after the handle: a letter stuck to it would break the tag.
export const CREDIT = `মুডবোর্ড বানিয়েছি ${HANDLE} এর সাইটে`;

export const fullCaption = (text: string) => `${text}\n\n${CREDIT}\n${SITE.hashtags}`;

// Clipboard, with the old textarea trick for browsers that block it.
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}
