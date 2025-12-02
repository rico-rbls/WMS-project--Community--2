import { z } from "zod";

// Password validation constants
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_REQUIREMENTS = `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;

// Password validation schema (reusable)
export const passwordSchema = z.string()
  .min(1, "Password is required")
  .min(PASSWORD_MIN_LENGTH, PASSWORD_REQUIREMENTS);

// Login validation schema
export const loginSchema = z.object({
  email: z.string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z.string()
    .min(1, "Password is required"),
    // Note: For login, we don't enforce min length since old passwords may be shorter
});

export type LoginInput = z.infer<typeof loginSchema>;

// Registration validation schema
export const registerSchema = z.object({
  name: z.string()
    .min(1, "Name is required")
    .min(2, "Name must be at least 2 characters"),
  email: z.string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: passwordSchema,
  confirmPassword: z.string()
    .min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type RegisterInput = z.infer<typeof registerSchema>;

// Change password validation schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// Inventory validation schema
export const inventoryItemSchema = z.object({
  name: z.string()
    .min(1, "Item name is required")
    .min(3, "Item name must be at least 3 characters")
    .max(100, "Item name must be less than 100 characters"),
  category: z.enum(["Electronics", "Furniture", "Clothing", "Food"], {
    errorMap: () => ({ message: "Please select a valid category" }),
  }),
  quantity: z.coerce.number()
    .int("Quantity must be a whole number")
    .min(0, "Quantity cannot be negative"),
  location: z.string()
    .min(1, "Location is required")
    .regex(/^[A-Z]-\d+$/, "Location must be in format A-12 (Letter-Number)"),
  brand: z.string()
    .min(1, "Brand is required")
    .min(2, "Brand must be at least 2 characters")
    .max(100, "Brand must be less than 100 characters"),
  pricePerPiece: z.coerce.number()
    .positive("Price per piece must be a positive number")
    .max(1000000, "Price per piece seems too high"),
  supplierId: z.string()
    .min(1, "Supplier is required")
    .regex(/^SUP-\d+$/, "Supplier ID must be in format SUP-001"),
  quantityPurchased: z.coerce.number()
    .int("Quantity purchased must be a whole number")
    .min(0, "Quantity purchased cannot be negative"),
  quantitySold: z.coerce.number()
    .int("Quantity sold must be a whole number")
    .min(0, "Quantity sold cannot be negative"),
  reorderRequired: z.boolean(),
});

export type InventoryItemInput = z.infer<typeof inventoryItemSchema>;

// Supplier validation schema
export const supplierSchema = z.object({
  name: z.string()
    .min(1, "Company name is required")
    .min(2, "Company name must be at least 2 characters")
    .max(100, "Company name must be less than 100 characters"),
  contact: z.string()
    .min(1, "Contact person is required")
    .min(2, "Contact name must be at least 2 characters"),
  email: z.string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  phone: z.string()
    .min(1, "Phone number is required"),
  category: z.string()
    .min(1, "Category is required"),
  status: z.enum(["Active", "Inactive"], {
    errorMap: () => ({ message: "Please select a valid status" }),
  }).optional(),
  country: z.string()
    .max(100, "Country must be less than 100 characters")
    .optional(),
  city: z.string()
    .max(100, "City must be less than 100 characters")
    .optional(),
  address: z.string()
    .max(200, "Address must be less than 200 characters")
    .optional(),
  purchases: z.coerce.number()
    .min(0, "Purchases cannot be negative")
    .optional(),
  payments: z.coerce.number()
    .min(0, "Payments cannot be negative")
    .optional(),
});

export type SupplierInput = z.infer<typeof supplierSchema>;

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
