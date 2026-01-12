import { SiteHubPage } from "@/features/sites/components/SiteHubPage";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  return <SiteHubPage initialSites={[]} tags={[]} />;
}
