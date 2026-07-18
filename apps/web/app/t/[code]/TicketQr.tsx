"use client";
import { QRCodeSVG } from "qrcode.react";

export default function TicketQr({ value }: { value: string }) {
  return <QRCodeSVG value={value} size={220} marginSize={2} />;
}
