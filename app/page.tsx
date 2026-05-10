import { SiteHeader } from "@/components/rights/SiteHeader";
import { HeroSection } from "@/components/rights/HeroSection";
import { EmergencySection } from "@/components/rights/EmergencySection";
import { RightsCardsSection } from "@/components/rights/RightsCardsSection";
import { SearchSection } from "@/components/rights/SearchSection";
import { LocationSection } from "@/components/rights/LocationSection";
import { CivicPowerSection } from "@/components/rights/CivicPowerSection";
import { VideoSection } from "@/components/rights/VideoSection";
import { DownloadsSection } from "@/components/rights/DownloadsSection";
import { MembershipSection } from "@/components/rights/MembershipSection";
import { SiteFooter } from "@/components/rights/SiteFooter";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#1a1b1e]">
      <SiteHeader />
      <HeroSection />
      <EmergencySection />
      <RightsCardsSection />
      <SearchSection />
      <LocationSection />
      <CivicPowerSection />
      <VideoSection />
      <DownloadsSection />
      <MembershipSection />
      <SiteFooter />
    </div>
  );
}
