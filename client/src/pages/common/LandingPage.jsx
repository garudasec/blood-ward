import Navbar from "../../components/Navbar";
import Hero from "../../components/Hero";
import ValueStrip from "../../components/ValueStrip";
import HowItWorks from "../../components/HowItWorks";
import DonorSection from "../../components/DonorSection";
import RecipientSection from "../../components/RecipientSection";
import LocationSection from "../../components/LocationSection";
import SecuritySection from "../../components/SecuritySection";
import FinalCTA from "../../components/FinalCTA";
import Footer from "../../components/Footer";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen" style={{ background: "#0d0d0f" }}>
      <Navbar />
      <main>
        <Hero />
        <ValueStrip />
        <HowItWorks />
        <DonorSection />
        <RecipientSection />
        <LocationSection />
        <SecuritySection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
