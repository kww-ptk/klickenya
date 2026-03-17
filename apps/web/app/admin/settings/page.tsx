export const revalidate = 0;

type ServiceStatus = {
  name: string;
  isConfigured: boolean;
  label: string;
};

export default function AdminSettingsPage() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "Not set";

  const services: ServiceStatus[] = [
    {
      name: "Resend",
      isConfigured: !!process.env.RESEND_API_KEY,
      label: process.env.RESEND_API_KEY ? "Connected" : "Not configured",
    },
    {
      name: "Supabase",
      isConfigured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      label: process.env.NEXT_PUBLIC_SUPABASE_URL
        ? "Connected"
        : "Not configured",
    },
    {
      name: "Sanity",
      isConfigured: !!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
      label: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
        ? "Connected"
        : "Not configured",
    },
    {
      name: "GHL Webhook",
      isConfigured: !!process.env.GHL_INBOUND_WEBHOOK_URL,
      label: process.env.GHL_INBOUND_WEBHOOK_URL
        ? "Connected"
        : "Not configured",
    },
  ];

  const ghlWebhookUrl = process.env.GHL_INBOUND_WEBHOOK_URL;
  const maskedGhlUrl = ghlWebhookUrl
    ? `${ghlWebhookUrl.slice(0, 20)}...`
    : null;

  return (
    <div className="space-y-8">
      {/* Page heading */}
      <h1 className="font-display text-[24px] font-bold text-[#16130C]">
        Settings
      </h1>

      {/* Admin Email */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="font-display text-[18px] font-bold text-[#16130C]">
          Admin Email
        </h2>
        <div className="mt-4 flex items-center gap-3">
          <span className="rounded-xl border border-[#E2DDD5] bg-[#F9F7F4] px-4 py-2.5 text-[14px] text-[#16130C]">
            {adminEmail}
          </span>
        </div>
        <p className="mt-2 text-[13px] text-[#9C9485]">
          Change in Vercel environment variables
        </p>
      </div>

      {/* Service Status */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="font-display text-[18px] font-bold text-[#16130C]">
          Service Status
        </h2>
        <div className="mt-4 space-y-3">
          {services.map((service) => (
            <div key={service.name} className="flex items-center gap-3">
              <span
                className={`size-2.5 shrink-0 rounded-full ${
                  service.isConfigured ? "bg-[#22C55E]" : "bg-[#DC2626]"
                }`}
                aria-hidden="true"
              />
              <span className="text-[14px] font-medium text-[#16130C]">
                {service.name}
              </span>
              <span
                className={`text-[13px] ${
                  service.isConfigured ? "text-[#22C55E]" : "text-[#DC2626]"
                }`}
              >
                {service.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* GHL Webhook URL */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="font-display text-[18px] font-bold text-[#16130C]">
          GHL Webhook URL
        </h2>
        <div className="mt-4">
          {maskedGhlUrl ? (
            <span className="rounded-xl border border-[#E2DDD5] bg-[#F9F7F4] px-4 py-2.5 text-[14px] font-mono text-[#16130C]">
              {maskedGhlUrl}
            </span>
          ) : (
            <span className="text-[14px] text-[#DC2626]">Not configured</span>
          )}
        </div>
        <p className="mt-2 text-[13px] text-[#9C9485]">
          Change in Vercel environment variables
        </p>
      </div>
    </div>
  );
}
