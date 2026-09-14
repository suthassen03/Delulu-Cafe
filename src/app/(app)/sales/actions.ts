"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSection } from "@/lib/session";
import { postTransaction } from "@/lib/inventory/ledger";
import { explodeRecipe } from "@/lib/inventory/recipe";
import type { UnitCode } from "@/lib/enums";

const recordSaleSchema = z.object({
  locationId: z.string().min(1),
  lines: z.array(z.object({ productId: z.string().min(1), quantity: z.coerce.number().int().positive() })).min(1),
});

export async function recordSale(formData: FormData) {
  const session = await requireSection("sales");
  const parsed = recordSaleSchema.parse({
    locationId: formData.get("locationId"),
    lines: JSON.parse(String(formData.get("lines"))),
  });

  const productIds = parsed.lines.map((l) => l.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, businessId: session.user.businessId },
    include: { recipe: { include: { definition: true } } },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const total = parsed.lines.reduce((sum, l) => sum + (productMap.get(l.productId)?.price ?? 0) * l.quantity, 0);

  await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: { businessId: session.user.businessId, locationId: parsed.locationId, source: "MANUAL", total },
    });

    for (const line of parsed.lines) {
      const product = productMap.get(line.productId);
      if (!product) continue;
      await tx.saleItem.create({
        data: { saleId: sale.id, productId: product.id, quantity: line.quantity, unitPrice: product.price },
      });

      const recipeLines = product.recipe.map((r) => ({
        ingredientId: r.definitionId,
        quantity: r.quantity,
        unit: r.unit as UnitCode,
        ingredientUnit: r.definition.unit as UnitCode,
        ingredientPackSize: r.definition.packSize,
      }));
      const consumption = explodeRecipe(recipeLines, line.quantity, product.prepWastePct);

      for (const c of consumption) {
        const stockRow = await tx.ingredient.findUnique({
          where: { locationId_definitionId: { locationId: parsed.locationId, definitionId: c.ingredientId } },
        });
        if (!stockRow) continue; // this location doesn't stock that ingredient — nothing to deduct
        await postTransaction(tx, {
          businessId: session.user.businessId, locationId: parsed.locationId, ingredientId: stockRow.id,
          type: "SALE_CONSUMPTION", quantity: -c.quantity, refType: "Sale", refId: sale.id,
        });
      }
    }
  });

  revalidatePath("/sales");
  revalidatePath("/dashboard");
  revalidatePath("/inventory");
}
