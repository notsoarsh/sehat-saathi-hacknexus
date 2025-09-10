import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Heart, LogOut, Languages, User } from "lucide-react";

export default function Header() {
  const { user, logout } = useAuth();
  const { currentLanguage, toggleLanguage } = useLanguage();
  const { t } = useTranslation();

  return (
    <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Heart className="text-primary text-2xl" />
              <h1 className="text-xl font-bold text-primary" data-testid="logo">
                {t("sehatSaathi")}
              </h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Language Toggle */}
            <Button
              variant="secondary"
              onClick={toggleLanguage}
              className="flex items-center space-x-2"
              data-testid="button-toggle-language"
            >
              <Languages className="w-4 h-4" />
              <span>{currentLanguage === "en" ? "English" : "हिंदी"}</span>
            </Button>
            
            {/* User Profile */}
            {user && (
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                  <User className="text-primary-foreground" />
                </div>
                <div className="text-sm">
                  <p className="font-medium" data-testid="text-username">{user.name}</p>
                  <p className="text-muted-foreground" data-testid="text-role">
                    {t(user.role)}
                  </p>
                </div>
              </div>
            )}
            
            <Button
              variant="ghost"
              onClick={logout}
              className="text-muted-foreground hover:text-foreground flex items-center gap-2"
              data-testid="button-logout"
              aria-label={t('logout')}
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">{t('logout')}</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
