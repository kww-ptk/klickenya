import { Metadata } from "next";
import ListingForm from "@/components/list/ListingForm";

export const metadata: Metadata = {
  title: "List Your Business | Klickenya",
  description:
    "Add your business to Klickenya — Kenya's fastest-growing marketplace. Takes less than 5 minutes.",
};

export default function ListPage() {
  return (
    <main className="min-h-screen bg-canvas">
      {/* Hero */}
      <div className="bg-white border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
          <p className="text-sm font-semibold text-amber uppercase tracking-widest mb-2">
            List your business
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-dark leading-tight mb-3">
            Reach thousands of visitors across Kenya
          </h1>
          <p className="text-base text-text2 max-w-xl">
            Add your stay, restaurant, experience, event, or service to Klickenya.
            Our team reviews every submission to keep the marketplace high quality.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 py-10">
        <ListingForm />
      </div>
    </main>
  );
}
