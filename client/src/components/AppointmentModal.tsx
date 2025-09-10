import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CalendarPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const appointmentSchema = z.object({
  doctorId: z.string().min(1, "Please select a doctor"),
  date: z.string().min(1, "Please select a date"),
  timeSlot: z.string().min(1, "Please select a time slot"),
  reason: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AppointmentModal({ isOpen, onClose }: AppointmentModalProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      doctorId: "",
      date: "",
      timeSlot: "",
      reason: "",
    },
  });

  // Fetch doctors
  const { data: doctors, isLoading: doctorsLoading } = useQuery({
    queryKey: ["/api/doctors"],
    enabled: isOpen,
  });

  // Create appointment mutation
  const createAppointment = useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      const appointmentData = {
        ...data,
        patientId: user?.id,
        date: new Date(data.date + "T" + data.timeSlot).toISOString(),
      };
      const response = await apiRequest("POST", "/api/appointments", appointmentData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Appointment booked successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      form.reset();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to book appointment",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AppointmentFormData) => {
    createAppointment.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-testid="modal-appointment">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CalendarPlus className="w-5 h-5" />
            <span>{t("bookAppointment")}</span>
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="doctorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("selectDoctor")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-doctor">
                        <SelectValue placeholder={t("selectDoctor")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {doctors?.map((doctor: any) => (
                        <SelectItem key={doctor.id} value={doctor.id}>
                          {doctor.name} - {t(doctor.specialization?.toLowerCase().replace(" ", "") || "generalMedicine")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("preferredDate")}</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      {...field} 
                      min={new Date().toISOString().split('T')[0]}
                      data-testid="input-date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timeSlot"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("preferredTime")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-time">
                        <SelectValue placeholder={t("preferredTime")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="09:00">{t("morning")}</SelectItem>
                      <SelectItem value="13:00">{t("afternoon")}</SelectItem>
                      <SelectItem value="18:00">{t("evening")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("reasonForVisit")}</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder={t("reasonPlaceholder")}
                      className="h-24"
                      data-testid="textarea-reason"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full" 
              disabled={createAppointment.isPending}
              data-testid="button-book-appointment"
            >
              <CalendarPlus className="w-4 h-4 mr-2" />
              {createAppointment.isPending ? "Booking..." : t("book")}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
