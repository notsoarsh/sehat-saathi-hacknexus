import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pill as PrescriptionIcon, User, Calendar } from "lucide-react";

interface PrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrescriptionModal({ isOpen, onClose }: PrescriptionModalProps) {
  const { t } = useTranslation();

  // Fetch prescriptions
  const { data: prescriptions, isLoading } = useQuery({
    queryKey: ["/api/prescriptions"],
    enabled: isOpen,
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="modal-prescriptions">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <PrescriptionIcon className="w-5 h-5" />
            <span>{t("myPrescriptions")}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">Loading prescriptions...</div>
          ) : prescriptions?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No prescriptions found
            </div>
          ) : (
            prescriptions?.map((prescription: any) => (
              <Card key={prescription.id} className="w-full" data-testid={`card-prescription-${prescription.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <User className="w-4 h-4" />
                      <span>{prescription.doctor?.name}</span>
                    </CardTitle>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(prescription.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {prescription.doctor?.specialization && (
                    <p className="text-sm text-muted-foreground">
                      {t(prescription.doctor.specialization.toLowerCase().replace(" ", "") || "generalMedicine")}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium mb-2">Medicines:</h4>
                      <div className="space-y-2">
                        {prescription.medicines?.map((medicine: any, index: number) => (
                          <div key={index} className="flex items-center space-x-2">
                            <Badge variant="secondary" className="font-normal">
                              {medicine.name || medicine}
                            </Badge>
                            {medicine.dosage && (
                              <span className="text-sm text-muted-foreground">
                                {medicine.dosage}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {prescription.notes && (
                      <div>
                        <h4 className="font-medium mb-2">Notes:</h4>
                        <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                          {prescription.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
