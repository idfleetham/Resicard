import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MerchantSettings from "./merchant-settings";
import TeamManagement from "./team-management";
import PlanTab from "./plan-tab";
import { SUBTAB_LIST, SUBTAB_TRIGGER, TabScroller } from "./portal-ui";

/**
 * Settings, Team and Plan were three tabs that between them held one idea: the
 * things an owner sets once and then leaves alone. Folding them in here is what
 * gets the main row down to seven pills and onto a single line.
 */

export const SETTINGS_SECTIONS = [
  { key: "business", label: "Business" },
  { key: "team", label: "Team" },
  { key: "plan", label: "Plan" },
] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number]["key"];

export function isSettingsSection(value: string | null): value is SettingsSection {
  return SETTINGS_SECTIONS.some((s) => s.key === value);
}

export default function SettingsTab({
  section,
  onSectionChange,
}: {
  section: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
}) {
  return (
    <Tabs
      value={section}
      onValueChange={(v) => { if (isSettingsSection(v)) onSectionChange(v); }}
    >
      <TabScroller>
        <TabsList className={SUBTAB_LIST}>
          {SETTINGS_SECTIONS.map((s) => (
            <TabsTrigger key={s.key} value={s.key} className={SUBTAB_TRIGGER}>
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </TabScroller>

      <TabsContent value="business" className="mt-0"><MerchantSettings /></TabsContent>
      <TabsContent value="team" className="mt-0"><TeamManagement /></TabsContent>
      <TabsContent value="plan" className="mt-0"><PlanTab /></TabsContent>
    </Tabs>
  );
}
