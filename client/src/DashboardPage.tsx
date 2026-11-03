import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchDashboard } from "./api";
import type { DashboardStats } from "./api";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setStats(await fetchDashboard());
    } catch {
      setError("Your dashboard couldn’t be reached just now. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  return (
    <section className="journal-content dashboard-content" aria-labelledby="dashboard-heading">
      <p className="journal-eyebrow">Your collection at a glance</p>
      <h1 id="dashboard-heading">A taste of your table.</h1>
      <p className="journal-lede">
        A few simple numbers from every place you’ve saved, regardless of your list filters.
      </p>

      {loading ? (
        <div className="dashboard-loading" role="status" aria-live="polite" aria-busy="true">
          Gathering your collection…
        </div>
      ) : error ? (
        <div className="journal-state error-state dashboard-error" role="alert">
          <span className="state-stamp" aria-hidden="true">!</span>
          <h2>A small pause.</h2>
          <p>{error}</p>
          <button className="journal-secondary-button" type="button" onClick={() => void loadDashboard()}>
            Try again
          </button>
        </div>
      ) : stats ? (
        <>
          <div className="dashboard-metrics" aria-label="Your restaurant totals">
            <article className="dashboard-metric">
              <span className="dashboard-metric-label">Saved</span>
              <strong>{stats.totalSaved}</strong>
              <span className="dashboard-metric-detail">
                {stats.totalSaved === 1 ? "restaurant" : "restaurants"}
              </span>
            </article>
            <article className="dashboard-metric">
              <span className="dashboard-metric-label">Visited</span>
              <strong>{stats.visitedCount}</strong>
              <span className="dashboard-metric-detail">
                {stats.visitedCount === 1 ? "restaurant" : "restaurants"}
              </span>
            </article>
            <article className="dashboard-metric">
              <span className="dashboard-metric-label">Average rating</span>
              {stats.averageRating === null ? (
                <strong className="dashboard-no-rating">No ratings yet</strong>
              ) : (
                <strong>{stats.averageRating.toFixed(1)}<span className="dashboard-out-of"> / 5</span></strong>
              )}
              <span className="dashboard-metric-detail">Rated places only</span>
            </article>
          </div>

          <section className="dashboard-chart-section" aria-labelledby="cuisine-chart-heading">
            <div className="dashboard-chart-heading">
              <div>
                <p className="journal-eyebrow">Your saved places</p>
                <h2 id="cuisine-chart-heading">Cuisine count</h2>
              </div>
              <span className="dashboard-chart-note">Restaurants by cuisine</span>
            </div>
            {stats.cuisineCounts.length === 0 ? (
              <p className="dashboard-chart-empty">Cuisine counts will appear after you save a restaurant.</p>
            ) : (
              <>
                <div className="dashboard-chart" aria-label="Restaurant count by cuisine bar chart">
                  <ResponsiveContainer width="100%" height={Math.max(260, stats.cuisineCounts.length * 46)}>
                    <BarChart
                      accessibilityLayer
                      data={stats.cuisineCounts}
                      layout="vertical"
                      margin={{ top: 8, right: 24, bottom: 8, left: 4 }}
                    >
                      <CartesianGrid horizontal={false} stroke="#eaded2" />
                      <XAxis
                        type="number"
                        allowDecimals={false}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#776b62", fontSize: 12 }}
                      />
                      <YAxis
                        type="category"
                        dataKey="cuisineName"
                        width={118}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#493f38", fontSize: 12 }}
                      />
                      <Tooltip
                        cursor={{ fill: "#f5e9dc" }}
                        formatter={(value) => [`${value} ${value === 1 ? "restaurant" : "restaurants"}`, "Saved"]}
                      />
                      <Bar dataKey="count" name="Restaurants" fill="#C2412D" radius={[0, 5, 5, 0]} maxBarSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <ul className="dashboard-chart-equivalent" aria-label="Cuisine counts, text equivalent">
                  {stats.cuisineCounts.map((cuisine) => (
                    <li key={cuisine.cuisineId}>
                      <span>{cuisine.cuisineName}</span>
                      <strong>{cuisine.count}</strong>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </>
      ) : null}
    </section>
  );
}
