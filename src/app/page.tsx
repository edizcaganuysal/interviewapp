export default function Page() {
  return (
    <div className="page">
      <div className="card" style={{ padding: 24, display: "grid", gap: 16 }}>
        <h1 style={{ margin: 0, fontSize: 30 }}>InterPrep</h1>
        <p style={{ margin: 0, color: "#475569" }}>
          End-to-end loop: Jobs → Fit Score → Plan → Practice → Skill Updates. Inspired by LinkedIn, HackerRank, and modern prep tools.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a className="primary-link" href="/dashboard">Go to dashboard</a>
          <a className="ghost-link" href="/login">Login</a>
          <a className="ghost-link" href="/signup">Sign up</a>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          <div className="pill">Smart Fit Scoring with education + CV evidence</div>
          <div className="pill">Daily practice with deterministic skill updates</div>
          <div className="pill">Admin-only question management</div>
        </div>
      </div>
    </div>
  );
}
