import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PawPrint } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-background">
      <div className="text-center space-y-8 px-4">
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center shadow-lg">
            <PawPrint className="h-12 w-12 text-primary-foreground" />
          </div>
        </div>
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-foreground">FlixDog Provider Portal</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Manage your dog and human experience bookings with ease
          </p>
        </div>
        <div className="flex gap-4 justify-center">
          <Button size="lg" onClick={() => navigate("/auth")}>
            Get Started
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
            Login
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
