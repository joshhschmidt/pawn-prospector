import { TrainingPlan } from '@/types/chess';
import { Target, BookOpen, CheckSquare, Crown } from 'lucide-react';

interface TrainingPlanCardProps {
  plan: TrainingPlan;
}

export const TrainingPlanCard = ({ plan }: TrainingPlanCardProps) => {
  return (
    <div className="rounded-xl border border-accent/30 bg-gradient-to-br from-card to-accent/5 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-lg bg-accent/20 p-2">
          <Target className="h-6 w-6 text-accent" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">50-Game Training Plan</h3>
          <p className="text-sm text-muted-foreground">Focus on these areas for the next 50 games</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Opening Choices */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h4 className="font-semibold text-foreground">Opening Focus</h4>
          </div>
          
          <div className="space-y-3">
            <div className="rounded-lg bg-secondary/50 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Crown className="h-4 w-4 text-chess-white" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide">As White</span>
              </div>
              <p className="font-medium text-foreground">{plan.white_opening}</p>
            </div>
            
            <div className="rounded-lg bg-secondary/50 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Crown className="h-4 w-4 text-foreground" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide">As Black</span>
              </div>
              <p className="font-medium text-foreground">{plan.black_opening}</p>
            </div>
          </div>
        </div>

        {/* Rules */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-accent" />
            <h4 className="font-semibold text-foreground">Rules to Follow</h4>
          </div>
          
          <ul className="space-y-2">
            {plan.rules.map((rule, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <span className="text-accent font-bold">{index + 1}.</span>
                <span className="text-muted-foreground">{rule}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Post-Game Checklist */}
      <div className="mt-6 pt-6 border-t border-border">
        <div className="flex items-center gap-2 mb-4">
          <CheckSquare className="h-5 w-5 text-chess-win" />
          <h4 className="font-semibold text-foreground">Post-Game Checklist</h4>
        </div>
        
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {plan.checklist.map((item, index) => (
            <label
              key={index}
              className="flex items-center gap-3 rounded-lg bg-secondary/30 p-3 cursor-pointer hover:bg-secondary/50 transition-colors"
            >
              <input
                type="checkbox"
                className="rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm text-muted-foreground">{item}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};
