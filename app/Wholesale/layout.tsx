import Header from "@/Components/header";
import Footer from "@/Components/footer";
import AuthGate from "@/Components/AuthGate";

export default function WholesaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate>
      <div className="flex flex-col min-h-screen">
        {/* The Header is sticky via the 'sticky top-0' class inside the component */}
        <Header />

        {/* Main content area expands to fill space so footer stays at bottom */}
        <main className="flex-grow bg-[#f8fafc]">
          {children}
        </main>

        <Footer />
      </div>
    </AuthGate>
  );
}