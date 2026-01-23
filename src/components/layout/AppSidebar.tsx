import { 
  LayoutDashboard, 
  Upload, 
  BarChart3, 
  BookOpen, 
  Brain, 
  Target, 
  FileDown,
  ArrowLeft,
  ChevronDown,
  MessageCircle,
  TrendingUp
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useState } from 'react';

interface AppSidebarProps {
  username?: string;
  onBack?: () => void;
  currentView?: string;
  onViewChange?: (view: string) => void;
}

const mainNavItems = [
  { id: 'dashboard', title: 'Dashboard', icon: LayoutDashboard },
  { id: 'import', title: 'Import & Data', icon: Upload },
];

const analysisNavItems = [
  { id: 'overview', title: 'Overview', icon: BarChart3 },
  { id: 'recent-progress', title: 'Recent Progress', icon: TrendingUp },
  { id: 'habits', title: 'Habits', icon: Brain },
  { id: 'training', title: 'Opening Training', icon: Target },
  { id: 'coaching', title: 'Coaching Conversations', icon: MessageCircle },
];

const otherNavItems = [
  { id: 'export', title: 'Export', icon: FileDown },
];

export const AppSidebar = ({ username, onBack, currentView = 'overview', onViewChange }: AppSidebarProps) => {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const [analysisOpen, setAnalysisOpen] = useState(true);

  const handleNavClick = (id: string) => {
    onViewChange?.(id);
  };

  const NavItem = ({ item, isActive }: { item: { id: string; title: string; icon: any }; isActive: boolean }) => (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={() => handleNavClick(item.id)}
        className={cn(
          'cursor-pointer transition-colors',
          isActive && 'bg-primary/10 text-primary font-medium border-l-2 border-primary'
        )}
      >
        <item.icon className="h-4 w-4" />
        {!collapsed && <span>{item.title}</span>}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="border-b border-border p-4">
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="w-full justify-start gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {!collapsed && <span>Back to Import</span>}
          </Button>
        )}
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <NavItem 
                  key={item.id} 
                  item={item} 
                  isActive={currentView === item.id} 
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Analysis Section - Collapsible */}
        <SidebarGroup>
          <Collapsible open={analysisOpen} onOpenChange={setAnalysisOpen}>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer hover:bg-accent/50 rounded-md px-2 py-1 flex items-center justify-between">
                {!collapsed && <span>Analysis</span>}
                {!collapsed && (
                  <ChevronDown className={cn(
                    "h-4 w-4 transition-transform",
                    analysisOpen && "rotate-180"
                  )} />
                )}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {analysisNavItems.map((item) => (
                    <NavItem 
                      key={item.id} 
                      item={item} 
                      isActive={currentView === item.id} 
                    />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* Other Section */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {otherNavItems.map((item) => (
                <NavItem 
                  key={item.id} 
                  item={item} 
                  isActive={currentView === item.id} 
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-4">
        {!collapsed && username && (
          <div className="text-xs text-muted-foreground">
            <span className="text-foreground font-medium">{username}</span>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};
