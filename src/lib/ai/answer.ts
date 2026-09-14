import { prisma } from "@/lib/prisma";
import { getIngredientMetrics } from "@/lib/services/metrics";
import { getPurchaseSuggestions } from "@/lib/services/purchasing";
import { getWasteAnalytics } from "@/lib/services/waste";
import { getProductsWithProfitability } from "@/lib/services/products";
import { getPriceHistory } from "@/lib/services/priceHistory";
import { formatLKR, formatQty } from "@/lib/format";

export interface AiContext {
  businessId: string;
  locationIds: string[];
  pricingLocationId: string;
}

const STOPWORDS = new Set(["fresh", "whole", "mixed", "dried", "raw", "the", "and", "of"]);

function findIngredientMention(question: string, names: string[]): string | null {
  const lower = question.toLowerCase();
  const questionWords = new Set(lower.split(/[^a-z]+/).filter(Boolean));

  let best: { name: string; score: number } | null = null;
  for (const name of names) {
    const nameLower = name.toLowerCase();
    // Full-name substring match (e.g. "coffee beans" mentioned verbatim) wins outright.
    if (lower.includes(nameLower)) {
      return name;
    }
    // Otherwise score by how many significant words of the ingredient name
    // appear as whole words in the question ("chicken" -> "Chicken Fillet").
    const nameWords = nameLower.split(/\s+/).filter((w) => w.length > 3 && !STOPWORDS.has(w));
    const matchedWords = nameWords.filter((w) => questionWords.has(w));
    if (matchedWords.length > 0) {
      const score = matchedWords.length / nameWords.length;
      if (!best || score > best.score || (score === best.score && name.length > best.name.length)) {
        best = { name, score };
      }
    }
  }
  return best?.name ?? null;
}

/**
 * Intent-matched answers, always grounded in real DB data via the same
 * service functions the dashboard/reports use. Never invents numbers: if
 * nothing matches, it says so instead of guessing (spec §24).
 */
