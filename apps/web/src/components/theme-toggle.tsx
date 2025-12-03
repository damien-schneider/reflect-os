import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const themes = ["light", "dark", "system"] as const;
const themeIcons = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} as const;
const themeLabels = {
  light: "Light",
  dark: "Dark",
  system: "System",
} as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const currentTheme = (theme ?? "system") as keyof typeof themeIcons;
  const Icon = themeIcons[currentTheme] ?? Monitor;
  const label = themeLabels[currentTheme] ?? "System";

  const cycleTheme = () => {
    const currentIndex = themes.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button onClick={cycleTheme} size="icon" variant="ghost">
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
