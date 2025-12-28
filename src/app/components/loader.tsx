export function Loader({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="card" style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          border: "3px solid #0a66c2",
          borderTopColor: "transparent",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <span>{label}</span>
    </div>
  );
}
