// One-time setup steps (PRD 7.2 v0.6, #32). The server decides each step's status and
// whether its screen exists yet (GET /app/setup); titles and links live here.
export const SETUP_STEPS = {
  business_profile: {
    title: "Business profile",
    description: "Your business name, logo, colours, contact details and disclaimer.",
    href: "/settings/profile/",
    action: "Set up business profile",
  },
  rate_card: {
    title: "Upload your rate card",
    description: "Download the template, fill in your rates and publish them.",
    href: "/rate-card/",
    action: "Upload rate card",
  },
  packages: {
    title: "Define packages",
    description: "Name your finish levels and match each one to a rate column.",
    href: "/packages/",
    action: "Define packages",
  },
  room_templates: {
    title: "Review room templates",
    description: "Check the items each room type includes and how they are measured.",
    href: "/room-templates/",
    action: "Review room templates",
  },
  adjustments: {
    title: "Set adjustments",
    description: "GST, fees, contingency, wall height and the price range.",
    href: "/packages/#adjustments",
    action: "Set adjustments",
  },
};
