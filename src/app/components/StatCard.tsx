import { Card, CardContent } from "./ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "./ui/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconColor?: string;
}

export function StatCard({ 
  title, 
  value, 
  change, 
  changeType = "neutral",
  icon: Icon,
  iconColor = "bg-blue-500"
}: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs text-gray-600 sm:text-sm">{title}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900 sm:text-3xl">{value}</p>
            {change && (
              <p className={cn(
                "mt-2 text-xs sm:text-sm",
                changeType === "positive" && "text-green-600",
                changeType === "negative" && "text-red-600",
                changeType === "neutral" && "text-gray-600"
              )}>
                {change}
              </p>
            )}
          </div>
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg sm:h-12 sm:w-12",
            iconColor
          )}>
            <Icon className="h-5 w-5 text-white sm:h-6 sm:w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
