import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatisticsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  gradient: string;
  className?: string;
}

export function StatisticsCard({ 
  title, 
  value, 
  icon: Icon, 
  gradient, 
  className = "" 
}: StatisticsCardProps) {
  return (
    <Card className={`${gradient} text-white ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Icon className="w-6 h-6" />
            </div>
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-medium">{title}</h3>
            <p className="text-3xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 