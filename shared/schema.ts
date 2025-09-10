import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(), // "patient" or "doctor"
  specialization: text("specialization"), // only for doctors
  createdAt: timestamp("created_at").defaultNow(),
});

export const appointments = pgTable("appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull().references(() => users.id),
  doctorId: varchar("doctor_id").notNull().references(() => users.id),
  date: timestamp("date").notNull(),
  timeSlot: text("time_slot").notNull(),
  reason: text("reason"),
  status: text("status").notNull().default("pending"), // "pending", "confirmed", "rejected", "completed"
  createdAt: timestamp("created_at").defaultNow(),
});

export const prescriptions = pgTable("prescriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  appointmentId: varchar("appointment_id").references(() => appointments.id),
  doctorId: varchar("doctor_id").notNull().references(() => users.id),
  patientId: varchar("patient_id").notNull().references(() => users.id),
  medicines: jsonb("medicines").notNull(), // Array of medicine objects
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pharmacyStock = pgTable("pharmacy_stock", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pharmacyName: text("pharmacy_name").notNull(),
  address: text("address").notNull(),
  latitude: text("latitude").notNull(),
  longitude: text("longitude").notNull(),
  medicines: jsonb("medicines").notNull(), // Object with medicine names as keys and quantities as values
  phone: text("phone"),
  isOpen: boolean("is_open").default(true),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
});

export const insertPrescriptionSchema = createInsertSchema(prescriptions).omit({
  id: true,
  createdAt: true,
});

export const insertPharmacyStockSchema = createInsertSchema(pharmacyStock).omit({
  id: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Prescription = typeof prescriptions.$inferSelect;
export type InsertPrescription = z.infer<typeof insertPrescriptionSchema>;
export type PharmacyStock = typeof pharmacyStock.$inferSelect;
export type InsertPharmacyStock = z.infer<typeof insertPharmacyStockSchema>;

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type LoginRequest = z.infer<typeof loginSchema>;
export type RegisterRequest = z.infer<typeof registerSchema>;
