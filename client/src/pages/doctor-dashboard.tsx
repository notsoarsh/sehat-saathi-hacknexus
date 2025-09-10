import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Calendar, 
  User, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Pill,
  Plus,
  Minus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';

const prescriptionSchema = z.object({
  medicines: z.array(z.object({
    name: z.string().min(1, "Medicine name is required"),
    dosage: z.string().min(1, "Dosage is required"),
  })).min(1, "At least one medicine is required"),
  notes: z.string().optional(),
});

type PrescriptionFormData = z.infer<typeof prescriptionSchema>;

export default function DoctorDashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveData, setApproveData] = useState<{comment: string; clinicAddress: string; clinicPhone: string; appointmentId: string | null}>({comment: "", clinicAddress: "", clinicPhone: "", appointmentId: null});

  // Fetch appointments for doctor
  const { data: appointments, isLoading } = useQuery({
    queryKey: ["/api/appointments"],
  });

  const form = useForm<PrescriptionFormData>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: {
      medicines: [{ name: "", dosage: "" }],
      notes: "",
    },
  });

  // Update appointment status mutation
  const updateAppointmentStatus = useMutation({
    mutationFn: async ({ id, status, doctorComment, clinicAddress, clinicPhone }: { id: string; status: string; doctorComment?: string; clinicAddress?: string; clinicPhone?: string }) => {
      const response = await apiRequest("PATCH", `/api/appointments/${id}/status`, { status, doctorComment, clinicAddress, clinicPhone });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Success",
        description: "Appointment status updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update appointment",
        variant: "destructive",
      });
    },
  });

  // Create prescription mutation
  const createPrescription = useMutation({
    mutationFn: async (data: PrescriptionFormData) => {
      const prescriptionData = {
        ...data,
        doctorId: user?.id,
        patientId: selectedAppointment?.patientId,
        appointmentId: selectedAppointment?.id,
      };
      const response = await apiRequest("POST", "/api/prescriptions", prescriptionData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Pill created successfully",
      });
      form.reset();
      setShowPrescriptionModal(false);
      setSelectedAppointment(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create prescription",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (appointmentId: string) => {
    // open modal to collect details instead of immediate approve
    setApproveData({ comment: "", clinicAddress: "", clinicPhone: "", appointmentId });
    setShowApproveModal(true);
  };

  const handleReject = (appointmentId: string) => {
    updateAppointmentStatus.mutate({ id: appointmentId, status: "rejected" });
  };

  const handleAddPrescription = (appointment: any) => {
    setSelectedAppointment(appointment);
    setShowPrescriptionModal(true);
  };

  const onSubmitPrescription = (data: PrescriptionFormData) => {
    createPrescription.mutate(data);
  };

  const addMedicine = () => {
    const currentMedicines = form.getValues("medicines");
    form.setValue("medicines", [...currentMedicines, { name: "", dosage: "" }]);
  };

  const removeMedicine = (index: number) => {
    const currentMedicines = form.getValues("medicines");
    if (currentMedicines.length > 1) {
      form.setValue("medicines", currentMedicines.filter((_, i) => i !== index));
    }
  };

  const submitApprove = () => {
    if (!approveData.appointmentId) return;
    updateAppointmentStatus.mutate({ id: approveData.appointmentId, status: "confirmed", doctorComment: approveData.comment, clinicAddress: approveData.clinicAddress, clinicPhone: approveData.clinicPhone });
    setShowApproveModal(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-success text-success-foreground";
      case "pending": return "bg-accent text-accent-foreground";
      case "rejected": return "bg-destructive text-destructive-foreground";
      case "completed": return "bg-primary text-primary-foreground";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  const pendingAppointments = (appointments as any[] | undefined)?.filter((apt: any) => apt.status === "pending") || [];
  const todayAppointments = (appointments as any[] | undefined)?.filter((apt: any) => {
    const today = new Date().toDateString();
    return new Date(apt.date).toDateString() === today;
  }) || [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Welcome Section */}
        <Card className="bg-card border border-border shadow-sm mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground" data-testid="text-welcome">
                  {t("welcome")}, {user?.name}!
                </h2>
                <p className="text-muted-foreground text-lg">
                  {user?.specialization} - Doctor Dashboard
                </p>
              </div>
              <div className="text-6xl">
                <User className="text-primary" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-accent/10 rounded-lg p-4 text-center">
                <Clock className="text-accent text-2xl mb-2 mx-auto" />
                <p className="text-2xl font-bold text-accent" data-testid="stat-pending">
                  {pendingAppointments.length}
                </p>
                <p className="text-sm text-muted-foreground">Pending Approvals</p>
              </div>
              <div className="bg-primary/10 rounded-lg p-4 text-center">
                <Calendar className="text-primary text-2xl mb-2 mx-auto" />
                <p className="text-2xl font-bold text-primary" data-testid="stat-today">
                  {todayAppointments.length}
                </p>
                <p className="text-sm text-muted-foreground">Today's Appointments</p>
              </div>
              <div className="bg-success/10 rounded-lg p-4 text-center">
                <CheckCircle className="text-success text-2xl mb-2 mx-auto" />
                <p className="text-2xl font-bold text-success" data-testid="stat-total">
                  { (appointments as any[] | undefined)?.length || 0 }
                </p>
                <p className="text-sm text-muted-foreground">Total Appointments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Pending Appointments */}
          <Card className="bg-card border border-border shadow-sm">
            <CardHeader>
              <CardTitle>Pending Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_,i) => <Skeleton key={i} className="h-28 w-full" />)}
                  </div>
                ) : pendingAppointments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No pending appointments
                  </div>
                ) : (
                  pendingAppointments.map((appointment: any) => (
                    <div 
                      key={appointment.id} 
                      className="p-4 bg-secondary rounded-lg"
                      data-testid={`card-pending-appointment-${appointment.id}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-bold">{appointment.patient?.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(appointment.date).toLocaleDateString()} at{" "}
                            {new Date(appointment.date).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                          {appointment.reason && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Reason: {appointment.reason}
                            </p>
                          )}
                        </div>
                        <Badge className={getStatusColor(appointment.status)}>
                          {t(appointment.status)}
                        </Badge>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(appointment.id)}
                          disabled={updateAppointmentStatus.isPending}
                          className="bg-success text-success-foreground hover:bg-success/90"
                          data-testid={`button-approve-${appointment.id}`}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          {t("approve")}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(appointment.id)}
                          disabled={updateAppointmentStatus.isPending}
                          data-testid={`button-reject-${appointment.id}`}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          {t("reject")}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Today's Appointments */}
          <Card className="bg-card border border-border shadow-sm">
            <CardHeader>
              <CardTitle>Today's Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_,i) => <Skeleton key={i} className="h-24 w-full" />)}
                  </div>
                ) : todayAppointments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No appointments today
                  </div>
                ) : (
                  todayAppointments.map((appointment: any) => (
                    <div 
                      key={appointment.id} 
                      className="p-4 bg-secondary rounded-lg"
                      data-testid={`card-today-appointment-${appointment.id}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-bold">{appointment.patient?.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(appointment.date).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                          {appointment.reason && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Reason: {appointment.reason}
                            </p>
                          )}
                        </div>
                        <Badge className={getStatusColor(appointment.status)}>
                          {t(appointment.status)}
                        </Badge>
                      </div>
                      
                      {appointment.status === "confirmed" && (
                        <Button
                          size="sm"
                          onClick={() => handleAddPrescription(appointment)}
                          data-testid={`button-add-prescription-${appointment.id}`}
                        >
                          <Pill className="w-4 h-4 mr-1" />
                          Add Pill
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Pill Modal */}
      <Dialog open={showPrescriptionModal} onOpenChange={setShowPrescriptionModal}>
        <DialogContent className="max-w-md" data-testid="modal-prescription">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Pill className="w-5 h-5" />
              <span>Add Pill</span>
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitPrescription)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Patient</label>
                <p className="text-sm bg-muted p-2 rounded">{selectedAppointment?.patient?.name}</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium">Medicines</label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addMedicine}
                    data-testid="button-add-medicine"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                
                {form.watch("medicines").map((_, index) => (
                  <div key={index} className="flex space-x-2">
                    <FormField
                      control={form.control}
                      name={`medicines.${index}.name`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input 
                              placeholder="Medicine name"
                              {...field}
                              data-testid={`input-medicine-name-${index}`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`medicines.${index}.dosage`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input 
                              placeholder="Dosage"
                              {...field}
                              data-testid={`input-medicine-dosage-${index}`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {form.watch("medicines").length > 1 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => removeMedicine(index)}
                        data-testid={`button-remove-medicine-${index}`}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Additional notes for the patient..."
                        className="h-20"
                        data-testid="textarea-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full" 
                disabled={createPrescription.isPending}
                data-testid="button-create-prescription"
              >
                <Pill className="w-4 h-4 mr-2" />
                {createPrescription.isPending ? "Creating..." : "Create Pill"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Approve Modal */}
      <Dialog open={showApproveModal} onOpenChange={setShowApproveModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Clinic Details & Comment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Doctor Comment</label>
              <Textarea value={approveData.comment} onChange={e => setApproveData(a => ({...a, comment: e.target.value}))} placeholder="e.g., Please arrive 10 minutes early" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Clinic Address</label>
              <Input value={approveData.clinicAddress} onChange={e => setApproveData(a => ({...a, clinicAddress: e.target.value}))} placeholder="Clinic address" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Clinic Phone</label>
              <Input value={approveData.clinicPhone} onChange={e => setApproveData(a => ({...a, clinicPhone: e.target.value}))} placeholder="Contact number" />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowApproveModal(false)}>Cancel</Button>
              <Button onClick={submitApprove} disabled={updateAppointmentStatus.isPending}>{updateAppointmentStatus.isPending ? "Saving..." : "Confirm"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
