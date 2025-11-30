import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { cn } from "./utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  trend?: {
    value: number;
    label?: string;
    direction?: "up" | "down" | "neutral";
  };
  onClick?: () => void;
  className?: string;
  loading?: boolean;
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-primary",
  trend,
  onClick,
  className,
  loading = false,
}: StatsCardProps) {
  const isClickable = !!onClick;

  // Determine trend direction and colors
  const getTrendInfo = () => {
    if (!trend) return null;
    
    const direction = trend.direction || (trend.value > 0 ? "up" : trend.value < 0 ? "down" : "neutral");
    
    const config = {
      up: {
        icon: TrendingUp,
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-100 dark:bg-green-900/30",
      },
      down: {
        icon: TrendingDown,
        color: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-100 dark:bg-red-900/30",
      },
      neutral: {
        icon: Minus,
        color: "text-muted-foreground",
        bgColor: "bg-muted",
      },
    };

    return config[direction];
  };

  const trendInfo = getTrendInfo();

  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="h-4 w-24 bg-muted rounded" />
          <div className="h-4 w-4 bg-muted rounded-full" />
        </CardHeader>
        <CardContent>
          <div className="h-8 w-20 bg-muted rounded mb-2" />
          <div className="h-3 w-32 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "transition-all duration-200",
        isClickable && "cursor-pointer hover:shadow-md hover:border-primary/20 hover:bg-accent/5",
        className
      )}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => e.key === "Enter" && onClick?.() : undefined}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && (
          <div className={cn("rounded-full p-1.5 bg-muted/50", iconColor)}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tabular-nums tracking-tight">
            {typeof value === "number" ? value.toLocaleString() : value}
          </span>
          
          {/* Trend indicator */}
          {trend && trendInfo && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full",
                trendInfo.bgColor,
                trendInfo.color
              )}
            >
              <trendInfo.icon className="h-3 w-3" aria-hidden="true" />
              <span className="tabular-nums">
                {trend.value > 0 && "+"}
                {trend.value}%
              </span>
            </span>
          )}
        </div>
        
        {/* Subtitle */}
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {subtitle}
          </p>
        )}
        
        {/* Trend label */}
        {trend?.label && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {trend.label}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

