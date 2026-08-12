import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createAccount, sendPasswordReset, signInWithPassword, useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Lemonade Studio" },
      {
        name: "description",
        content:
          "Sign in or create a Lemonade Studio account to keep your Roblox projects across devices.",
      },
      { property: "og:title", content: "Sign in — Lemonade Studio" },
      {
        property: "og:description",
        content: "Keep your AI-built Roblox projects synced across every device.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { isAnonymous, email: currentEmail, loading, signOut } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const resetPassword = async () => {
    if (busy) return;
    if (!email.trim()) {
      toast.error("Enter your email first, then tap Forgot password.");
      return;
    }
    setBusy(true);
    try {
      await sendPasswordReset(email.trim());
      toast.success("Reset link sent — check your inbox.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the reset email.");
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!email.trim() || password.length < 6) {
      toast.error("Enter an email and a password of at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signin") {
        await signInWithPassword(email.trim(), password);
        toast.success("Signed in");
      } else {
        await createAccount(email.trim(), password);
        toast.success("Account created");
      }
      await navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const signedIn = !loading && !isAnonymous && currentEmail;

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-12">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        {signedIn ? (
          <Card className="space-y-4 p-6 text-center">
            <h1 className="text-lg font-semibold">You&apos;re signed in</h1>
            <p className="text-sm text-muted-foreground">{currentEmail}</p>
            <div className="flex justify-center gap-2">
              <Button asChild size="sm">
                <Link to="/dashboard">Go to projects</Link>
              </Button>
              <Button size="sm" variant="outline" onClick={() => void signOut()}>
                Sign out
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-6">
            <h1 className="text-center text-lg font-semibold">Lemonade Studio account</h1>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              Optional — an account keeps your projects on every device. Anything you built already
              comes with you.
            </p>

            <Tabs
              value={mode}
              onValueChange={(value) => setMode(value as "signin" | "signup")}
              className="mt-5"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>

              <TabsContent value={mode} className="mt-4">
                <form onSubmit={submit} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@studio.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete={mode === "signin" ? "current-password" : "new-password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="At least 6 characters"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                    {mode === "signin" ? "Sign in" : "Create account"}
                  </Button>
                  {mode === "signin" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                      disabled={busy}
                      onClick={() => void resetPassword()}
                    >
                      Forgot password?
                    </Button>
                  ) : null}
                </form>
              </TabsContent>
            </Tabs>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              <Link to="/dashboard" className="hover:text-foreground">
                Continue without an account →
              </Link>
            </p>
          </Card>
        )}
      </div>
    </main>
  );
}
