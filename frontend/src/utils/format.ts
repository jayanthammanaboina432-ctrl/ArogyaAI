// Display-only formatting helpers. Never mutate stored data — these only
// affect how a value is rendered on screen.

/** "AMMANABOINA JAYANTH" -> "Ammanaboina Jayanth" */
export function titleCase(text: string): string {
  return text
    .trim()
    .split(/\s+/)
    .map((word) =>
      word.length > 1
        ? word[0].toUpperCase() + word.slice(1).toLowerCase()
        : word.toUpperCase()
    )
    .join(' ');
}

/** First word of a (title-cased) name, for short greetings. */
export function firstName(name: string): string {
  return titleCase(name).split(' ')[0] || '';
}

/** Up to 2 initials from a name, for avatars. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}
