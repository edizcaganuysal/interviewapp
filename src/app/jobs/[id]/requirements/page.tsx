export default function JobRequirementsPage({ params }: { params: { id: string } }) {
  return (
    <div style={{ padding: 16 }}>
      <h1>Job Requirements</h1>
      <p>Job ID: {params.id}</p>
      <p>Next step: CRUD requirements + Fit Score recompute.</p>
      <a href={`/jobs/${params.id}/overview`}>Back to Overview</a>
    </div>
  );
}
