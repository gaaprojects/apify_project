import { PriceTrendChart } from "@/components/PriceTrendChart";

export default function AnalyticsPage() {
    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Market Analytics</h1>

            <div className="grid gap-6 md:grid-cols-3">
                <div className="rounded-xl border bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Average Price / m²</h3>
                    <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">128,450 CZK</p>
                    <span className="text-sm text-green-600">+2.4% last month</span>
                </div>
                <div className="rounded-xl border bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Market Temp</h3>
                    <p className="mt-2 text-3xl font-bold text-orange-600">Hot</p>
                    <span className="text-sm text-slate-600 dark:text-slate-400">High demand</span>
                </div>
                <div className="rounded-xl border bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Listings</h3>
                    <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">1,248</p>
                    <span className="text-sm text-red-600">-5.1% last month</span>
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
                <div className="rounded-xl border bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                    <h3 className="mb-6 font-semibold text-slate-900 dark:text-slate-50">Price Trends (Prague)</h3>
                    <PriceTrendChart />
                </div>
                <div className="rounded-xl border bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                    <h3 className="mb-6 font-semibold text-slate-900 dark:text-slate-50">Price Distribution</h3>
                    <div className="flex h-64 items-center justify-center text-slate-400">
                        {/* Placeholder for a histogram or bar chart */}
                        Price Distribution Chart Placeholder
                    </div>
                </div>
            </div>

            <div className="rounded-xl border bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                <h3 className="mb-6 font-semibold text-slate-900 dark:text-slate-50">Top Undervalued Districts</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b text-slate-500 dark:border-slate-800 dark:text-slate-400">
                                <th className="pb-3 font-medium">District</th>
                                <th className="pb-3 font-medium">Avg Price / m²</th>
                                <th className="pb-3 font-medium">vs Market Avg</th>
                                <th className="pb-3 font-medium">Trend</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            <tr>
                                <td className="py-3">Prague 9 - Vysočany</td>
                                <td className="py-3">105,000 CZK</td>
                                <td className="py-3 text-green-600">-15%</td>
                                <td className="py-3 text-green-600">Rising</td>
                            </tr>
                            <tr>
                                <td className="py-3">Prague 4 - Michle</td>
                                <td className="py-3">112,000 CZK</td>
                                <td className="py-3 text-green-600">-8%</td>
                                <td className="py-3 text-green-600">Stable</td>
                            </tr>
                            <tr>
                                <td className="py-3">Prague 10 - Strašnice</td>
                                <td className="py-3">118,000 CZK</td>
                                <td className="py-3 text-green-600">-5%</td>
                                <td className="py-3 text-orange-600">Rapidly Rising</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
