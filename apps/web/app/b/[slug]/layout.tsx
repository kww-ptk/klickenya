export default function BookingWidgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#FAFAF8]">
        {children}
      </body>
    </html>
  );
}
