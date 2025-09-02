import { useState, useCallback } from 'react';

interface RewardAnimation {
  id: string;
  type: 'points' | 'tier-upgrade' | 'reward-claim';
  data: any;
  isVisible: boolean;
}

export function useRewardAnimations() {
  const [animations, setAnimations] = useState<RewardAnimation[]>([]);

  const triggerPointsEarned = useCallback((points: number) => {
    const id = `points-${Date.now()}`;
    const animation: RewardAnimation = {
      id,
      type: 'points',
      data: { points },
      isVisible: true
    };
    
    setAnimations(prev => [...prev, animation]);
    
    // Auto-remove after animation completes
    setTimeout(() => {
      setAnimations(prev => prev.filter(a => a.id !== id));
    }, 2500);
  }, []);

  const triggerTierUpgrade = useCallback((newTier: string) => {
    const id = `tier-${Date.now()}`;
    const animation: RewardAnimation = {
      id,
      type: 'tier-upgrade',
      data: { newTier },
      isVisible: true
    };
    
    setAnimations(prev => [...prev, animation]);
    
    // Auto-remove after animation completes
    setTimeout(() => {
      setAnimations(prev => prev.filter(a => a.id !== id));
    }, 4500);
  }, []);

  const triggerRewardClaim = useCallback((rewardName: string) => {
    const id = `reward-${Date.now()}`;
    const animation: RewardAnimation = {
      id,
      type: 'reward-claim',
      data: { rewardName },
      isVisible: true
    };
    
    setAnimations(prev => [...prev, animation]);
    
    // Auto-remove after animation completes
    setTimeout(() => {
      setAnimations(prev => prev.filter(a => a.id !== id));
    }, 3500);
  }, []);

  const completeAnimation = useCallback((id: string) => {
    setAnimations(prev => 
      prev.map(anim => 
        anim.id === id ? { ...anim, isVisible: false } : anim
      )
    );
    
    // Remove from array after fade out
    setTimeout(() => {
      setAnimations(prev => prev.filter(a => a.id !== id));
    }, 500);
  }, []);

  return {
    animations,
    triggerPointsEarned,
    triggerTierUpgrade,
    triggerRewardClaim,
    completeAnimation
  };
}