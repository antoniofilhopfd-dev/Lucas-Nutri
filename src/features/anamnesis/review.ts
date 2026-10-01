import type { ExtractedItem } from "@/lib/ai/types";
/** Nada vira dado clínico sem confirmação humana. */
export const confirm = (i: ExtractedItem): ExtractedItem => ({ ...i, status: "confirmed" });
export const edit = (i: ExtractedItem, value: string): ExtractedItem => {
  if (!value.trim()) throw new Error("Valor vazio");
  return { ...i, value: value.trim(), status: "edited" };
};
export const reject = (i: ExtractedItem): ExtractedItem => ({ ...i, status: "rejected" });
export const toPersist = (items: ExtractedItem[]) => items.filter((i) => i.status === "confirmed" || i.status === "edited");
export const pendingCount = (items: ExtractedItem[]) => items.filter((i) => i.status === "pending").length;
