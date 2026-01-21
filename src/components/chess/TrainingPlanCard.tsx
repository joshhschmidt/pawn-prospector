import { TrainingPlan, OPENING_LABELS, OpeningStats } from '@/types/chess';
import { Target, BookOpen, CheckSquare, Crown, Copy, FileDown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useState } from 'react';

interface TrainingPlanCardProps {
  plan: TrainingPlan;
  openingStats?: OpeningStats[];
}

export const TrainingPlanCard = ({ plan, openingStats }: TrainingPlanCardProps) => {
  const [checkedItems, setCheckedItems] = useState<boolean[]>(plan.checklist.map(() => false));

  const toggleCheck = (index: number) => {
    const newChecked = [...checkedItems];
    newChecked[index] = !newChecked[index];
    setCheckedItems(newChecked);
  };

  const handleCopyPlan = () => {
    const planText = `
50-GAME TRAINING PLAN
=====================

OPENING FOCUS
-------------
As White: ${plan.white_opening}
As Black: ${plan.black_opening}

RULES TO FOLLOW
---------------
${plan.rules.map((rule, i) => `${i + 1}. ${rule}`).join('\n')}

POST-GAME CHECKLIST
-------------------
${plan.checklist.map(item => `☐ ${item}`).join('\n')}
    `.trim();
    
    navigator.clipboard.writeText(planText);
    toast.success('Training plan copied to clipboard!');
  };

  const handleExport = () => {
    const planText = `
# 50-Game Training Plan

## Opening Focus

**As White:** ${plan.white_opening}

**As Black:** ${plan.black_opening}

## Rules to Follow

${plan.rules.map((rule, i) => `${i + 1}. ${rule}`).join('\n')}

## Post-Game Checklist

${plan.checklist.map(item => `- [ ] ${item}`).join('\n')}
    `.trim();
    
    const blob = new Blob([planText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'training-plan.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Training plan exported as Markdown!');
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-card to-primary/5 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/20 p-2.5">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">50-Game Training Plan</h3>
            <p className="text-xs text-muted-foreground">Focus on these areas for your next 50 games</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleCopyPlan} className="gap-1.5">
            <Copy className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Copy</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExport} className="gap-1.5">
            <FileDown className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Opening Commitments */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            Opening Commitments
          </div>
          
          <div className="grid gap-3">
            <div className="rounded-lg bg-background/50 border border-border p-4">
              <div className="flex items-center gap-2 mb-1">
                <Crown className="h-4 w-4 text-foreground/70" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide">As White</span>
              </div>
              <p className="font-semibold text-foreground">{plan.white_opening}</p>
            </div>
            
            <div className="rounded-lg bg-background/50 border border-border p-4">
              <div className="flex items-center gap-2 mb-1">
                <Crown className="h-4 w-4 text-foreground" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide">As Black</span>
              </div>
              <p className="font-semibold text-foreground">{plan.black_opening}</p>
            </div>
          </div>
        </div>

        {/* Rules Checklist */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Target className="h-4 w-4" />
            3 Rules to Follow
          </div>
          
          <div className="space-y-2">
            {plan.rules.slice(0, 3).map((rule, index) => (
              <div 
                key={index} 
                className="flex items-start gap-3 rounded-lg bg-background/50 border border-border p-3"
              >
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">
                  {index + 1}
                </span>
                <span className="text-sm text-foreground">{rule}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Post-Game Checklist */}
      <div className="mt-6 pt-6 border-t border-border">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-4">
          <CheckSquare className="h-4 w-4" />
          Post-Game Checklist
        </div>
        
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {plan.checklist.map((item, index) => (
            <label
              key={index}
              className="flex items-center gap-3 rounded-lg bg-background/50 border border-border p-3 cursor-pointer hover:bg-accent/10 transition-colors"
            >
              <input
                type="checkbox"
                checked={checkedItems[index]}
                onChange={() => toggleCheck(index)}
                className="rounded border-border text-primary focus:ring-primary h-4 w-4"
              />
              <span className="text-sm text-muted-foreground">{item}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};
