import type { Prisma, PrismaClient } from "@prisma/client";
import type { TransactionType } from "@/lib/enums";

type Tx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export interface PostTransactionInput {
  businessId: string;
  locationId: string;
  ingredientId: string;
  type: TransactionType;
  /** Signed quantity, expressed in the ingredient's own stock unit (Ingredient.unit). */
  quantity: number;
  refType?: string;
  refId?: string;
  note?: string;
}

/**
 * The single write path for inventory movement. Every purchase receipt, sale
 * consumption, waste registration, stock-count reconciliation, and manual
 * adjustment goes through here: it appends an immutable ledger row AND moves
 * Ingredient.currentStock by the same delta, atomically. Never update
 * currentStock directly anywhere else.
 */
export async function postTransaction(tx: Tx, input: PostTransactionInput) {
  const { businessId, locationId, ingredientId, type, quantity, refType, refId, note } = input;

  const [transaction] = await Promise.all([
    tx.inventoryTransaction.create({
      data: { businessId, locationId, ingredientId, type, quantity, refType, refId, note },
    }),
    tx.ingredient.update({
      where: { id: ingredientId },
      data: { currentStock: { increment: quantity } },
    }),
  ]);

  return transaction;
}

export async function postTransactions(
  tx: Tx,
  inputs: PostTransactionInput[]
): Promise<Prisma.InventoryTransactionCreateManyInput[]> {
  const results = [];
  for (const input of inputs) {
    results.push(await postTransaction(tx, input));
  }
  return results;
}
