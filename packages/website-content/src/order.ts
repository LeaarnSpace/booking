// Moving an item up or down a list ordered by sort_order: the new order for every item, numbered 1, 2, 3…
// (pure, so it's tested without a database).

export function moveInList<T extends { id: string }>(items: T[], id: string, direction: "up" | "down") {
  const from = items.findIndex((i) => i.id === id);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from === -1 || to < 0 || to >= items.length) return null;
  const next = [...items];
  [next[from], next[to]] = [next[to], next[from]];
  return next.map((item, i) => ({ id: item.id, sortOrder: i + 1 }));
}