export async function answerQuestion(question: string, ctx: AiContext): Promise<{ answer: string; data: unknown }> {
  const q = question.toLowerCase();
  const metrics = await getIngredientMetrics(ctx.businessId, ctx.locationIds);
  const mentionedIngredient = findIngredientMention(q, metrics.map((m) => m.name));

  // 1. Stock level of a specific ingredient
  if (mentionedIngredient && /(how much|left|stock|remaining|have)/.test(q)) {
    const m = metrics.find((x) => x.name === mentionedIngredient)!;
    const days = Number.isFinite(m.daysRemaining) ? `, roughly ${Math.round(m.daysRemaining)} day(s) of stock at current usage` : "";
    return {
      answer: `${m.name}: ${formatQty(m.currentStock, m.unit)} in stock (minimum ${formatQty(m.minLevel, m.unit)})${days}.`,
      data: m,
    };
  }

  // 2. Usage over a period for a specific ingredient
  if (mentionedIngredient && /(use|used|usage|consum)/.test(q)) {
    const m = metrics.find((x) => x.name === mentionedIngredient)!;
    return {
      answer: `${m.name} usage over the last 7 days averaged ${formatQty(m.recentUsage7d, m.unit)}/day (normal baseline: ${formatQty(m.baselineUsage28d, m.unit)}/day).`,
      data: m,
    };
  }

  // 3. Why has usage increased — consumption-increase framing
  if (mentionedIngredient && /(why|increase|more than usual|higher)/.test(q)) {
    const m = metrics.find((x) => x.name === mentionedIngredient)!;
    const pct = m.baselineUsage28d > 0 ? Math.round(((m.recentUsage7d - m.baselineUsage28d) / m.baselineUsage28d) * 100) : null;
    return {
      answer: pct !== null
        ? `${m.name} usage is ${pct >= 0 ? "up" : "down"} ${Math.abs(pct)}% versus its normal baseline (${formatQty(m.recentUsage7d, m.unit)}/day now vs ${formatQty(m.baselineUsage28d, m.unit)}/day normally). The system doesn't yet attribute causes automatically — check recent sales mix or waste records for this ingredient.`
        : `Not enough baseline data yet to say whether ${m.name} usage has changed.`,
      data: m,
    };
  }

  // 4. Purchase recommendations
  if (/(what should i (order|buy|purchase)|purchase recommend|what to (order|buy))/.test(q)) {
    const suggestions = await getPurchaseSuggestions(ctx.businessId, ctx.locationIds);
    if (suggestions.length === 0) return { answer: "Nothing urgently needs ordering right now — all ingredients are within a healthy range.", data: [] };
    const lines = suggestions.slice(0, 6).map((s) => `${s.name}: order ${formatQty(s.recommendedQty, s.unit)} (${s.reason})`);
    return { answer: `Recommended purchases:\n${lines.join("\n")}`, data: suggestions };
  }

  // 5. What's likely to run out
  if (/(run ?out|running out|out of stock)/.test(q)) {
    const soon = metrics.filter((m) => Number.isFinite(m.daysRemaining) && m.daysRemaining <= 3).sort((a, b) => a.daysRemaining - b.daysRemaining);
    if (soon.length === 0) return { answer: "Nothing is expected to run out within the next few days.", data: [] };
    const lines = soon.slice(0, 6).map((m) => `${m.name} — ~${Math.round(m.daysRemaining)} day(s) left`);
    return { answer: `Likely to run out soon:\n${lines.join("\n")}`, data: soon };
  }

  // 6. Waste cost
  if (/(waste|lost|lose|loss).*(money|cost|value)|how much.*(waste|lost)/.test(q)) {
    const analytics = await getWasteAnalytics(ctx.businessId, ctx.locationIds);
    return {
      answer: `Waste this month: ${formatLKR(analytics.monthCost)} (${analytics.wastePercentOfPurchases.toFixed(1)}% of purchases). This week: ${formatLKR(analytics.weekCost)}. Today: ${formatLKR(analytics.todayCost)}.${analytics.mostWastedIngredientName ? ` Most wasted ingredient: ${analytics.mostWastedIngredientName}.` : ""}`,
      data: analytics,
    };
  }

  // 7. Most profitable products
  if (/(most profitable|best product|top product|highest margin)/.test(q)) {
    const products = await getProductsWithProfitability(ctx.businessId, ctx.pricingLocationId);
    const top = [...products].sort((a, b) => b.grossProfit - a.grossProfit).slice(0, 5);
    const lines = top.map((p) => `${p.name}: ${formatLKR(p.grossProfit)} gross profit/unit (${p.foodCostPct.toFixed(1)}% food cost)`);
    return { answer: `Most profitable menu items:\n${lines.join("\n")}`, data: top };
  }

  // 8. Supplier price increases
  if (/(supplier|price).*(increase|rais|went up|more expensive)/.test(q)) {
    const definitions = await prisma.ingredientDefinition.findMany({ where: { businessId: ctx.businessId } });
    const increases: string[] = [];
    for (const def of definitions) {
      const history = await getPriceHistory(ctx.businessId, def.id);
      if (history.length >= 2) {
        const [prev, latest] = history.slice(-2);
        if (latest.avgUnitPrice > prev.avgUnitPrice) {
          const pct = Math.round(((latest.avgUnitPrice - prev.avgUnitPrice) / prev.avgUnitPrice) * 100);
          increases.push(`${def.name}: ${formatLKR(prev.avgUnitPrice)} → ${formatLKR(latest.avgUnitPrice)} (+${pct}%)`);
        }
      }
    }
    if (increases.length === 0) return { answer: "No recent supplier price increases found in purchase history.", data: [] };
    return { answer: `Recent price increases:\n${increases.join("\n")}`, data: increases };
  }

  // Fallback — never invent a number; say what it can answer instead.
  return {
    answer:
      "I can answer questions grounded in your real data — try asking about a specific ingredient's stock level or usage, what to purchase, what's about to run out, waste cost, your most profitable products, or supplier price increases.",
    data: null,
  };
}

/** Optionally rephrase a templated answer naturally via Claude, strictly from the given data. Falls back silently if no key is set or the call fails. */
export async function maybePhraseNaturally(question: string, templatedAnswer: string, data: unknown): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return templatedAnswer;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 300,
        system:
          "You are the AI assistant inside Delulu Cafe's inventory dashboard. Rephrase the given answer naturally and concisely for a busy restaurant owner. Use ONLY the facts in 'answer' and 'data' — never invent numbers, ingredients, or figures not present there. Keep it under 4 sentences.",
        messages: [
          { role: "user", content: `Question: ${question}\n\nAnswer (facts to use verbatim, just rephrase the wording): ${templatedAnswer}\n\nSupporting data: ${JSON.stringify(data).slice(0, 4000)}` },
        ],
      }),
    });
    if (!res.ok) return templatedAnswer;
    const json = await res.json();
    const text = json?.content?.[0]?.text;
    return typeof text === "string" && text.trim() ? text.trim() : templatedAnswer;
  } catch {
    return templatedAnswer;
  }
}
