import { requireSection } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { SettingsClient } from "@/components/settings/SettingsClient";

export default async function SettingsPage() {
  const session = await requireSection("settings");
  const [business, categories, auditLogs] = await Promise.all([
    prisma.business.findUniqueOrThrow({ where: { id: session.user.businessId } }),
    prisma.category.findMany({ where: { businessId: session.user.businessId }, orderBy: { name: "asc" } }),
    prisma.auditLog.findMany({
      where: { businessId: session.user.businessId },
      include: { user: true, location: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);
  return <SettingsClient business={business} categories={categories} auditLogs={auditLogs} />;
}
