import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Email non valida").max(255, "Email troppo lunga"),
  password: z.string().min(6, "La password deve essere di almeno 6 caratteri").max(100, "Password troppo lunga"),
});

const signupSchema = z.object({
  email: z.string().email("Email non valida").max(255, "Email troppo lunga"),
  password: z.string()
    .min(8, "La password deve essere di almeno 8 caratteri")
    .max(100, "Password troppo lunga")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "La password deve contenere maiuscole, minuscole e numeri"),
  signupCode: z.string()
    .length(8, "Il codice deve essere di 8 caratteri")
    .regex(/^[A-Z0-9]+$/, "Il codice deve contenere solo lettere maiuscole e numeri"),
  companyName: z.string()
    .min(1, "Il nome dell'azienda è obbligatorio")
    .max(200, "Il nome dell'azienda è troppo lungo")
    .trim(),
  contactName: z.string()
    .min(1, "Il nome del contatto è obbligatorio")
    .max(100, "Il nome del contatto è troppo lungo")
    .trim(),
});

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [signupCode, setSignupCode] = useState("");

  const checkUserRoleAndRedirect = async (userId: string) => {
    const { data: adminRole } = await supabase
      .from('user_role')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (adminRole) {
      navigate("/admin");
    } else {
      navigate("/dashboard");
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        checkUserRoleAndRedirect(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        // Defer the role check to avoid auth deadlock
        setTimeout(() => {
          checkUserRoleAndRedirect(session.user.id);
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input
      const validatedData = loginSchema.parse({
        email: loginEmail,
        password: loginPassword,
      });

      const { error } = await supabase.auth.signInWithPassword({
        email: validatedData.email,
        password: validatedData.password,
      });

      if (error) {
        toast({
          title: "Login fallito",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Errore di validazione",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Errore",
          description: "Si è verificato un errore durante il login.",
          variant: "destructive",
        });
      }
    }

    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input
      const validatedData = signupSchema.parse({
        email: signupEmail,
        password: signupPassword,
        signupCode: signupCode.toUpperCase(),
        companyName: companyName,
        contactName: contactName,
      });

      // Signup code validation is now handled server-side in validate_signup_code RPC
      // Proceed with signup
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
        options: {
          data: {
            company_name: validatedData.companyName,
            contact_name: validatedData.contactName,
          },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (authError) {
        toast({
          title: "Registrazione fallita",
          description: authError.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Validate and consume the signup code
      if (authData.user) {
        const { data: validateData, error: validateError } = await supabase.rpc(
          'validate_signup_code',
          { _code: validatedData.signupCode, _user_id: authData.user.id }
        );

        if (validateError || !validateData) {
          toast({
            title: "Errore",
            description: "Errore durante la validazione del codice.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        toast({
          title: "Account creato",
          description: "Puoi ora accedere con le tue credenziali.",
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Errore di validazione",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Errore",
          description: "Si è verificato un errore durante la registrazione.",
          variant: "destructive",
        });
      }
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold text-center">FlixDog Provider Portal</CardTitle>
          <CardDescription className="text-center">
            Access your bookings and manage your experiences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="your@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Logging in..." : "Login"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-code">Codice di Registrazione</Label>
                  <Input
                    id="signup-code"
                    type="text"
                    placeholder="Inserisci il codice"
                    value={signupCode}
                    onChange={(e) => setSignupCode(e.target.value.toUpperCase())}
                    required
                    maxLength={8}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-company">Nome Azienda</Label>
                  <Input
                    id="signup-company"
                    type="text"
                    placeholder="Nome della tua azienda"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-contact">Nome Contatto</Label>
                  <Input
                    id="signup-contact"
                    type="text"
                    placeholder="Il tuo nome"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="tua@email.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creazione account..." : "Registrati"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
