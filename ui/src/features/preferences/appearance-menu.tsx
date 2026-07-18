import { LanguagesIcon, MonitorIcon, MoonIcon, SunIcon, SunMoonIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { usePreferences } from "@/features/preferences/preferences-provider"
import type { Language, Theme } from "@/lib/storage"

export function AppearanceMenu() {
  const { t } = useTranslation()
  const preferences = usePreferences()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={t("settings.appearanceMenu")} />}
      >
        <SunMoonIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("settings.theme")}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={preferences.theme}
            onValueChange={(value) => preferences.setTheme(String(value) as Theme)}
          >
            <DropdownMenuRadioItem value="light" closeOnClick>
              <SunIcon />
              {t("settings.light")}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark" closeOnClick>
              <MoonIcon />
              {t("settings.dark")}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system" closeOnClick>
              <MonitorIcon />
              {t("settings.system")}
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("settings.language")}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={preferences.language}
            onValueChange={(value) => preferences.setLanguage(String(value) as Language)}
          >
            <DropdownMenuRadioItem value="zh" closeOnClick>
              <LanguagesIcon />
              中文
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="en" closeOnClick>
              <LanguagesIcon />
              English
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
