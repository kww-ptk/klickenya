import { Suspense } from "react";
import ConfirmClient from "./ConfirmClient";

export const metadata = { title: "Confirming your tickets — Klickenya", robots: { index: false } };

export default function ConfirmPage() {
  return (
    <Suspense>
      <ConfirmClient />
    </Suspense>
  );
}
