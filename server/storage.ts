import { 
  type User, 
  type InsertUser, 
  type Appointment, 
  type InsertAppointment,
  type Prescription,
  type InsertPrescription,
  type PharmacyStock,
  type InsertPharmacyStock
} from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { promises as fs } from 'fs';
import path from 'path';

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Appointment methods
  getAppointment(id: string): Promise<Appointment | undefined>;
  getAppointmentsByUser(userId: string): Promise<Appointment[]>;
  getAppointmentsByDoctor(doctorId: string): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointmentStatus(id: string, status: string): Promise<Appointment | undefined>;
  
  // Prescription methods
  getPrescription(id: string): Promise<Prescription | undefined>;
  getPrescriptionsByPatient(patientId: string): Promise<Prescription[]>;
  getPrescriptionsByDoctor(doctorId: string): Promise<Prescription[]>;
  createPrescription(prescription: InsertPrescription): Promise<Prescription>;
  
  // Pharmacy methods
  getAllPharmacies(): Promise<PharmacyStock[]>;
  getPharmacy(id: string): Promise<PharmacyStock | undefined>;
  
  // Get doctors
  getDoctors(): Promise<User[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private appointments: Map<string, Appointment>;
  private prescriptions: Map<string, Prescription>;
  private pharmacies: Map<string, PharmacyStock>;
  private dataDir: string;
  private usersFile: string;
  private appointmentsFile: string;
  private prescriptionsFile: string;
  private pharmaciesFile: string;

  constructor() {
    this.users = new Map();
    this.appointments = new Map();
    this.prescriptions = new Map();
    this.pharmacies = new Map();
    this.dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
    this.usersFile = path.join(this.dataDir, 'users.json');
    this.appointmentsFile = path.join(this.dataDir, 'appointments.json');
    this.prescriptionsFile = path.join(this.dataDir, 'prescriptions.json');
    this.pharmaciesFile = path.join(this.dataDir, 'pharmacies.json');
    // Fire and forget initial load
    void this.initialize();
  }

  private async initialize() {
    await this.ensureDataDir();
    const hasExisting = await this.loadAll();
    if (!hasExisting) {
      await this.seedData();
      await this.persistAll();
    }
  }

  private async ensureDataDir() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch {
      // ignore
    }
  }

  private async loadFile<T>(file: string): Promise<T[] | null> {
    try {
      const data = await fs.readFile(file, 'utf8');
      if (!data.trim()) return null;
      return JSON.parse(data) as T[];
    } catch {
      return null;
    }
  }

  private reviveDates<T extends { createdAt?: string | Date | null }>(items: T[]): (Omit<T, 'createdAt'> & { createdAt: Date })[] {
    return items.map(i => ({
      ...i,
      createdAt: i.createdAt ? new Date(i.createdAt) : new Date()
    }));
  }

  private async loadAll(): Promise<boolean> {
    const [users, appointments, prescriptions, pharmacies] = await Promise.all([
      this.loadFile<User>(this.usersFile),
      this.loadFile<Appointment>(this.appointmentsFile),
      this.loadFile<Prescription>(this.prescriptionsFile),
      this.loadFile<PharmacyStock>(this.pharmaciesFile)
    ]);

    if (users && users.length) {
      this.reviveDates(users).forEach(u => this.users.set(u.id, u));
    }
    if (appointments && appointments.length) {
      this.reviveDates(appointments).forEach(a => this.appointments.set(a.id, a));
    }
    if (prescriptions && prescriptions.length) {
      this.reviveDates(prescriptions).forEach(p => this.prescriptions.set(p.id, p));
    }
    if (pharmacies && pharmacies.length) {
      // Pharmacies don't have createdAt so we bypass reviveDates
      pharmacies.forEach(ph => this.pharmacies.set(ph.id, ph));
    }

    return Boolean(users && users.length);
  }

  private async writeFileSafe(file: string, data: any) {
  // Ensure parent directory exists (race-safe)
  try { await fs.mkdir(path.dirname(file), { recursive: true }); } catch { /* ignore */ }
  const tmp = file + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tmp, file);
  }

  private async persistAll() {
    await this.ensureDataDir();
    await Promise.all([
      this.writeFileSafe(this.usersFile, Array.from(this.users.values())),
      this.writeFileSafe(this.appointmentsFile, Array.from(this.appointments.values())),
      this.writeFileSafe(this.prescriptionsFile, Array.from(this.prescriptions.values())),
      this.writeFileSafe(this.pharmaciesFile, Array.from(this.pharmacies.values()))
    ]);
  }

  private async persistUsers() { await this.writeFileSafe(this.usersFile, Array.from(this.users.values())); }
  private async persistAppointments() { await this.writeFileSafe(this.appointmentsFile, Array.from(this.appointments.values())); }
  private async persistPrescriptions() { await this.writeFileSafe(this.prescriptionsFile, Array.from(this.prescriptions.values())); }
  private async persistPharmacies() { await this.writeFileSafe(this.pharmaciesFile, Array.from(this.pharmacies.values())); }

  private async seedData() {
    // Seed doctors
    const doctors = [
      {
        name: "Dr. प्रिया शर्मा",
        email: "priya.sharma@sehat.com",
        password: await bcrypt.hash("password123", 10),
        role: "doctor",
        specialization: "General Medicine"
      },
      {
        name: "Dr. राज पटेल",
        email: "raj.patel@sehat.com",
        password: await bcrypt.hash("password123", 10),
        role: "doctor",
        specialization: "Pediatrics"
      },
      {
        name: "Dr. Anuj Gupta",
        email: "anuj@sehat.com",
        password: await bcrypt.hash("anuj123", 10),
        role: "doctor",
        specialization: "Gynecology"
      }
    ];

    for (const doctor of doctors) {
      await this.createUser(doctor);
    }

    // Seed patient
  await this.createUser({
      name: "राज कुमार",
      email: "raj.kumar@patient.com",
      password: await bcrypt.hash("password123", 10),
      role: "patient"
    });

    // Seed pharmacies
    const pharmacies = [
      {
        pharmacyName: "राम मेडिकल स्टोर",
        address: "Main Market, Jaipur",
        latitude: "26.9124",
        longitude: "75.7873",
        medicines: { "Paracetamol": 50, "ORS": 30, "Crocin": 25 },
        phone: "+91-9876543210",
        isOpen: true
      },
      {
        pharmacyName: "सरस्वती फार्मेसी",
        address: "Raja Park, Jaipur",
        latitude: "26.9224",
        longitude: "75.7973",
        medicines: { "Paracetamol": 25, "Amoxicillin": 15, "Aspirin": 40 },
        phone: "+91-9876543211",
        isOpen: true
      },
      {
        pharmacyName: "गणेश मेडिकल",
        address: "Malviya Nagar, Jaipur",
        latitude: "26.9024",
        longitude: "75.7773",
        medicines: { "ORS": 40, "Crocin": 20, "Ibuprofen": 30 },
        phone: "+91-9876543212",
        isOpen: true
      }
    ];

    for (const pharmacy of pharmacies) {
      const id = randomUUID();
      this.pharmacies.set(id, { ...pharmacy, id });
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      specialization: insertUser.specialization || null,
      createdAt: new Date()
    };
    this.users.set(id, user);
  void this.persistUsers();
    return user;
  }

  async getAppointment(id: string): Promise<Appointment | undefined> {
    return this.appointments.get(id);
  }

  async getAppointmentsByUser(userId: string): Promise<Appointment[]> {
    return Array.from(this.appointments.values()).filter(
      appointment => appointment.patientId === userId
    );
  }

  async getAppointmentsByDoctor(doctorId: string): Promise<Appointment[]> {
    return Array.from(this.appointments.values()).filter(
      appointment => appointment.doctorId === doctorId
    );
  }

  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    const id = randomUUID();
    // Ensure required fields exist and conform to Appointment type
    const appointment: Appointment = {
      id,
      doctorId: insertAppointment.doctorId,
      patientId: insertAppointment.patientId,
      date: insertAppointment.date as any instanceof Date ? insertAppointment.date as any : new Date(insertAppointment.date as any),
      timeSlot: (insertAppointment as any).timeSlot as string,
      status: (insertAppointment as any).status || "pending",
      reason: insertAppointment.reason ? insertAppointment.reason : null,
      doctorComment: (insertAppointment as any).doctorComment ?? null,
      clinicAddress: (insertAppointment as any).clinicAddress ?? null,
      clinicPhone: (insertAppointment as any).clinicPhone ?? null,
      patientNotified: (insertAppointment as any).patientNotified ?? false,
      createdAt: new Date()
    };
    this.appointments.set(id, appointment);
  void this.persistAppointments();
    return appointment;
  }

  async updateAppointmentStatus(id: string, status: string, extra?: Partial<Appointment>): Promise<Appointment | undefined> {
    const appointment = this.appointments.get(id);
    if (appointment) {
      appointment.status = status;
      if (extra) {
        if (typeof extra.doctorComment !== 'undefined') appointment.doctorComment = extra.doctorComment;
        if (typeof extra.clinicAddress !== 'undefined') appointment.clinicAddress = extra.clinicAddress;
        if (typeof extra.clinicPhone !== 'undefined') appointment.clinicPhone = extra.clinicPhone;
        if (typeof (extra as any).patientNotified !== 'undefined') appointment.patientNotified = (extra as any).patientNotified;
      }
      this.appointments.set(id, appointment);
      void this.persistAppointments();
      return appointment;
    }
    return undefined;
  }

  async getPrescription(id: string): Promise<Prescription | undefined> {
    return this.prescriptions.get(id);
  }

  async getPrescriptionsByPatient(patientId: string): Promise<Prescription[]> {
    return Array.from(this.prescriptions.values()).filter(
      prescription => prescription.patientId === patientId
    );
  }

  async getPrescriptionsByDoctor(doctorId: string): Promise<Prescription[]> {
    return Array.from(this.prescriptions.values()).filter(
      prescription => prescription.doctorId === doctorId
    );
  }

  async createPrescription(insertPrescription: InsertPrescription): Promise<Prescription> {
    const id = randomUUID();
    const prescription: Prescription = {
      ...insertPrescription,
      id,
      appointmentId: insertPrescription.appointmentId || null,
      notes: insertPrescription.notes || null,
      createdAt: new Date()
    };
    this.prescriptions.set(id, prescription);
  void this.persistPrescriptions();
    return prescription;
  }

  async getAllPharmacies(): Promise<PharmacyStock[]> {
    return Array.from(this.pharmacies.values());
  }

  async getPharmacy(id: string): Promise<PharmacyStock | undefined> {
    return this.pharmacies.get(id);
  }

  async getDoctors(): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.role === "doctor");
  }
}

export const storage = new MemStorage();
