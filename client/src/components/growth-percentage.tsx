import { useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const GrowthPercentage = ({ 
  value = 0, 
  showIcon = true,
  animated = true,
  precision = 1 
}) => {
  const [isHovered, setIsHovered] = useState(false);
    const getColorClasses = () => {
    if (value >= 0) {
      return {
        bg: 'bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-950/50',
        text: 'text-green-700 dark:text-green-400',
        border: 'border-green-200 dark:border-green-800',
        icon: 'text-green-600 dark:text-green-500'
      };
    } else {
      return {
        bg: 'bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50',
        text: 'text-red-700 dark:text-red-400',
        border: 'border-red-200 dark:border-red-800',
        icon: 'text-red-600 dark:text-red-500'
      };
    }
  };
  
  const getIcon = () => {
    if (value > 0) return TrendingUp;
    if (value < 0) return TrendingDown;
    return Minus;
  };
  
  const colors = getColorClasses();
  const sizes = {
        container: 'px-2 py-1 text-sm',
        icon: 'w-3 h-3',
        text: 'text-sm'
    };
  const Icon = getIcon();
  
  const formattedValue = Math.abs(value).toFixed(precision);
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  
  return (
    <div className="inline-flex flex-col items-start gap-1">
      <div
        className={`
          inline-flex items-center gap-2 rounded-lg border transition-all duration-200
          ${colors.bg} ${colors.border} ${sizes.container}
          ${animated ? 'transform hover:scale-105' : ''}
          ${isHovered ? 'shadow-md' : 'shadow-sm'}
        `}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {showIcon && (
          <Icon 
            className={`${sizes.icon} ${colors.icon} transition-transform duration-200 ${
              animated && isHovered ? 'rotate-12' : ''
            }`} 
          />
        )}
        
        <span className={`font-semibold ${colors.text} ${sizes.text}`}>
          {sign}{formattedValue}%
        </span>
      </div>
    </div>
  );
};

export default GrowthPercentage;