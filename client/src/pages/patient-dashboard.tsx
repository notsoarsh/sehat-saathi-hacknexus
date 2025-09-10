import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import AppointmentModal from "@/components/AppointmentModal";
import PrescriptionModal from "@/components/PrescriptionModal";
import PharmacyMap from "@/components/PharmacyMap";
import Chatbot from "@/components/Chatbot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CalendarPlus, 
  Pill, 
  MapPin, 
  Lightbulb, 
  CalendarCheck, 
  PillBottle, 
  Store,
  User,
  Phone
} from "lucide-react";

export default function PatientDashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);

  // Fetch appointments
  const { data: appointments } = useQuery({
    queryKey: ["/api/appointments"],
  });

  // Fetch prescriptions
  const { data: prescriptions } = useQuery({
    queryKey: ["/api/prescriptions"],
  });

  const upcomingAppointments = appointments?.filter((apt: any) => 
    apt.status === "confirmed" && new Date(apt.date) > new Date()
  ) || [];

  const recentPrescriptions = prescriptions?.slice(0, 2) || [];

  const handleEmergencyClick = () => {
    alert("Emergency services: Dial 108 for ambulance");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-success text-success-foreground";
      case "pending": return "bg-accent text-accent-foreground";
      case "rejected": return "bg-destructive text-destructive-foreground";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Dashboard Content */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Welcome Section */}
            <Card className="bg-card border border-border shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground" data-testid="text-welcome">
                      {t("welcome")}, {user?.name}!
                    </h2>
                    <p className="text-muted-foreground text-lg">
                      {t("healthPriority")}
                    </p>
                  </div>
                  <div className="text-6xl">
                    <User className="text-primary" />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-primary/10 rounded-lg p-4 text-center">
                    <CalendarCheck className="text-primary text-2xl mb-2 mx-auto" />
                    <p className="text-2xl font-bold text-primary" data-testid="stat-appointments">
                      {upcomingAppointments.length}
                    </p>
                    <p className="text-sm text-muted-foreground">{t("upcoming")}</p>
                  </div>
                  <div className="bg-success/10 rounded-lg p-4 text-center">
                    <PillBottle className="text-success text-2xl mb-2 mx-auto" />
                    <p className="text-2xl font-bold text-success" data-testid="stat-prescriptions">
                      {prescriptions?.length || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">{t("prescriptions")}</p>
                  </div>
                  <div className="bg-accent/10 rounded-lg p-4 text-center">
                    <Store className="text-accent text-2xl mb-2 mx-auto" />
                    <p className="text-2xl font-bold text-accent" data-testid="stat-pharmacies">8</p>
                    <p className="text-sm text-muted-foreground">{t("nearby")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-card border border-border shadow-sm">
              <CardHeader>
                <CardTitle>{t("quickActions")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button
                    onClick={() => setShowAppointmentModal(true)}
                    className="flex items-center space-x-4 p-6 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-left h-auto"
                    data-testid="button-book-appointment"
                  >
                    <CalendarPlus className="text-3xl" />
                    <div>
                      <h4 className="font-bold text-lg">{t("bookAppointment")}</h4>
                      <p className="opacity-90">{t("bookAppointmentHindi")}</p>
                    </div>
                  </Button>
                  
                  <Button
                    onClick={() => setShowPrescriptionModal(true)}
                    className="flex items-center space-x-4 p-6 bg-success text-success-foreground rounded-lg hover:bg-success/90 transition-colors text-left h-auto"
                    data-testid="button-view-prescriptions"
                  >
                    <Pill className="text-3xl" />
                    <div>
                      <h4 className="font-bold text-lg">{t("myPrescriptions")}</h4>
                      <p className="opacity-90">{t("myPrescriptionsHindi")}</p>
                    </div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="flex items-center space-x-4 p-6 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors text-left h-auto"
                    data-testid="button-find-pharmacy"
                  >
                    <MapPin className="text-3xl" />
                    <div>
                      <h4 className="font-bold text-lg">{t("findPharmacy")}</h4>
                      <p className="opacity-90">{t("findPharmacyHindi")}</p>
                    </div>
                  </Button>
                  
                  <Button
                    variant="secondary"
                    className="flex items-center space-x-4 p-6 bg-secondary text-secondary-foreground rounded-lg hover:bg-muted transition-colors text-left h-auto"
                    data-testid="button-health-tips"
                  >
                    <Lightbulb className="text-3xl" />
                    <div>
                      <h4 className="font-bold text-lg">{t("healthTips")}</h4>
                      <p className="opacity-90">{t("healthTipsHindi")}</p>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Appointments */}
            <Card className="bg-card border border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t("upcomingAppointments")}</CardTitle>
                <Button variant="link" className="text-primary hover:text-primary/80 font-medium">
                  {t("viewAll")}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcomingAppointments.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">
                      No upcoming appointments
                    </p>
                  ) : (
                    upcomingAppointments.map((appointment: any) => (
                      <div 
                        key={appointment.id} 
                        className="flex items-center justify-between p-4 bg-secondary rounded-lg"
                        data-testid={`card-appointment-${appointment.id}`}
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                            <User className="text-primary-foreground" />
                          </div>
                          <div>
                            <h4 className="font-bold">{appointment.doctor?.name}</h4>
                            <p className="text-muted-foreground">
                              {t(appointment.doctor?.specialization?.toLowerCase().replace(" ", "") || "generalMedicine")}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(appointment.date).toLocaleDateString()} at{" "}
                              {new Date(appointment.date).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={getStatusColor(appointment.status)}>
                            {t(appointment.status)}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pharmacy Map */}
            <PharmacyMap />
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            
            {/* Chatbot */}
            <Chatbot />

            {/* Recent Prescriptions */}
            <Card className="bg-card border border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t("recentPrescriptions")}</CardTitle>
                <Button 
                  variant="link" 
                  className="text-primary hover:text-primary/80 font-medium"
                  onClick={() => setShowPrescriptionModal(true)}
                >
                  {t("viewAll")}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentPrescriptions.length === 0 ? (
                    <p className="text-center py-4 text-muted-foreground">
                      No prescriptions found
                    </p>
                  ) : (
                    recentPrescriptions.map((prescription: any) => (
                      <div 
                        key={prescription.id} 
                        className="p-4 bg-secondary rounded-lg"
                        data-testid={`card-prescription-recent-${prescription.id}`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold">{prescription.doctor?.name}</h4>
                          <span className="text-sm text-muted-foreground">
                            {new Date(prescription.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {prescription.medicines?.slice(0, 2).map((medicine: any, index: number) => (
                            <div key={index} className="flex items-center space-x-2">
                              <PillBottle className="text-primary w-4 h-4" />
                              <span className="text-sm">
                                {typeof medicine === 'string' ? medicine : medicine.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Health Tips */}
            <Card className="bg-card border border-border shadow-sm">
              <CardHeader>
                <CardTitle>{t("todaysHealthTip")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-success/10 border border-success/20 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Lightbulb className="text-success text-xl mt-1" />
                    <div>
                      <h4 className="font-bold text-success mb-2">{t("drinkWater")}</h4>
                      <p className="text-sm text-muted-foreground">
                        {t("drinkWaterTip")}
                      </p>
                    </div>
                  </div>
                </div>
                
                <Button 
                  variant="secondary" 
                  className="w-full mt-4"
                  data-testid="button-more-tips"
                >
                  <Lightbulb className="w-4 h-4 mr-2" />
                  {t("moreTips")}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Emergency Button */}
      <Button
        onClick={handleEmergencyClick}
        className="fixed bottom-6 right-6 w-16 h-16 bg-destructive text-destructive-foreground rounded-full shadow-lg hover:bg-destructive/90 transition-all duration-300 hover:scale-110 z-50"
        data-testid="button-emergency"
      >
        <Phone className="text-xl" />
      </Button>

      {/* Modals */}
      <AppointmentModal 
        isOpen={showAppointmentModal} 
        onClose={() => setShowAppointmentModal(false)} 
      />
      <PrescriptionModal 
        isOpen={showPrescriptionModal} 
        onClose={() => setShowPrescriptionModal(false)} 
      />
    </div>
  );
}
