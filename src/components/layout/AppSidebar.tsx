import { 
  LayoutDashboard, 
  Upload, 
  BarChart3, 
  BookOpen, 
  Brain, 
  Target, 
  FileDown,
  ArrowLeft,
  MessageCircle,
  TrendingUp,
  Search,
  RefreshCw
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AppSidebarProps {
  username?: string;
  onBack?: () => void;
  currentView?: string;
  onViewChange?: (view: string) => void;
  onRefresh?: () => void;
}

const navItems = [
  { id: 'overview', title: 'Overview', icon: BarChart3 },
  { id: 'habits', title: 'Habits', icon: Brain },
  { id: 'recent-progress', title: 'Recent Progress', icon: TrendingUp },
  { id: 'opening-insights', title: 'Opening Insights', icon: BookOpen },
  { id: 'tactical-training', title: 'Tactical Training', icon: Target },
  { id: 'analyzer', title: 'Game Analyzer', icon: Search },
  { id: 'coaching', title: 'Coaching Conversations', icon: MessageCircle },
  { id: 'export', title: 'Export', icon: FileDown },
];

export const AppSidebar = ({ username, onBack, currentView = 'overview', onViewChange, onRefresh }: AppSidebarProps) => {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

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
      <SidebarHeader className="border-b border-border p-4 space-y-2">
        {onRefresh && (
          <Button
            variant="default"
            size="sm"
            onClick={onRefresh}
            className="w-full justify-start gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            {!collapsed && <span>Re-import Games</span>}
          </Button>
        )}
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="w-full justify-start gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {!collapsed && <span>Start Over</span>}
          </Button>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
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
