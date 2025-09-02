import React, { createContext, useContext } from 'react';
import { useRewardAnimations } from '@/hooks/use-reward-animations';
import { 
  FloatingPoints, 
  TierUpgradeAnimation, 
  RewardClaimAnimation 
} from './reward-animations';

interface RewardAnimationContextType {
  triggerPointsEarned: (points: number) => void;
  triggerTierUpgrade: (newTier: string) => void;
  triggerRewardClaim: (rewardName: string) => void;
}

const RewardAnimationContext = createContext<RewardAnimationContextType | null>(null);

export function useRewardAnimationContext() {
  const context = useContext(RewardAnimationContext);
  if (!context) {
    throw new Error('useRewardAnimationContext must be used within RewardAnimationProvider');
  }
  return context;
}

interface RewardAnimationProviderProps {
  children: React.ReactNode;
}

export function RewardAnimationProvider({ children }: RewardAnimationProviderProps) {
  const {
    animations,
    triggerPointsEarned,
    triggerTierUpgrade,
    triggerRewardClaim,
    completeAnimation
  } = useRewardAnimations();

  return (
    <RewardAnimationContext.Provider value={{
      triggerPointsEarned,
      triggerTierUpgrade,
      triggerRewardClaim
    }}>
      {children}
      
      {/* Render all active animations */}
      {animations.map(animation => {
        switch (animation.type) {
          case 'points':
            return (
              <FloatingPoints
                key={animation.id}
                points={animation.data.points}
                isVisible={animation.isVisible}
                onComplete={() => completeAnimation(animation.id)}
              />
            );
          
          case 'tier-upgrade':
            return (
              <TierUpgradeAnimation
                key={animation.id}
                newTier={animation.data.newTier}
                isVisible={animation.isVisible}
                onComplete={() => completeAnimation(animation.id)}
              />
            );
          
          case 'reward-claim':
            return (
              <RewardClaimAnimation
                key={animation.id}
                rewardName={animation.data.rewardName}
                isVisible={animation.isVisible}
                onComplete={() => completeAnimation(animation.id)}
              />
            );
          
          default:
            return null;
        }
      })}
    </RewardAnimationContext.Provider>
  );
}