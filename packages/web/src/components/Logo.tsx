interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 32, className = '' }: LogoProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 128 128" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id={`agentGrad-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#06B6D4', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#3B82F6', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      
      {/* 背景圆 */}
      <circle cx="64" cy="64" r="56" fill={`url(#agentGrad-${size})`} />
      
      {/* 中心代理节点 */}
      <circle cx="64" cy="64" r="18" fill="white" opacity="0.95"/>
      <circle cx="64" cy="64" r="11" fill={`url(#agentGrad-${size})`} />
      
      {/* 外围服务节点 */}
      <circle cx="64" cy="26" r="9" fill="white" opacity="0.92"/>
      <circle cx="95" cy="42" r="9" fill="white" opacity="0.92"/>
      <circle cx="95" cy="86" r="9" fill="white" opacity="0.92"/>
      <circle cx="64" cy="102" r="9" fill="white" opacity="0.92"/>
      <circle cx="33" cy="86" r="9" fill="white" opacity="0.92"/>
      <circle cx="33" cy="42" r="9" fill="white" opacity="0.92"/>
      
      {/* 连接线 */}
      <line x1="64" y1="64" x2="64" y2="26" stroke="white" strokeWidth="3" opacity="0.65" strokeLinecap="round"/>
      <line x1="64" y1="64" x2="95" y2="42" stroke="white" strokeWidth="3" opacity="0.65" strokeLinecap="round"/>
      <line x1="64" y1="64" x2="95" y2="86" stroke="white" strokeWidth="3" opacity="0.65" strokeLinecap="round"/>
      <line x1="64" y1="64" x2="64" y2="102" stroke="white" strokeWidth="3" opacity="0.65" strokeLinecap="round"/>
      <line x1="64" y1="64" x2="33" y2="86" stroke="white" strokeWidth="3" opacity="0.65" strokeLinecap="round"/>
      <line x1="64" y1="64" x2="33" y2="42" stroke="white" strokeWidth="3" opacity="0.65" strokeLinecap="round"/>
    </svg>
  );
}
