import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useI18n';
import { 
  LayoutGrid, 
  Hash,
  Search,
  Award,
  Flame,
  Clock,
  Heart,
  Globe,
  MapPin,
  Zap,
  Database,
  Sparkles,
  Banknote,
  MessageSquare,
  Calendar,
  Gamepad2,
  BookOpen,
  Image as ImageIcon,
} from 'lucide-react';

interface CategoryTag {
  key: string;
  name: string;
  value: string;
  total: number;
}

interface MarketSidebarProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  categories: CategoryTag[];
  specialCategories?: CategoryTag[];
  totalCount: number;
  className?: string;
}

export function MarketSidebar({ 
  selectedCategory, 
  onSelectCategory, 
  categories,
  specialCategories = [],
  totalCount,
  className
}: MarketSidebarProps) {
  const { t } = useTranslation();
  
  const iconMap: Record<string, any> = {
    all: LayoutGrid,
    platform_picks: Award,
    most_popular: Flame,
    latest_updates: Clock,
    favorites: Heart
  };

  const mainNavItems = specialCategories.length > 0
    ? specialCategories.map(cat => ({
        id: cat.key,
        label: cat.name,
        icon: iconMap[cat.key] || LayoutGrid,
        count: cat.total
      }))
    : [
        { id: 'all', label: t('market.category.all'), icon: LayoutGrid, count: totalCount },
      ];

  const getCategoryIcon = (name: string, key: string) => {
    // 优先匹配 key
    if (key.includes('search')) return Search;
    if (key.includes('browse')) return Globe;
    if (key.includes('location')) return MapPin;
    if (key.includes('dev')) return Zap;
    if (key.includes('data')) return Database;
    if (key.includes('content') || key.includes('gen')) return Sparkles;
    if (key.includes('finance')) return Banknote;
    if (key.includes('chat') || key.includes('social')) return MessageSquare;
    if (key.includes('calendar') || key.includes('time')) return Calendar;
    if (key.includes('game') || key.includes('fun')) return Gamepad2;
    if (key.includes('knowledge') || key.includes('learn')) return BookOpen;
    if (key.includes('image') || key.includes('media')) return ImageIcon;

     const lowerName = name.toLowerCase();
    // 其次匹配 name (中文)
    if (name.includes('搜索') || lowerName.includes('search')) return Search;
    if (name.includes('浏览') || lowerName.includes('browse')) return Globe;
    if (name.includes('位置') || lowerName.includes('location')) return MapPin;
    if (name.includes('开发') || lowerName.includes('dev')) return Zap;
    if (name.includes('数据') || lowerName.includes('data')) return Database;
    if (name.includes('内容') || name.includes('生成') || lowerName.includes('content')) return Sparkles;
    if (name.includes('金融') || lowerName.includes('financial')) return Banknote;
    if (name.includes('交流') || name.includes('协作') || lowerName.includes('communication')) return MessageSquare;
    if (name.includes('日程') || name.includes('时间') || lowerName.includes('schedule')) return Calendar;
    if (name.includes('娱乐') || lowerName.includes('entertainment')) return Gamepad2;
    if (name.includes('知识') || name.includes('图谱') || lowerName.includes('knowledge')) return BookOpen;
    if (name.includes('图像') || name.includes('图片') || lowerName.includes('image')) return ImageIcon;

    return Hash; // 默认图标
  };

  return (
    <aside className={cn("w-64 flex-shrink-0 flex flex-col gap-8 py-2", className)}>
      {/* Main Navigation */}
      <div className="space-y-1">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = selectedCategory === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectCategory(item.id)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group cursor-pointer",
                isActive
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-lg shadow-gray-200/50 dark:shadow-none"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn(
                  "w-4 h-4 transition-colors",
                  isActive ? "text-white dark:text-gray-900" : "text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300"
                )} />
                <span>{item.label}</span>
              </div>
              <span className={cn(
                "text-xs font-mono",
                isActive 
                  ? "text-gray-300 dark:text-gray-600" 
                  : "text-gray-400 group-hover:text-gray-500"
              )}>
                {item.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Functional Categories */}
      <div className="space-y-3">
        <h3 className="px-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          {t('market.category.function')}
        </h3>
        <div className="space-y-1">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.key;
            const Icon = getCategoryIcon(cat.name, cat.key);
            return (
              <button
                key={cat.key}
                onClick={() => onSelectCategory(cat.key)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm transition-all duration-200 group cursor-pointer",
                  isActive
                    ? "bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400 font-medium"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn(
                    "w-3.5 h-3.5",
                    isActive ? "text-primary-500" : "text-gray-400 group-hover:text-gray-500"
                  )} />
                  <span className="truncate">{cat.name}</span>
                </div>
                <span className={cn(
                  "text-xs font-mono transition-colors",
                  isActive ? "text-primary-400/80" : "text-gray-400 group-hover:text-gray-500"
                )}>
                  {cat.total}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
