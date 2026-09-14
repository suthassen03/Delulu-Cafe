// Loads .env manually so `tsx prisma/seed.ts` works regardless of how it's
// invoked (no extra dependency needed for a one-off script).
import { readFileSync } from "node:fs";
import path from "node:path";
try {
  const content = readFileSync(path.resolve(__dirname, "../.env"), "utf8");
  for (const line of content.split("\n")) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (m && !(m[1] in process.env)) {
      process.env[m[1]] = (m[2] || "").trim().replace(/^['"]|['"]$/g, "");
    }
  }
} catch {
  /* no .env file — assume env is already set */
}

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// --- deterministic PRNG so re-seeding gives a consistent demo dataset ------
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260914);
const randInt = (min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min;
const randFloat = (min: number, max: number) => min + rng() * (max - min);
const choice = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
const daysAgo = (n: number, hour = 10, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d;
};

async function main() {
  console.log("Seeding Delulu Cafe demo data…");

  // -------------------------------------------------------------- tenancy --
  const business = await prisma.business.create({
    data: { name: "Delulu Cafe", country: "Sri Lanka", currency: "LKR" },
  });

  // Created sequentially (not Promise.all) so createdAt ordering is
  // deterministic — the app defaults a user's active location to the
  // earliest-created one they can access, and Colombo must win that.
  const colombo = await prisma.location.create({ data: { businessId: business.id, name: "Colombo", address: "24 Galle Road, Colombo 03" } });
  const kandy = await prisma.location.create({ data: { businessId: business.id, name: "Kandy", address: "12 Peradeniya Road, Kandy" } });
  const jaffna = await prisma.location.create({ data: { businessId: business.id, name: "Jaffna", address: "5 Hospital Road, Jaffna" } });

  const passwordHash = await bcrypt.hash("password123", 10);
  const owner = await prisma.user.create({
    data: {
      businessId: business.id, name: "Anusha Perera", email: "owner@delulucafe.lk",
      passwordHash, role: "OWNER",
      locations: { create: [colombo, kandy, jaffna].map((l) => ({ locationId: l.id })) },
    },
  });
  const manager = await prisma.user.create({
    data: {
      businessId: business.id, name: "Kasun Fernando", email: "manager@delulucafe.lk",
      passwordHash, role: "MANAGER", locations: { create: [{ locationId: colombo.id }] },
    },
  });
  const employee = await prisma.user.create({
    data: {
      businessId: business.id, name: "Nadeesha Silva", email: "employee@delulucafe.lk",
      passwordHash, role: "EMPLOYEE", locations: { create: [{ locationId: colombo.id }] },
    },
  });
  await prisma.user.create({
    data: {
      businessId: business.id, name: "Ruwan Jayasuriya", email: "manager.kandy@delulucafe.lk",
      passwordHash, role: "MANAGER", locations: { create: [{ locationId: kandy.id }] },
    },
  });
  await prisma.user.create({
    data: {
      businessId: business.id, name: "Priya Kumaran", email: "manager.jaffna@delulucafe.lk",
      passwordHash, role: "MANAGER", locations: { create: [{ locationId: jaffna.id }] },
    },
  });

  // ------------------------------------------------------------ categories --
  const categoryNames = [
    "Coffee", "Milk & Dairy", "Meat", "Vegetables", "Fruit", "Rice", "Flour",
    "Spices", "Sauces", "Beverages", "Packaging", "Cleaning products", "Other",
  ];
  const categories: Record<string, { id: string }> = {};
  for (const name of categoryNames) {
    categories[name] = await prisma.category.create({ data: { businessId: business.id, name } });
  }

  // ------------------------------------------------------------- suppliers --
  const supplierData = [
    { name: "Ceylon Coffee Traders", contactPerson: "Malik Rahman", phone: "+94 77 210 4455", email: "sales@ceyloncoffee.lk", leadTimeDays: 4 },
    { name: "Fresh Dairy Lanka", contactPerson: "Chamari Wickrama", phone: "+94 71 334 9021", email: "orders@freshdairy.lk", leadTimeDays: 2 },
    { name: "Colombo Meat Co", contactPerson: "Suresh Nadarajah", phone: "+94 76 552 8890", email: "supply@colombomeat.lk", leadTimeDays: 2 },
    { name: "Green Valley Produce", contactPerson: "Ishara Gunasekara", phone: "+94 70 118 4432", email: "hello@greenvalley.lk", leadTimeDays: 1 },
    { name: "Spice Isle Wholesale", contactPerson: "Farah Hameed", phone: "+94 75 998 1123", email: "wholesale@spiceisle.lk", leadTimeDays: 5 },
    { name: "Metro Packaging", contactPerson: "Dinusha Rathnayake", phone: "+94 72 664 3301", email: "orders@metropack.lk", leadTimeDays: 6 },
  ];
  const suppliers: Record<string, { id: string; leadTimeDays: number }> = {};
  for (const s of supplierData) {
    suppliers[s.name] = await prisma.supplier.create({ data: { businessId: business.id, ...s } });
  }

  // ------------------------------------------------- ingredient definitions --
  type DefSeed = { name: string; unit: string; category: string; supplier: string; packSize?: number; baseCost: number };
  const defs: DefSeed[] = [
    { name: "Coffee Beans", unit: "KG", category: "Coffee", supplier: "Ceylon Coffee Traders", baseCost: 4500 },
    { name: "Whole Milk", unit: "L", category: "Milk & Dairy", supplier: "Fresh Dairy Lanka", baseCost: 280 },
    { name: "Oat Milk", unit: "L", category: "Milk & Dairy", supplier: "Fresh Dairy Lanka", baseCost: 620 },
    { name: "Fresh Cream", unit: "L", category: "Milk & Dairy", supplier: "Fresh Dairy Lanka", baseCost: 950 },
    { name: "Mozzarella Cheese", unit: "KG", category: "Milk & Dairy", supplier: "Fresh Dairy Lanka", baseCost: 1850 },
    { name: "Chicken Fillet", unit: "KG", category: "Meat", supplier: "Colombo Meat Co", baseCost: 1550 },
    { name: "Tomatoes", unit: "KG", category: "Vegetables", supplier: "Green Valley Produce", baseCost: 320 },
    { name: "Onions", unit: "KG", category: "Vegetables", supplier: "Green Valley Produce", baseCost: 260 },
    { name: "Lettuce", unit: "KG", category: "Vegetables", supplier: "Green Valley Produce", baseCost: 380 },
    { name: "Flour", unit: "KG", category: "Flour", supplier: "Spice Isle Wholesale", baseCost: 240 },
    { name: "Rice", unit: "KG", category: "Rice", supplier: "Spice Isle Wholesale", baseCost: 300 },
    { name: "Tikka Sauce", unit: "L", category: "Sauces", supplier: "Spice Isle Wholesale", baseCost: 890 },
    { name: "Mixed Spices", unit: "KG", category: "Spices", supplier: "Spice Isle Wholesale", baseCost: 2200 },
    { name: "Sugar", unit: "KG", category: "Other", supplier: "Spice Isle Wholesale", baseCost: 260 },
    { name: "Cola Syrup", unit: "L", category: "Beverages", supplier: "Spice Isle Wholesale", baseCost: 1100 },
    { name: "Disposable Cups", unit: "PACK", category: "Packaging", supplier: "Metro Packaging", packSize: 50, baseCost: 950 },
    { name: "Paper Napkins", unit: "PACK", category: "Packaging", supplier: "Metro Packaging", packSize: 100, baseCost: 480 },
    { name: "Dish Soap", unit: "L", category: "Cleaning products", supplier: "Metro Packaging", baseCost: 620 },
  ];
  const definitions: Record<string, { id: string; unit: string; packSize?: number | null }> = {};
  for (const d of defs) {
    definitions[d.name] = await prisma.ingredientDefinition.create({
      data: {
        businessId: business.id, name: d.name, unit: d.unit, packSize: d.packSize ?? null,
        categoryId: categories[d.category].id,
      },
    });
  }

  // Stock levels per location: Colombo is the flagship (larger, deeper history),
  // Kandy/Jaffna are smaller and lighter on history.
  const stockPlan: Record<string, { colombo: [number, number]; kandy: [number, number]; jaffna: [number, number] }> = {
    "Coffee Beans": { colombo: [4.2, 2], kandy: [1.8, 1], jaffna: [1.5, 1] },
    "Whole Milk": { colombo: [6, 10], kandy: [3, 5], jaffna: [2.5, 5] },
    "Oat Milk": { colombo: [8, 5], kandy: [2, 3], jaffna: [1, 2] },
    "Fresh Cream": { colombo: [3.2, 2], kandy: [1.2, 1], jaffna: [1, 1] },
    "Mozzarella Cheese": { colombo: [6.5, 4], kandy: [2.5, 2], jaffna: [2, 2] },
    "Chicken Fillet": { colombo: [4.8, 5], kandy: [2.2, 3], jaffna: [1.8, 3] },
    "Tomatoes": { colombo: [12, 5], kandy: [5, 3], jaffna: [4, 3] },
    "Onions": { colombo: [9, 4], kandy: [4, 2], jaffna: [3.5, 2] },
    "Lettuce": { colombo: [3.5, 2], kandy: [1.5, 1], jaffna: [1, 1] },
    "Flour": { colombo: [18, 10], kandy: [8, 6], jaffna: [6, 6] },
    "Rice": { colombo: [22, 10], kandy: [10, 6], jaffna: [9, 6] },
    "Tikka Sauce": { colombo: [4, 2], kandy: [1.5, 1], jaffna: [1.2, 1] },
    "Mixed Spices": { colombo: [3, 1.5], kandy: [1.2, 1], jaffna: [1, 1] },
    "Sugar": { colombo: [10, 5], kandy: [5, 3], jaffna: [4, 3] },
    "Cola Syrup": { colombo: [5, 3], kandy: [2, 1.5], jaffna: [1.5, 1.5] },
    "Disposable Cups": { colombo: [14, 8], kandy: [6, 4], jaffna: [5, 4] }, // in packs of 50
    "Paper Napkins": { colombo: [9, 5], kandy: [4, 3], jaffna: [3, 3] },
    "Dish Soap": { colombo: [6, 3], kandy: [3, 2], jaffna: [2.5, 2] },
  };

  const stock: Record<string, Record<string, { id: string; costPerUnit: number; openingQty: number }>> = {
    [colombo.id]: {}, [kandy.id]: {}, [jaffna.id]: {},
  };
  for (const [name, plan] of Object.entries(stockPlan)) {
    const def = definitions[name];
    const supplierName = defs.find((d) => d.name === name)!.supplier;
    const baseCost = defs.find((d) => d.name === name)!.baseCost;
    for (const [loc, key] of [[colombo, "colombo"], [kandy, "kandy"], [jaffna, "jaffna"]] as const) {
      const [current, min] = plan[key];
      const row = await prisma.ingredient.create({
        data: {
          businessId: business.id, locationId: loc.id, definitionId: def.id,
          currentStock: 0, minLevel: min, costPerUnit: baseCost,
          supplierId: suppliers[supplierName].id,
        },
      });
      stock[loc.id][name] = { id: row.id, costPerUnit: baseCost, openingQty: current };
    }
  }

  // --------------------------------------------------------------- products --
  type RecipeLineSeed = { def: string; qty: number; unit: string };
  type ProductSeed = { name: string; price: number; prepWastePct: number; recipe: RecipeLineSeed[] };
  const products: ProductSeed[] = [
    { name: "Cappuccino", price: 650, prepWastePct: 0, recipe: [{ def: "Coffee Beans", qty: 18, unit: "G" }, { def: "Whole Milk", qty: 250, unit: "ML" }] },
    { name: "Latte", price: 620, prepWastePct: 0, recipe: [{ def: "Coffee Beans", qty: 16, unit: "G" }, { def: "Whole Milk", qty: 280, unit: "ML" }] },
    { name: "Oat Milk Latte", price: 690, prepWastePct: 0, recipe: [{ def: "Coffee Beans", qty: 16, unit: "G" }, { def: "Oat Milk", qty: 280, unit: "ML" }] },
    { name: "Espresso", price: 450, prepWastePct: 0, recipe: [{ def: "Coffee Beans", qty: 9, unit: "G" }] },
    { name: "Chicken Tikka", price: 1450, prepWastePct: 8, recipe: [
      { def: "Chicken Fillet", qty: 200, unit: "G" }, { def: "Tikka Sauce", qty: 50, unit: "ML" },
      { def: "Fresh Cream", qty: 30, unit: "ML" }, { def: "Mixed Spices", qty: 8, unit: "G" },
    ] },
    { name: "Margherita Pizza", price: 1650, prepWastePct: 6, recipe: [
      { def: "Flour", qty: 220, unit: "G" }, { def: "Mozzarella Cheese", qty: 150, unit: "G" },
      { def: "Tomatoes", qty: 120, unit: "G" }, { def: "Mixed Spices", qty: 5, unit: "G" },
    ] },
    { name: "Chicken Fried Rice", price: 1250, prepWastePct: 5, recipe: [
      { def: "Rice", qty: 250, unit: "G" }, { def: "Chicken Fillet", qty: 120, unit: "G" },
      { def: "Onions", qty: 40, unit: "G" }, { def: "Mixed Spices", qty: 6, unit: "G" },
    ] },
    { name: "Garden Salad", price: 590, prepWastePct: 4, recipe: [
      { def: "Lettuce", qty: 100, unit: "G" }, { def: "Tomatoes", qty: 80, unit: "G" }, { def: "Onions", qty: 20, unit: "G" },
    ] },
    { name: "Iced Cola", price: 350, prepWastePct: 0, recipe: [
      { def: "Cola Syrup", qty: 60, unit: "ML" }, { def: "Disposable Cups", qty: 1, unit: "PCS" },
    ] },
  ];
  const productRows: Record<string, { id: string; price: number; prepWastePct: number }> = {};
  for (const p of products) {
    const row = await prisma.product.create({
      data: {
        businessId: business.id, name: p.name, price: p.price, prepWastePct: p.prepWastePct,
        recipe: { create: p.recipe.map((line) => ({ definitionId: definitions[line.def].id, quantity: line.qty, unit: line.unit })) },
      },
    });
    productRows[p.name] = { id: row.id, price: p.price, prepWastePct: p.prepWastePct };
  }

  // ------------------------------------------------- unit conversion helper --
  // (kept local + minimal — src/lib/inventory/units.ts is the real one, used
  // by the app; duplicating just the arithmetic here keeps the seed script
  // dependency-free of the Next.js path aliasing.)
  const TO_G_OR_ML: Record<string, number> = { G: 1, KG: 1000, ML: 1, L: 1000, PCS: 1 };
  function convertQty(qty: number, from: string, to: string, packSize?: number | null): number {
    if (from === to) return qty;
    if (from === "PCS" && to === "PACK") return qty / (packSize || 1);
    if (from === "PACK" && to === "PCS") return qty * (packSize || 1);
    return (qty * TO_G_OR_ML[from]) / TO_G_OR_ML[to];
  }

  async function postTx(input: { locationId: string; ingredientId: string; type: string; quantity: number; refType?: string; refId?: string; note?: string }) {
    await prisma.inventoryTransaction.create({
      data: { businessId: business.id, locationId: input.locationId, ingredientId: input.ingredientId, type: input.type, quantity: input.quantity, refType: input.refType, refId: input.refId, note: input.note },
    });
    await prisma.ingredient.update({ where: { id: input.ingredientId }, data: { currentStock: { increment: input.quantity } } });
  }

  // -------------------------------------------------- opening stock (day 35) --
  for (const [loc] of [[colombo], [kandy], [jaffna]] as const) {
    const purchase = await prisma.purchase.create({
      data: {
        businessId: business.id, locationId: loc.id, supplierId: suppliers["Ceylon Coffee Traders"].id,
        status: "RECEIVED", invoiceRef: `OPEN-${loc.name.toUpperCase()}`,
        orderDate: daysAgo(35), receivedAt: daysAgo(35),
      },
    });
    for (const name of Object.keys(stockPlan)) {
      const row = stock[loc.id][name];
      await prisma.purchaseItem.create({ data: { purchaseId: purchase.id, ingredientId: row.id, quantity: row.openingQty, unit: definitions[name].unit as string, unitPrice: row.costPerUnit } });
      await postTx({ locationId: loc.id, ingredientId: row.id, type: "PURCHASE", quantity: row.openingQty, refType: "Purchase", refId: purchase.id, note: "Opening stock" });
    }
  }

  // ------------------------------------------- Colombo: 30 days of activity --
  const colomboProducts = products.map((p) => p.name);
  const coffeeWeeklyPrice = [4200, 4300, 4400, 4500]; // spec §19 price-creep example

  for (let dayOffset = 30; dayOffset >= 1; dayOffset--) {
    const date = daysAgo(dayOffset, randInt(8, 21), randInt(0, 59));
    const weekIndex = Math.min(3, Math.floor((30 - dayOffset) / 7));

    // Weekly replenishment purchase (coffee, dairy, produce, chicken) every 7 days
    if (dayOffset % 7 === 0) {
      const supplierRestock: { name: string; qty: number; supplier: string }[] = [
        { name: "Coffee Beans", qty: 10, supplier: "Ceylon Coffee Traders" },
        { name: "Whole Milk", qty: 20, supplier: "Fresh Dairy Lanka" },
        { name: "Oat Milk", qty: 10, supplier: "Fresh Dairy Lanka" },
        { name: "Chicken Fillet", qty: 15, supplier: "Colombo Meat Co" },
        { name: "Tomatoes", qty: 20, supplier: "Green Valley Produce" },
        { name: "Flour", qty: 25, supplier: "Spice Isle Wholesale" },
      ];
      for (const item of supplierRestock) {
        const unitPrice = item.name === "Coffee Beans" ? coffeeWeeklyPrice[weekIndex] : stock[colombo.id][item.name].costPerUnit;
        const purchase = await prisma.purchase.create({
          data: {
            businessId: business.id, locationId: colombo.id, supplierId: suppliers[item.supplier].id,
            status: "RECEIVED", invoiceRef: `INV-CMB-${dayOffset}-${item.name.slice(0, 3).toUpperCase()}`,
            orderDate: date, deliveryDate: date, receivedAt: date,
          },
        });
        const row = stock[colombo.id][item.name];
        await prisma.purchaseItem.create({ data: { purchaseId: purchase.id, ingredientId: row.id, quantity: item.qty, unit: definitions[item.name].unit as string, unitPrice } });
        await postTx({ locationId: colombo.id, ingredientId: row.id, type: "PURCHASE", quantity: item.qty, refType: "Purchase", refId: purchase.id, note: `Received from ${item.supplier}` });
        if (item.name === "Coffee Beans") {
          await prisma.ingredient.update({ where: { id: row.id }, data: { costPerUnit: unitPrice } });
        }
      }
    }

    // Daily sales — a handful of transactions, weekends busier
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const saleCount = isWeekend ? randInt(10, 16) : randInt(6, 11);
    for (let i = 0; i < saleCount; i++) {
      const lineCount = randInt(1, 3);
      const lines: { productName: string; qty: number }[] = [];
      for (let j = 0; j < lineCount; j++) {
        lines.push({ productName: choice(colomboProducts), qty: randInt(1, 2) });
      }
      const total = lines.reduce((sum, l) => sum + productRows[l.productName].price * l.qty, 0);
      const sale = await prisma.sale.create({
        data: { businessId: business.id, locationId: colombo.id, source: "MANUAL", total, createdAt: date },
      });
      for (const line of lines) {
        const product = productRows[line.productName];
        await prisma.saleItem.create({ data: { saleId: sale.id, productId: product.id, quantity: line.qty, unitPrice: product.price } });

        const recipeLines = products.find((p) => p.name === line.productName)!.recipe;
        const wasteFactor = 1 + product.prepWastePct / 100;
        for (const rl of recipeLines) {
          const def = definitions[rl.def];
          const rawQty = rl.qty * line.qty * wasteFactor;
          const qtyInDefUnit = convertQty(rawQty, rl.unit, def.unit as string, def.packSize);
          const row = stock[colombo.id][rl.def];
          await postTx({ locationId: colombo.id, ingredientId: row.id, type: "SALE_CONSUMPTION", quantity: -qtyInDefUnit, refType: "Sale", refId: sale.id });
        }
      }
    }

    // Occasional waste (roughly every 2-3 days)
    if (dayOffset % randInt(2, 3) === 0) {
      const wasteIngredient = choice(["Whole Milk", "Chicken Fillet", "Tomatoes", "Lettuce", "Mozzarella Cheese"]);
      const reason = choice(["EXPIRED", "SPOILED", "DROPPED", "OVERPRODUCTION", "PREPARATION_WASTE", "DAMAGED"]);
      const qty = randFloat(0.2, 1.1);
      const row = stock[colombo.id][wasteIngredient];
      const waste = await prisma.wasteRecord.create({
        data: {
          businessId: business.id, locationId: colombo.id, ingredientId: row.id,
          quantity: qty, unit: definitions[wasteIngredient].unit as string, reason,
          employeeId: employee.id, createdAt: date,
          notes: reason === "EXPIRED" ? "Found past use-by date during prep check." : undefined,
        },
      });
      await postTx({ locationId: colombo.id, ingredientId: row.id, type: "WASTE", quantity: -qty, refType: "WasteRecord", refId: waste.id });
    }
  }

  // A deliberate recent spike: Chicken usage + waste jump in the last 3 days,
  // and coffee run low — gives the alerts/AI assistant real signal to surface.
  for (let dayOffset = 3; dayOffset >= 0; dayOffset--) {
    const date = daysAgo(dayOffset, 13, 0);
    for (let i = 0; i < 4; i++) {
      const sale = await prisma.sale.create({
        data: { businessId: business.id, locationId: colombo.id, source: "MANUAL", total: productRows["Chicken Tikka"].price * 2, createdAt: date },
      });
      await prisma.saleItem.create({ data: { saleId: sale.id, productId: productRows["Chicken Tikka"].id, quantity: 2, unitPrice: productRows["Chicken Tikka"].price } });
      const row = stock[colombo.id]["Chicken Fillet"];
      await postTx({ locationId: colombo.id, ingredientId: row.id, type: "SALE_CONSUMPTION", quantity: -(0.2 * 2 * 1.08), refType: "Sale", refId: sale.id });
    }
    const wasteRow = stock[colombo.id]["Chicken Fillet"];
    const waste = await prisma.wasteRecord.create({
      data: { businessId: business.id, locationId: colombo.id, ingredientId: wasteRow.id, quantity: 0.9, unit: "KG", reason: "SPOILED", employeeId: employee.id, createdAt: date, notes: "Delivery ran warm — batch discarded." },
    });
    await postTx({ locationId: colombo.id, ingredientId: wasteRow.id, type: "WASTE", quantity: -0.9, refType: "WasteRecord", refId: waste.id });
  }

  // ---------------------------------------------------- Kandy & Jaffna: light --
  for (const loc of [kandy, jaffna]) {
    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      const date = daysAgo(dayOffset, randInt(9, 20));
      const saleCount = randInt(3, 6);
      for (let i = 0; i < saleCount; i++) {
        const productName = choice(colomboProducts);
        const qty = randInt(1, 2);
        const product = productRows[productName];
        const sale = await prisma.sale.create({ data: { businessId: business.id, locationId: loc.id, source: "MANUAL", total: product.price * qty, createdAt: date } });
        await prisma.saleItem.create({ data: { saleId: sale.id, productId: product.id, quantity: qty, unitPrice: product.price } });
        const wasteFactor = 1 + product.prepWastePct / 100;
        for (const rl of products.find((p) => p.name === productName)!.recipe) {
          const def = definitions[rl.def];
          const qtyInDefUnit = convertQty(rl.qty * qty * wasteFactor, rl.unit, def.unit as string, def.packSize);
          const row = stock[loc.id][rl.def];
          await postTx({ locationId: loc.id, ingredientId: row.id, type: "SALE_CONSUMPTION", quantity: -qtyInDefUnit, refType: "Sale", refId: sale.id });
        }
      }
    }
  }

  // --------------------------------------------------------- a stock count --
  const countTargets = ["Coffee Beans", "Chicken Fillet", "Whole Milk"];
  const stockCount = await prisma.stockCount.create({
    data: { businessId: business.id, locationId: colombo.id, performedById: employee.id, status: "COMPLETED", createdAt: daysAgo(2, 18), completedAt: daysAgo(2, 18, 30) },
  });
  for (const name of countTargets) {
    const row = stock[colombo.id][name];
    const current = await prisma.ingredient.findUniqueOrThrow({ where: { id: row.id } });
    const variance = randFloat(-0.15, 0.05) * current.currentStock;
    const actual = Math.max(0, Math.round((current.currentStock + variance) * 100) / 100);
    await prisma.stockCountItem.create({
      data: { stockCountId: stockCount.id, ingredientId: row.id, expectedQty: current.currentStock, actualQty: actual, unit: definitions[name].unit as string },
    });
    const diff = actual - current.currentStock;
    if (Math.abs(diff) > 0.001) {
      await postTx({ locationId: colombo.id, ingredientId: row.id, type: "STOCK_COUNT", quantity: diff, refType: "StockCount", refId: stockCount.id, note: "Reconciled to physical count" });
    }
  }

  // --------------------------------------- calibrate to the spec's worked --
  // example inventory table (§5) for the showcase ingredients at Colombo,
  // and clamp any other balance the random simulation pushed negative.
  // (Forecast/alert usage math only counts SALE_CONSUMPTION/WASTE ledger
  // rows, so these one-off STOCK_ADJUSTMENT corrections don't distort it.)
  const targetColombo: Record<string, number> = {
    "Coffee Beans": 1.2, "Whole Milk": 6, "Oat Milk": 8, "Chicken Fillet": 4.8, "Tomatoes": 12, "Flour": 18,
  };
  for (const [name, target] of Object.entries(targetColombo)) {
    const row = stock[colombo.id][name];
    const current = await prisma.ingredient.findUniqueOrThrow({ where: { id: row.id } });
    const delta = Math.round((target - current.currentStock) * 10000) / 10000;
    if (Math.abs(delta) > 0.0001) {
      await postTx({ locationId: colombo.id, ingredientId: row.id, type: "STOCK_ADJUSTMENT", quantity: delta, note: "Calibrated to published demo figures" });
    }
  }
  const negativeBalances = await prisma.ingredient.findMany({ where: { currentStock: { lt: 0 } } });
  for (const ing of negativeBalances) {
    const healthy = Math.round(Math.max(ing.minLevel * 1.3, 0.5) * 100) / 100;
    const delta = Math.round((healthy - ing.currentStock) * 10000) / 10000;
    await postTx({ locationId: ing.locationId, ingredientId: ing.id, type: "STOCK_ADJUSTMENT", quantity: delta, note: "Corrected negative balance from simulated demo history" });
  }

  // ------------------------------------------------------------ audit log --
  await prisma.auditLog.create({
    data: {
      businessId: business.id, locationId: colombo.id, userId: owner.id, action: "SEED",
      entityType: "Business", entityId: business.id, newValue: JSON.stringify({ note: "Demo data seeded" }),
    },
  });

  console.log("Seed complete.");
  console.log("Login as:");
  console.log("  owner@delulucafe.lk / password123 (Owner — all locations)");
  console.log("  manager@delulucafe.lk / password123 (Manager — Colombo)");
  console.log("  employee@delulucafe.lk / password123 (Employee — Colombo)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
