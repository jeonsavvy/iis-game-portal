"use client";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <section className="card">
      <h2>문제가 발생했습니다</h2>
      <p>{error.message}</p>
      <button className="button" type="button" onClick={reset}>
        다시 시도
      </button>
    </section>
  );
}
