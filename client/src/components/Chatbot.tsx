import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, MessageCircle, Thermometer, Syringe, Ambulance, HelpCircle } from "lucide-react";

interface ChatOption {
  id: string;
  labelKey: string;
  icon: any;
  response: string;
}

const chatOptions: ChatOption[] = [
  {
    id: "fever",
    labelKey: "feverInfo",
    icon: Thermometer,
    response: "For fever: Rest, drink plenty of fluids, take paracetamol as directed. If fever persists for more than 3 days or is above 103°F, consult a doctor immediately."
  },
  {
    id: "vaccination",
    labelKey: "vaccination",
    icon: Syringe,
    response: "Vaccination is important for preventing diseases. Common vaccines include COVID-19, flu, hepatitis, and tetanus. Consult your doctor for a vaccination schedule."
  },
  {
    id: "emergency",
    labelKey: "emergency",
    icon: Ambulance,
    response: "In case of emergency, call 108 for ambulance. For heart attack, stroke, severe bleeding, or difficulty breathing, seek immediate medical attention."
  },
  {
    id: "general",
    labelKey: "generalQuestions",
    icon: HelpCircle,
    response: "For general health questions, maintain a balanced diet, exercise regularly, get adequate sleep, and have regular health checkups. Consult your doctor for specific concerns."
  }
];

export default function Chatbot() {
  const { t } = useTranslation();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResponse, setShowResponse] = useState(false);

  const handleOptionClick = (optionId: string) => {
    setSelectedOption(optionId);
    setShowResponse(true);
  };

  const handleStartChat = () => {
    if (selectedOption) {
      setShowResponse(true);
    }
  };

  const resetChat = () => {
    setSelectedOption(null);
    setShowResponse(false);
  };

  const selectedOptionData = chatOptions.find(option => option.id === selectedOption);

  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="flex items-center space-x-3">
          <Bot className="text-primary text-2xl" />
          <span>{t("healthAssistant")}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {!showResponse ? (
            <>
              <div className="bg-primary/10 rounded-lg p-4">
                <p className="text-primary font-medium mb-4">
                  {t("greetingMessage")}
                </p>
                
                <div className="space-y-2">
                  {chatOptions.map((option) => {
                    const IconComponent = option.icon;
                    return (
                      <Button
                        key={option.id}
                        variant={selectedOption === option.id ? "default" : "secondary"}
                        className="w-full justify-start p-3 h-auto"
                        onClick={() => handleOptionClick(option.id)}
                        data-testid={`button-chat-option-${option.id}`}
                      >
                        <IconComponent className="w-4 h-4 mr-3" />
                        <span>{t(option.labelKey)}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>
              
              <Button 
                className="w-full" 
                onClick={handleStartChat}
                disabled={!selectedOption}
                data-testid="button-start-chat"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                {t("startChat")}
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-secondary rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  {selectedOptionData && (
                    <>
                      <selectedOptionData.icon className="w-5 h-5 text-primary" />
                      <span className="font-medium">{t(selectedOptionData.labelKey)}</span>
                    </>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedOptionData?.response}
                </p>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={resetChat}
                data-testid="button-ask-another"
              >
                Ask Another Question
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
