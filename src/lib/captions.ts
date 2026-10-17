import { bnNum } from "./bn";
import type { PujoStats } from "./stats";

const TAGS = "#DurgaPuja2026 #Pujo2026 #DurgaPujo #KolkataPujo";

export function captionIdeas(stats: PujoStats | null, picked: number): string[] {
  const total = stats ? bnNum(stats.total) : null;
  const ideas = [
    "পুজো শেষ, কিন্তু ছবিগুলো এখনও গ্যালারিতে অষ্টমী করছে।",
    `ষষ্ঠী থেকে দশমী, পাঁচ দিনের গল্প ${bnNum(picked)}টা ছবিতে।`,
    "আসছে বছর আবার হবে। ততদিন এই ছবিগুলোই ভরসা।",
    "মা এসেছিলেন, আমরা ছবি তুলেছিলাম। বাকিটা ইতিহাস।",
    "এ বছর ঠাকুর কম দেখেছি, ঠাকুরের সঙ্গে নিজেকে বেশি দেখেছি।",
    "দশমী মানেই মন খারাপ, তাই ছবি পোস্ট করে মন ভালো করছি।",
    "প্যান্ডেল হপিং ফুল মার্কস, ঘুম শূন্য।",
  ];
  if (total) ideas.splice(1, 0, `${total}টা ছবি তুলেছিলাম, পোস্ট করার সাহস হল ${bnNum(picked)}টার।`);
  return ideas.map((line) => `${line}\n\n${TAGS}`);
}
