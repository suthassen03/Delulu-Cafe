"use server";

import { requireSection, resolveActiveLocationId, queryLocationIds } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { answerQuestion, maybePhraseNaturally } from "@/lib/ai/answer";
import { generateDailySummary } from "@/lib/ai/dailySummary";
import type { Role } from "@/lib/enums";

async function getContext() {
  const session = await requireSection("ai");
  const { activeLocationId, allLocations } = await resolveActiveLocationId(
    session.user.businessId, session.user.role as Role, session.user.locationIds
  );
  const locationIds = queryLocationIds(activeLocationId, allLocations);
  const pricingLocationId = activeLocationId === "ALL" ? allLocations[0]?.id : activeLocationId;
  return { session, locationIds, pricingLocationId };
}

export async function askAI(question: string) {
  const { session, locationIds, pricingLocationId } = await getContext();
  const { answer, data } = await answerQuestion(question, {
    businessId: session.user.businessId, locationIds, pricingLocationId,
  });
  const phrased = await maybePhraseNaturally(question, answer, data);
  return phrased;
}

export async function generateSummary() {
  const { session, locationIds } = await getContext();
  const business = await prisma.business.findUniqueOrThrow({ where: { id: session.user.businessId } });
  return generateDailySummary(session.user.businessId, locationIds, business.name);
}
