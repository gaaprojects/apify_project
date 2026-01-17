import { cn } from "@/lib/utils";

type Assessment = "below_market" | "at_market" | "above_market";

interface PriceIndicatorProps {
    assessment: Assessment;
    className?: string;
}

const config = {
    below_market: {
        label: "Below Market",
        className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    },
    at_market: {
        label: "Fair Price",
        className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    },
    above_market: {
        label: "Above Market",
        className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    },
};

export function PriceIndicator({ assessment, className }: PriceIndicatorProps) {
    const { label, className: colorClass } = config[assessment] || config.at_market;

    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                colorClass,
                className
            )}
        >
            {label}
        </span>
    );
}
