import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { 
  loginSchema, 
  registerSchema, 
  insertAppointmentSchema,
  insertPrescriptionSchema 
} from "@shared/schema";
import { ZodError } from 'zod';
import { 
  generateToken, 
  authenticateToken, 
  authenticateAndAuthorize,
  asyncHandler // Import asyncHandler
} from "./auth";
import dotenv from 'dotenv';
dotenv.config();

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth Routes
  app.post("/api/auth/register", asyncHandler(async (req: Request, res: Response) => { // Use asyncHandler
  const userData = registerSchema.parse(req.body);
  // Destructure to exclude confirmPassword from persistence
  const { confirmPassword, ...persistable } = userData;
    
    const existingUser = await storage.getUserByEmail(userData.email);
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    const user = await storage.createUser({
      ...persistable,
      password: hashedPassword,
    });

    const token = await generateToken({
      id: user.id, 
      email: user.email, 
      role: user.role,
      specialization: user.specialization || undefined,
    });

    const { password, ...userResponse } = user;
    
    res.status(201).json({ user: userResponse, token });
  }));

  app.post("/api/auth/login", asyncHandler(async (req: Request, res: Response) => { // Use asyncHandler
    const { email, password } = loginSchema.parse(req.body);
    
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = await generateToken({
      id: user.id, 
      email: user.email, 
      role: user.role,
      specialization: user.specialization || undefined,
    });

    const { password: _, ...userResponse } = user;
    
    res.json({ user: userResponse, token });
  }));

  app.get("/api/auth/me", authenticateToken, asyncHandler(async (req: Request, res: Response) => { // Use asyncHandler
    // req.user is guaranteed to be here by the authenticateToken middleware
    const user = await storage.getUser(req.user!.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { password, ...userResponse } = user;
    res.json(userResponse);
  }));

  // Appointment Routes
  app.post("/api/appointments", authenticateToken, asyncHandler(async (req: Request, res: Response) => { // Use asyncHandler
    // Accept both ISO string or Date for 'date' field
    const body = { ...req.body };
    if (typeof body.date === 'string') {
      const parsed = new Date(body.date);
      if (isNaN(parsed.getTime())) {
        return res.status(400).json({ message: 'Invalid date format. Use ISO string e.g. 2025-09-10T10:30:00Z' });
      }
      body.date = parsed;
    }
    let appointmentData;
    try {
      appointmentData = insertAppointmentSchema.parse(body);
    } catch (e) {
      if (e instanceof ZodError) {
        return res.status(400).json({ 
          message: 'Validation error', 
          issues: e.issues.map(i => ({ path: i.path.join('.'), message: i.message })) 
        });
      }
      throw e;
    }
    
    // Patients can only book for themselves
    if (req.user!.role === "patient" && appointmentData.patientId !== req.user!.id) {
      return res.status(403).json({ message: "You can only book appointments for yourself." });
    }

    const appointment = await storage.createAppointment(appointmentData);
    res.status(201).json(appointment);
  }));

  app.get("/api/appointments", authenticateToken, asyncHandler(async (req: Request, res: Response) => { // Use asyncHandler
    let appointments;
    const userId = req.user!.id;
    
    if (req.user!.role === "doctor") {
      appointments = await storage.getAppointmentsByDoctor(userId);
    } else {
      appointments = await storage.getAppointmentsByUser(userId);
    }

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
  }));

  app.patch("/api/appointments/:id/status", ...authenticateAndAuthorize("doctor"), asyncHandler(async (req: Request, res: Response) => { // Use asyncHandler
    const { id } = req.params;
    const { status, doctorComment, clinicAddress, clinicPhone } = req.body;

    if (clinicPhone) {
      const phoneOk = /^[+\d][\d\s\-()]{5,19}$/.test(clinicPhone);
      if (!phoneOk) return res.status(400).json({ message: "Invalid clinicPhone format" });
    }

    const appointment = await storage.updateAppointmentStatus(id, status, {
      doctorComment: doctorComment ?? undefined,
      clinicAddress: clinicAddress ?? undefined,
      clinicPhone: clinicPhone ?? undefined
    } as any);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    // Ensure the doctor modifying the status is the one associated with the appointment
    if (appointment.doctorId !== req.user!.id) {
      return res.status(403).json({ message: "You can only update the status of your own appointments." });
    }

    res.json(appointment);
  }));

  // Patient acknowledges seeing notification/comment
  app.post("/api/appointments/:id/ack", authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const appointment = await storage.getAppointment(id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });
    // Only patient owning the appointment can ack
    if (appointment.patientId !== req.user!.id) return res.status(403).json({ message: "Not allowed" });
    // Mark patientNotified true (acknowledged)
    const updated = await storage.updateAppointmentStatus(id, appointment.status, { patientNotified: true } as any);
    res.json(updated);
  }));

  // Prescription Routes
  app.post("/api/prescriptions", ...authenticateAndAuthorize("doctor"), asyncHandler(async (req: Request, res: Response) => { // Use asyncHandler
    let prescriptionData;
    try {
      prescriptionData = insertPrescriptionSchema.parse(req.body);
    } catch (e) {
      if (e instanceof ZodError) {
        return res.status(400).json({ 
          message: 'Validation error', 
          issues: e.issues.map(i => ({ path: i.path.join('.'), message: i.message })) 
        });
      }
      throw e;
    }

    // Ensure the doctor creating the prescription is the authenticated user
    if (prescriptionData.doctorId !== req.user!.id) {
      return res.status(403).json({ message: "You can only create prescriptions for your own consultations." });
    }

    const prescription = await storage.createPrescription(prescriptionData);
    res.status(201).json(prescription);
  }));

  app.get("/api/prescriptions", authenticateToken, asyncHandler(async (req: Request, res: Response) => { // Use asyncHandler
    let prescriptions: any[] = [];
    const userId = req.user!.id;

    if (req.user!.role === "patient") {
      prescriptions = await storage.getPrescriptionsByPatient(userId);
    } else if (req.user!.role === "doctor") {
      // Correctly fetch prescriptions for the logged-in doctor
      prescriptions = await storage.getPrescriptionsByDoctor(userId);
    } else {
      // For other roles, or if role is undefined, return empty or throw error
      prescriptions = [];
    }

    const prescriptionsWithDetails = await Promise.all(
      prescriptions.map(async (prescription: any) => {
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
  }));

  // Pharmacy Routes
  app.get("/api/pharmacies", asyncHandler(async (_req: Request, res: Response) => { // Use asyncHandler
    const pharmacies = await storage.getAllPharmacies();
    res.json(pharmacies);
  }));

  // Doctor Routes - Public endpoint for finding doctors
  app.get("/api/doctors", asyncHandler(async (_req: Request, res: Response) => { // Use asyncHandler
    const doctors = await storage.getDoctors();
    const doctorsResponse = doctors.map(({ password, ...doctor }) => doctor);
    res.json(doctorsResponse);
  }));

  // AI Chat (Gemini) - authenticated to prevent abuse
  app.post("/api/chat/ai", authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ message: "AI temporarily unavailable (missing API key)" });
    }
    const { messages = [], language = 'en' } = req.body || {};
    const recent = Array.isArray(messages) ? messages.slice(-10) : [];

    const systemPrompt = `You are Sehat Saathi, a concise bilingual (English/Hindi) health assistant.\nGuidelines:\n- Provide general, educational health info only.\n- Always include a brief disclaimer that this is not a medical diagnosis.\n- If language='hi', respond fully in Hindi (Devanagari).\n- If potentially emergency (e.g., chest pain, stroke signs, severe bleeding), clearly advise seeking emergency services (108 in India).\n- Keep answers under 180 words.\n- Avoid prescribing specific dosages beyond common OTC guidance disclaimers.\n- If user asks about booking an appointment, remind they can use the in-app appointment booking feature.`;

    const userContext = recent.map((m: any) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content.slice(0, 2000) }] }));

    const payload = {
      contents: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        ...userContext
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.9,
        maxOutputTokens: 512
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUAL_CONTENT', threshold: 'BLOCK_NONE' }
      ]
    };

    try {
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) {
        const text = await resp.text();
        return res.status(502).json({ message: 'AI upstream error', detail: text.slice(0, 500) });
      }
      const data = await resp.json();
      const candidate = data.candidates?.[0];
      const parts = candidate?.content?.parts || [];
      const reply = parts.map((p: any) => p.text).join('\n').trim() || 'Sorry, I could not generate a response.';
      res.json({ reply, model: 'gemini-1.5-flash' });
    } catch (e: any) {
      res.status(500).json({ message: 'AI request failed', error: e.message });
    }
  }));

  const httpServer = createServer(app);
  return httpServer;
}