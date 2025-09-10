import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { loginSchema, type LoginRequest } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Heart, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import LanguageToggle from "@/components/LanguageToggle";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginRequest>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginRequest) => {
    try {
      setIsLoading(true);
      await login(data.email, data.password);
      toast({
        title: "Success",
        description: "Logged in successfully",
      });
      setLocation("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Login failed",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <LanguageToggle />
        </div>
        
        <Card>
          <CardHeader className="space-y-1 text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Heart className="text-primary text-3xl" />
              <h1 className="text-2xl font-bold text-primary">{t("sehatSaathi")}</h1>
            </div>
            <CardTitle className="text-xl">{t("loginToAccount")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("email")}</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="your@email.com"
                          {...field}
                          data-testid="input-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("password")}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            {...field}
                            data-testid="input-password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                            data-testid="button-toggle-password"
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                  data-testid="button-login"
                >
                  {isLoading ? "Logging in..." : t("login")}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {t("dontHaveAccount")}{" "}
                <Link href="/register">
                  <Button variant="link" className="p-0 h-auto font-normal" data-testid="link-register">
                    {t("register")}
                  </Button>
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
