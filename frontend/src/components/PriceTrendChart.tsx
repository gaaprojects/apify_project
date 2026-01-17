"use client";

import { useEffect, useState } from "react";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const options = {
    responsive: true,
    plugins: {
        legend: {
            position: "top" as const,
        },
        title: {
            display: true,
            text: "Average Price Trend (CZK/m²)",
        },
    },
    scales: {
        y: {
            beginAtZero: false,
        },
    },
};

const labels = ["January", "February", "March", "April", "May", "June", "July"];

const data = {
    labels,
    datasets: [
        {
            label: "Apartments",
            data: [120000, 122000, 121000, 125000, 128000, 130000, 132000],
            borderColor: "rgb(255, 99, 132)",
            backgroundColor: "rgba(255, 99, 132, 0.5)",
        },
        {
            label: "Houses",
            data: [95000, 96000, 98000, 97000, 99000, 102000, 105000],
            borderColor: "rgb(53, 162, 235)",
            backgroundColor: "rgba(53, 162, 235, 0.5)",
        },
    ],
};

export function PriceTrendChart() {
    // Client-side only rendering check if necessary, though Chart.js usually handles it well.
    // However, to be safe with SSR in Next.js:
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) return <div className="h-[400px] w-full animate-pulse bg-slate-100 rounded-lg dark:bg-slate-800"></div>;

    return <Line options={options} data={data} />;
}
