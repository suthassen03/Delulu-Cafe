import { requireSection } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { UsersClient } from "@/components/users/UsersClient";

export default async function UsersPage() {
  const session = await requireSection("users");
  const [users, locations] = await Promise.all([
    prisma.user.findMany({
      where: { businessId: session.user.businessId },
      include: { locations: { include: { location: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.location.findMany({ where: { businessId: session.user.businessId }, orderBy: { name: "asc" } }),
  ]);
  return <UsersClient users={users} locations={locations} />;
}
