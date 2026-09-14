import { AiClient } from "@/components/ai/AiClient";

export default function AiPage() {
  const hasKey = !!process.env.ANTHROPIC_API_KEY;
  return <AiClient hasKey={hasKey} />;
}
