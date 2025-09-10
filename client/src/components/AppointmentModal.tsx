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
import { CalendarPlus, Keyboard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const appointmentSchema = z.object({
  doctorId: z.string().min(1, "Please select a doctor"),
  date: z.string().min(1, "Please select a date"),
  timeSlot: z.string().min(1, "Please select a time slot").regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'Invalid time'),
  reason: z.string().max(300, 'Max 300 characters').optional()
    .transform(val => val?.trim() || '')
    .refine(v => !v || v.length === 0 || v.length >=5, { message: 'Reason must be at least 5 characters when provided' }),
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
    // Prevent past date/time submission client side
    const dt = new Date(data.date + 'T' + data.timeSlot);
    if (isNaN(dt.getTime()) || dt.getTime() < Date.now() - 60000) {
      toast({ title: 'Invalid date/time', description: 'Please choose a future date & time', variant: 'destructive' });
      return;
    }
    createAppointment.mutate(data);
  };

  const [showHindiKeyboard, setShowHindiKeyboard] = useState(false);
  const hindiChars = ['अ','आ','इ','ई','उ','ऊ','ए','ऐ','ओ','औ','क','ख','ग','घ','च','छ','ज','झ','ट','ठ','ड','ढ','त','थ','द','ध','न','प','फ','ब','भ','म','य','र','ल','व','श','ष','स','ह','ऋ','ँ','ं','ः','।'];

  const appendHindiChar = (ch: string) => {
    const current = form.getValues('reason') || '';
    form.setValue('reason', current + ch);
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
                      {(doctors as any[] | undefined)?.map((doctor: any) => (
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
                  <div className="flex items-center justify-between">
                    <FormLabel>{t("reasonForVisit")}</FormLabel>
                    <Button type="button" size="sm" variant={showHindiKeyboard ? 'default':'outline'} onClick={() => setShowHindiKeyboard(s=>!s)} className="h-6 px-2 text-xs">
                      <Keyboard className="w-3 h-3 mr-1"/>हिन्दी
                    </Button>
                  </div>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder={t("reasonPlaceholder")}
                      className="h-24"
                      data-testid="textarea-reason"
                    />
                  </FormControl>
                  <div className="flex justify-end text-xs text-muted-foreground mt-1">{form.watch('reason')?.length || 0}/300</div>
                  <FormMessage />
                  {showHindiKeyboard && (
                    <div className="grid grid-cols-10 gap-1 mt-2 p-2 border rounded bg-muted/50 max-h-32 overflow-y-auto text-sm">
                      {hindiChars.map(c => (
                        <button type="button" key={c} onClick={() => appendHindiChar(c)} className="px-1 py-1 bg-background border rounded hover:bg-accent">
                          {c}
                        </button>
                      ))}
                      <button type="button" onClick={() => form.setValue('reason', (form.getValues('reason')||'').slice(0,-1))} className="col-span-2 px-1 py-1 bg-destructive text-destructive-foreground rounded">⌫</button>
                    </div>
                  )}
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
