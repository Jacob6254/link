// app/dashboard/stats/[slug]/page.js
// Statistiques détaillées d'un lien ou d'une page.
import StatsView from "../statsview";

export default async function LinkStatsPage({ params }) {
  const { slug } = await params;
  return <StatsView slug={slug} />;
}
