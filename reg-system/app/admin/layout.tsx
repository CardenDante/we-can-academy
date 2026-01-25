import { AIChatWidget } from "@/components/ai-chat-widget";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <AIChatWidget />
    </>
  );
}
