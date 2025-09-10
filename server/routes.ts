import type { Express } from "express";
import { createServer, type Server } from "http";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { 
  loginSchema, 
  registerSchema, 
  insertAppointmentSchema,
  insertPrescriptionSchema 
} from "@shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || "sehat-saathi-secret-key";

// Middleware to verify JWT token
const verifyToken = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth Routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Create user
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      // Generate JWT
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role }, 
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      // Remove password from response
      const { password, ...userResponse } = user;
      
      res.status(201).json({ user: userResponse, token });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      // Find user
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Generate JWT
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role }, 
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      // Remove password from response
      const { password: _, ...userResponse } = user;
      
      res.json({ user: userResponse, token });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/auth/me", verifyToken, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password, ...userResponse } = user;
      res.json(userResponse);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Appointment Routes
  app.post("/api/appointments", verifyToken, async (req: any, res) => {
    try {
      const appointmentData = insertAppointmentSchema.parse(req.body);
      
      // Ensure patient can only book for themselves
      if (req.user.role === "patient" && appointmentData.patientId !== req.user.userId) {
        return res.status(403).json({ message: "Can only book appointments for yourself" });
      }

      const appointment = await storage.createAppointment(appointmentData);
      res.status(201).json(appointment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/appointments", verifyToken, async (req: any, res) => {
    try {
      let appointments;
      
      if (req.user.role === "doctor") {
        appointments = await storage.getAppointmentsByDoctor(req.user.userId);
      } else {
        appointments = await storage.getAppointmentsByUser(req.user.userId);
      }

      // Get user details for appointments
      const appointmentsWithDetails = await Promise.all(
        appointments.map(async (appointment) => {
          const doctor = await storage.getUser(appointment.doctorId);
          const patient = await storage.getUser(appointment.patientId);
          
          return {
            ...appointment,
            doctor: doctor ? { id: doctor.id, name: doctor.name, specialization: doctor.specialization } : null,
            patient: patient ? { id: patient.id, name: patient.name } : null,
          };
        })
      );

      res.json(appointmentsWithDetails);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/appointments/:id/status", verifyToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // Only doctors can update appointment status
      if (req.user.role !== "doctor") {
        return res.status(403).json({ message: "Only doctors can update appointment status" });
      }

      const appointment = await storage.updateAppointmentStatus(id, status);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      res.json(appointment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Prescription Routes
  app.post("/api/prescriptions", verifyToken, async (req: any, res) => {
    try {
      const prescriptionData = insertPrescriptionSchema.parse(req.body);

      // Only doctors can create prescriptions
      if (req.user.role !== "doctor") {
        return res.status(403).json({ message: "Only doctors can create prescriptions" });
      }

      // Ensure doctor can only create prescriptions for their own consultations
      if (prescriptionData.doctorId !== req.user.userId) {
        return res.status(403).json({ message: "Can only create prescriptions for your own consultations" });
      }

      const prescription = await storage.createPrescription(prescriptionData);
      res.status(201).json(prescription);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/prescriptions", verifyToken, async (req: any, res) => {
    try {
      let prescriptions;

      if (req.user.role === "patient") {
        prescriptions = await storage.getPrescriptionsByPatient(req.user.userId);
      } else {
        // For doctors, get all prescriptions they've created
        const allPrescriptions = await storage.getPrescriptionsByPatient(""); // This would need a different method
        prescriptions = allPrescriptions.filter(p => p.doctorId === req.user.userId);
      }

      // Get doctor and patient details
      const prescriptionsWithDetails = await Promise.all(
        prescriptions.map(async (prescription) => {
          const doctor = await storage.getUser(prescription.doctorId);
          const patient = await storage.getUser(prescription.patientId);
          
          return {
            ...prescription,
            doctor: doctor ? { id: doctor.id, name: doctor.name, specialization: doctor.specialization } : null,
            patient: patient ? { id: patient.id, name: patient.name } : null,
          };
        })
      );

      res.json(prescriptionsWithDetails);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Pharmacy Routes
  app.get("/api/pharmacies", async (req, res) => {
    try {
      const pharmacies = await storage.getAllPharmacies();
      res.json(pharmacies);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Doctor Routes
  app.get("/api/doctors", async (req, res) => {
    try {
      const doctors = await storage.getDoctors();
      const doctorsResponse = doctors.map(({ password, ...doctor }) => doctor);
      res.json(doctorsResponse);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
