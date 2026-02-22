"use client";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <section className="card">
      <h2>Something went wrong</h2>
      <p>{error.message}</p>
      <button className="button" type="button" onClick={reset}>
        Retry
      </button>
    </section>
  );
}
