import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";

export default function LanguageToggle() {
  const { currentLanguage, toggleLanguage } = useLanguage();

  return (
    <Button
      variant="secondary"
      onClick={toggleLanguage}
      className="flex items-center space-x-2"
      data-testid="button-language-toggle"
    >
      <Languages className="w-4 h-4" />
      <span>{currentLanguage === "en" ? "English" : "हिंदी"}</span>
    </Button>
  );
}
