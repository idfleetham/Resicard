import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Trophy, Gift, Zap, Sparkles } from 'lucide-react';

interface FloatingPointsProps {
  points: number;
  isVisible: boolean;
  onComplete: () => void;
}

export function FloatingPoints({ points, isVisible, onComplete }: FloatingPointsProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onComplete, 2000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 0, scale: 0.8 }}
          animate={{ 
            opacity: [0, 1, 1, 0],
            y: -60,
            scale: [0.8, 1.2, 1, 1]
          }}
          exit={{ opacity: 0 }}
          transition={{ 
            duration: 2,
            times: [0, 0.2, 0.8, 1],
            ease: "easeOut"
          }}
          className="absolute pointer-events-none z-50"
          style={{ left: '50%', transform: 'translateX(-50%)' }}
        >
          <div className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-full shadow-lg shadow-green-500/50">
            <Zap className="w-4 h-4" />
            <span className="font-bold">+{points} points</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface TierUpgradeAnimationProps {
  newTier: string;
  isVisible: boolean;
  onComplete: () => void;
}

export function TierUpgradeAnimation({ newTier, isVisible, onComplete }: TierUpgradeAnimationProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onComplete, 4000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.5, ease: "backOut" }}
          className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="bg-gradient-to-br from-yellow-400 via-orange-500 to-pink-600 p-8 rounded-2xl shadow-2xl text-center relative overflow-hidden"
          >
            {/* Confetti particles */}
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                animate={{ 
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0.5],
                  x: (Math.random() - 0.5) * 300,
                  y: (Math.random() - 0.5) * 300,
                  rotate: Math.random() * 360
                }}
                transition={{ 
                  duration: 2,
                  delay: 0.5 + Math.random() * 0.5,
                  ease: "easeOut"
                }}
                className="absolute w-3 h-3 bg-white rounded-full"
                style={{
                  left: '50%',
                  top: '50%',
                }}
              />
            ))}
            
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <Trophy className="w-16 h-16 text-white mx-auto mb-4" />
            </motion.div>
            
            <motion.h2
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1, duration: 0.3 }}
              className="text-3xl font-bold text-white mb-2"
            >
              Tier Upgrade!
            </motion.h2>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.3 }}
              className="text-white/90 text-lg"
            >
              You're now <span className="font-bold uppercase">{newTier}</span>!
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface PulsingBadgeProps {
  children: React.ReactNode;
  isActive?: boolean;
  className?: string;
}

export function PulsingBadge({ children, isActive = false, className = "" }: PulsingBadgeProps) {
  return (
    <motion.div
      animate={isActive ? {
        scale: [1, 1.05, 1],
        boxShadow: [
          "0 0 0 0 rgba(59, 130, 246, 0)",
          "0 0 0 10px rgba(59, 130, 246, 0.3)",
          "0 0 0 0 rgba(59, 130, 246, 0)"
        ]
      } : {}}
      transition={{ 
        duration: 2,
        repeat: isActive ? Infinity : 0,
        ease: "easeInOut"
      }}
      className={`inline-block ${className}`}
    >
      {children}
    </motion.div>
  );
}

interface ShimmerTextProps {
  children: React.ReactNode;
  className?: string;
}

export function ShimmerText({ children, className = "" }: ShimmerTextProps) {
  return (
    <motion.div
      className={`relative overflow-hidden ${className}`}
      initial={false}
      whileHover="hover"
    >
      <motion.div
        variants={{
          hover: {
            x: ["0%", "100%"]
          }
        }}
        transition={{
          duration: 0.8,
          ease: "easeInOut"
        }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12"
        style={{ width: "100%" }}
      />
      {children}
    </motion.div>
  );
}

interface RewardClaimAnimationProps {
  isVisible: boolean;
  rewardName: string;
  onComplete: () => void;
}

export function RewardClaimAnimation({ isVisible, rewardName, onComplete }: RewardClaimAnimationProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onComplete, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center z-50 bg-black/40 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ 
              type: "spring", 
              damping: 15, 
              stiffness: 300 
            }}
            className="bg-gradient-to-br from-purple-500 to-pink-600 p-8 rounded-2xl shadow-2xl text-center relative"
          >
            <motion.div
              animate={{ 
                rotate: [0, 360],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                scale: { duration: 1, repeat: Infinity, ease: "easeInOut" }
              }}
              className="absolute -top-4 -right-4"
            >
              <Sparkles className="w-8 h-8 text-yellow-300" />
            </motion.div>
            
            <Gift className="w-16 h-16 text-white mx-auto mb-4" />
            
            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-white mb-2"
            >
              Reward Claimed!
            </motion.h2>
            
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-white/90"
            >
              {rewardName}
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface PointCounterProps {
  currentPoints: number;
  targetPoints: number;
  duration?: number;
}

export function AnimatedPointCounter({ currentPoints, targetPoints, duration = 1000 }: PointCounterProps) {
  const [displayPoints, setDisplayPoints] = useState(currentPoints);

  useEffect(() => {
    if (currentPoints !== targetPoints) {
      const startTime = Date.now();
      const startValue = displayPoints;
      const endValue = targetPoints;
      
      const animate = () => {
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = startValue + (endValue - startValue) * easeOutQuart;
        
        setDisplayPoints(Math.round(currentValue));
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      requestAnimationFrame(animate);
    }
  }, [targetPoints, duration, currentPoints, displayPoints]);

  return (
    <motion.span
      key={targetPoints}
      initial={{ scale: 1 }}
      animate={{ scale: [1, 1.2, 1] }}
      transition={{ duration: 0.5 }}
      className="font-bold tabular-nums"
    >
      {displayPoints.toLocaleString()}
    </motion.span>
  );
}