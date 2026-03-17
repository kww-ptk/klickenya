import { Nav } from "@/components/shared/Nav";
import { CategoryNav } from "@/components/listings/CategoryNav";
import { Footer } from "@/components/shared/Footer";

export default function ListingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Nav transparent={false} />
      <div className="pt-[68px]">
        <CategoryNav />
        <main className="min-h-[60vh]">{children}</main>
      </div>
      <Footer />
    </>
  );
}
