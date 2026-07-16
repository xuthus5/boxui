import { BoxIcon, LogOutIcon, PanelLeftIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { NavLink, Outlet, useLocation } from "react-router-dom"
import { toast } from "sonner"

import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useAuth } from "@/features/auth/auth-context"
import { footerItems, navigationGroups, primaryItems, type NavigationItem } from "@/app/navigation"

function navigationContext(pathname: string) {
  const primary = primaryItems.find((item) => item.to === pathname)
  if (primary) return { group: "", item: primary.label }
  for (const group of navigationGroups) {
    const item = group.items.find((candidate) => candidate.to === pathname)
    if (item) return { group: group.label, item: item.label }
  }
  const footer = footerItems.find((item) => item.to === pathname)
  return footer ? { group: "nav.settings", item: footer.label } : { group: "", item: "" }
}

function NavItems({ items }: { items: NavigationItem[] }) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  return (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.to}>
          <SidebarMenuButton render={<NavLink to={item.to} />} isActive={pathname === item.to} tooltip={t(item.label)}>
            <item.icon />
            <span>{t(item.label)}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}

function AppSidebar() {
  const { t } = useTranslation()
  const auth = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)
  const logout = async () => {
    setLoggingOut(true)
    try {
      await auth.logout()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
    } finally {
      setLoggingOut(false)
    }
  }
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader><SidebarMenu><SidebarMenuItem><SidebarMenuButton size="lg" render={<NavLink to="/dashboard" />} tooltip="BoxUI"><BoxIcon /><span className="flex min-w-0 flex-col items-start"><span className="truncate font-semibold">BoxUI</span><span className="truncate text-xs text-sidebar-foreground/60">sing-box control plane</span></span></SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarHeader>
      <SidebarContent>
        <SidebarGroup><SidebarGroupContent><NavItems items={primaryItems} /></SidebarGroupContent></SidebarGroup>
        {navigationGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{t(group.label)}</SidebarGroupLabel>
            <SidebarGroupContent><NavItems items={group.items} /></SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavItems items={footerItems} />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton disabled={loggingOut} onClick={() => { void logout() }}>
              {loggingOut ? <Spinner aria-hidden="true" /> : <LogOutIcon />}
              <span>{t("nav.logout")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

export function AppShell() {
  const { pathname } = useLocation()
  const { t } = useTranslation()
  const context = navigationContext(pathname)
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/75">
          <SidebarTrigger><PanelLeftIcon /></SidebarTrigger>
          <Separator orientation="vertical" className="h-5" />
          <div className="flex min-w-0 flex-col"><span className="truncate text-xs text-muted-foreground">{context.group ? t(context.group) : "BoxUI"}</span><span className="truncate text-sm font-medium">{context.item ? t(context.item) : "BoxUI"}</span></div>
        </header>
        <main className="mx-auto flex min-w-0 w-full max-w-screen-2xl flex-1 flex-col gap-4 p-4 md:p-6"><Outlet /></main>
      </SidebarInset>
    </SidebarProvider>
  )
}
