import type { Database } from "@/types/database";

type LeaderboardRow = Database["public"]["Tables"]["leaderboard"]["Row"];

export function Leaderboard({ rows }: { rows: LeaderboardRow[] }) {
  return (
    <section className="card">
      <h3>리더보드</h3>
      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>플레이어</th>
            <th>점수</th>
            <th>시간</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4}>아직 기록이 없습니다.</td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={row.id}>
                <td>{index + 1}</td>
                <td>{row.player_name}</td>
                <td>{row.score}</td>
                <td>{new Date(row.created_at).toLocaleString()}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
