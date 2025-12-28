"use client";

/*
Purpose:
- Error boundary UI for admin questions page.
*/
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div style={{ padding: 16 }}>
      <p>Failed to load questions.</p>
      <button onClick={() => reset()}>Retry</button>
    </div>
  );
}
