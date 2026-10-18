import { resolveMealItems } from "@/src/services/mealResolver";

/**
 * Turn a casual meal description into resolved, portion-scaled items.
 *
 * Shared by the full chat page and the inline bar on Today. `messages` is the
 * transcript tail as [{ role, text }]; the last one must be the user's.
 *
 * Resolves to { kind, reply, meal, items }. Throws an Error with a message
 * that is safe to show the user.
 */
export async function parseMeal(user, messages) {
  let res;
  try {
    const token = await user.getIdToken();
    res = await fetch("/api/chat-log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ messages, localHour: new Date().getHours() }),
    });
  } catch {
    // The browser's own "Failed to fetch" isn't something a user can act on.
    throw new Error("Network error — check your connection and try again.");
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || "Couldn't reach the AI. Try again.");
  }

  // Ground the AI's numbers in real nutrition data where we can.
  const items = data.kind === "meal" ? await resolveMealItems(data.items || []) : [];
  return { kind: items.length > 0 ? "meal" : "chat", reply: data.reply, meal: data.meal, items };
}
