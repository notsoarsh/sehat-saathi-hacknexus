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

  constructor() {
    this.users = new Map();
    this.appointments = new Map();
    this.prescriptions = new Map();
    this.pharmacies = new Map();
    this.seedData();
  }

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
        name: "Dr. सुनीता वर्मा",
        email: "sunita.verma@sehat.com",
        password: await bcrypt.hash("password123", 10),
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
      createdAt: new Date()
    };
    this.users.set(id, user);
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
    const appointment: Appointment = {
      ...insertAppointment,
      id,
      createdAt: new Date()
    };
    this.appointments.set(id, appointment);
    return appointment;
  }

  async updateAppointmentStatus(id: string, status: string): Promise<Appointment | undefined> {
    const appointment = this.appointments.get(id);
    if (appointment) {
      appointment.status = status;
      this.appointments.set(id, appointment);
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

  async createPrescription(insertPrescription: InsertPrescription): Promise<Prescription> {
    const id = randomUUID();
    const prescription: Prescription = {
      ...insertPrescription,
      id,
      createdAt: new Date()
    };
    this.prescriptions.set(id, prescription);
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
