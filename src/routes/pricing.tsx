import { Link, createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Lemonade Studio" },
      {
        name: "description",
        content: "Free tier with daily prompts, or Pro for unlimited AI builds inside Roblox Studio.",
      },
      { property: "og:title", content: "Pricing — Lemonade Studio" },
      { property: "og:description", content: "Free and Pro plans for Lemonade Studio." },
    ],
  }),
  component: Pricing,
});

const TIERS = [
  {
    name: "Free",
    price: "$0",
    blurb: "Enough to feel the loop.",
    features: [
      "25 AI prompts per day",
      "1 connected place",
      "Script + model generation",
      "Explorer sync",
    ],
  },
  {
    name: "Pro",
    price: "$19",
    blurb: "For people shipping every week.",
    highlight: true,
    features: [
      "Unlimited prompts",
      "Unlimited projects",
      "Smart Mode + Build Mode",
      "Asset library & version history",
      "Priority AI throughput",
    ],
  },
];

function Pricing() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <Logo className="mb-10" />
      <h1 className="text-3xl font-bold tracking-tight">Pricing</h1>
      <p className="mt-2 text-muted-foreground">Start free. Upgrade when the loop clicks.</p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {TIERS.map((tier) => (
          <Card
            key={tier.name}
            className={`p-6 ${tier.highlight ? "border-primary/50 bg-surface/70" : "bg-surface/40"}`}
          >
            <h2 className="text-lg font-semibold">{tier.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{tier.blurb}</p>
            <p className="mt-4 text-3xl font-bold">
              {tier.price}
              <span className="text-base font-normal text-muted-foreground">/mo</span>
            </p>
            <ul className="mt-5 space-y-2 text-sm">
              {tier.features.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button asChild className="mt-6 w-full" variant={tier.highlight ? "default" : "outline"}>
              <Link to="/auth">Get started</Link>
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
