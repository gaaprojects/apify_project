"use client";

import { useEffect, useState, useCallback } from "react";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { RefreshCw, AlertCircle } from "lucide-react";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface PriceTrendData {
    date: string;
    avg_price: number;
    avg_price_per_sqm: number;
    count: number;
}

interface PriceTrendResponse {
    trends: PriceTrendData[];
    period_days: number;
}

const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: "top" as const,
            labels: {
                usePointStyle: true,
                padding: 15,
            },
        },
        title: {
            display: false,
        },
        tooltip: {
            mode: 'index' as const,
            intersect: false,
            callbacks: {
                label: function(context: { dataset: { label?: string }; parsed: { y: number } }) {
                    const label = context.dataset.label || '';
                    const value = context.parsed.y;
                    return `${label}: ${new Intl.NumberFormat('cs-CZ').format(value)} CZK`;
                }
            }
        },
    },
    scales: {
        y: {
            beginAtZero: false,
            ticks: {
                callback: function(value: number | string) {
                    return new Intl.NumberFormat('cs-CZ', {
                        notation: 'compact',
                        compactDisplay: 'short'
                    }).format(Number(value));
                }
            },
            grid: {
                color: 'rgba(0, 0, 0, 0.05)',
            },
        },
        x: {
            grid: {
                display: false,
            },
        },
    },
    interaction: {
        mode: 'nearest' as const,
        axis: 'x' as const,
        intersect: false,
    },
};

export function PriceTrendChart() {
    const [isMounted, setIsMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [chartData, setChartData] = useState<{
        labels: string[];
        datasets: {
            label: string;
            data: number[];
            borderColor: string;
            backgroundColor: string;
            fill: boolean;
            tension: number;
        }[];
    } | null>(null);

    const fetchTrendData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`${API_URL}/api/v1/analytics/price-trends?days=90`);

            if (!response.ok) {
                throw new Error('Failed to fetch price trends');
            }

            const data: PriceTrendResponse = await response.json();

            if (!data.trends || data.trends.length === 0) {
                // Use fallback data if no trends available
                setChartData({
                    labels: ['No Data'],
                    datasets: [
                        {
                            label: "Average Price",
                            data: [0],
                            borderColor: "rgb(103, 184, 188)",
                            backgroundColor: "rgba(103, 184, 188, 0.1)",
                            fill: true,
                            tension: 0.4,
                        },
                    ],
                });
                return;
            }

            // Format dates for labels
            const labels = data.trends.map(item => {
                const date = new Date(item.date);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            });

            // Extract price data
            const avgPrices = data.trends.map(item => item.avg_price);
            const avgPricePerSqm = data.trends.map(item => item.avg_price_per_sqm);

            setChartData({
                labels,
                datasets: [
                    {
                        label: "Avg Price (CZK)",
                        data: avgPrices,
                        borderColor: "rgb(103, 184, 188)",
                        backgroundColor: "rgba(103, 184, 188, 0.1)",
                        fill: true,
                        tension: 0.4,
                    },
                    {
                        label: "Price/m² (CZK)",
                        data: avgPricePerSqm,
                        borderColor: "rgb(244, 210, 95)",
                        backgroundColor: "rgba(244, 210, 95, 0.1)",
                        fill: true,
                        tension: 0.4,
                    },
                ],
            });
        } catch (err) {
            console.error('Error fetching price trends:', err);
            setError(err instanceof Error ? err.message : 'Failed to load chart data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setIsMounted(true);
        fetchTrendData();
    }, [fetchTrendData]);

    if (!isMounted) {
        return <div className="h-[300px] w-full animate-pulse bg-slate-100 rounded-lg dark:bg-slate-800"></div>;
    }

    if (loading) {
        return (
            <div className="h-[300px] w-full flex items-center justify-center bg-slate-50 rounded-lg dark:bg-slate-800/50">
                <div className="flex flex-col items-center gap-2 text-slate-500 dark:text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                    <span className="text-sm">Loading chart...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-[300px] w-full flex flex-col items-center justify-center bg-slate-50 rounded-lg dark:bg-slate-800/50 p-4">
                <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
                <p className="text-sm text-slate-600 dark:text-slate-400 text-center mb-3">{error}</p>
                <button
                    onClick={fetchTrendData}
                    className="flex items-center gap-2 text-sm text-primary hover:text-primary-dark transition-colors"
                >
                    <RefreshCw className="h-4 w-4" />
                    Retry
                </button>
            </div>
        );
    }

    if (!chartData) {
        return (
            <div className="h-[300px] w-full flex items-center justify-center bg-slate-50 rounded-lg dark:bg-slate-800/50">
                <p className="text-sm text-slate-500 dark:text-slate-400">No data available</p>
            </div>
        );
    }

    return (
        <div className="h-[300px] w-full">
            <Line options={options} data={chartData} />
        </div>
    );
}
