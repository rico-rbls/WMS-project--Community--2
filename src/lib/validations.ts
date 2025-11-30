import { z } from "zod";

// Login validation schema
export const loginSchema = z.object({
  email: z.string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z.string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Inventory validation schema
export const inventoryItemSchema = z.object({
  name: z.string()
    .min(1, "Item name is required")
    .min(3, "Item name must be at least 3 characters")
    .max(100, "Item name must be less than 100 characters"),
  category: z.enum(["Electronics", "Furniture", "Clothing", "Food"], {
    errorMap: () => ({ message: "Please select a valid category" }),
  }),
  quantity: z.number()
    .int("Quantity must be a whole number")
    .min(0, "Quantity cannot be negative"),
  location: z.string()
    .min(1, "Location is required")
    .regex(/^[A-Z]-\d+$/, "Location must be in format A-12 (Letter-Number)"),
  reorderLevel: z.number()
    .int("Reorder level must be a whole number")
    .min(0, "Reorder level cannot be negative")
    .max(10000, "Reorder level seems too high"),
  // New fields
  brand: z.string()
    .min(1, "Brand is required")
    .min(2, "Brand must be at least 2 characters")
    .max(100, "Brand must be less than 100 characters"),
  pricePerPiece: z.number()
    .positive("Price per piece must be a positive number")
    .max(1000000, "Price per piece seems too high"),
  supplierId: z.string()
    .min(1, "Supplier is required")
    .regex(/^SUP-\d+$/, "Supplier ID must be in format SUP-001"),
  maintainStockAt: z.number()
    .int("Maintain stock at must be a whole number")
    .min(0, "Maintain stock at cannot be negative")
    .max(100000, "Maintain stock at seems too high"),
  minimumStock: z.number()
    .int("Minimum stock must be a whole number")
    .min(0, "Minimum stock cannot be negative")
    .max(100000, "Minimum stock seems too high"),
}).refine(
  (data) => data.maintainStockAt >= data.minimumStock,
  {
    message: "Maintain stock at must be greater than or equal to minimum stock",
    path: ["maintainStockAt"],
  }
);

export type InventoryItemInput = z.infer<typeof inventoryItemSchema>;

// Purchase Order validation schema
export const poLineItemSchema = z.object({
  inventoryItemId: z.string().min(1, "Item is required"),
  itemName: z.string().min(1, "Item name is required"),
  quantity: z.number().int("Quantity must be a whole number").min(1, "Quantity must be at least 1"),
  unitPrice: z.number().positive("Unit price must be positive"),
  totalPrice: z.number().positive("Total price must be positive"),
});

export const purchaseOrderSchema = z.object({
  supplierId: z.string()
    .min(1, "Supplier is required")
    .regex(/^SUP-\d+$/, "Invalid supplier ID format"),
  supplierName: z.string().min(1, "Supplier name is required"),
  items: z.array(poLineItemSchema).min(1, "At least one item is required"),
  expectedDeliveryDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .refine((date) => {
      const expectedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return expectedDate >= today;
    }, "Expected delivery date must be today or in the future"),
  notes: z.string().optional(),
});

export type PurchaseOrderInput = z.infer<typeof purchaseOrderSchema>;
