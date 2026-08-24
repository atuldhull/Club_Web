/**
 * AdminFeaturesPage — Org admin feature management dashboard.
 *
 * Shows:
 *   - Current plan name + limits
 *   - All features grouped by category
 *   - Toggle ON/OFF for features included in plan
 *   - Lock icon + upgrade prompt for features NOT in plan
 *   - Usage stats vs plan limits
 */

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Loader from "@/components/ui/Loader";
import { orgAdmin } from "@/lib/api";
import { FEATURE_DEFINITIONS, FEATURE_CATEGORIES, FEATURES_BY_KEY } from "@/config/features";
import MonumentBackground from "@/components/backgrounds/MonumentBackground";
import { useMonument } from "@/hooks/useMonument";

export default function AdminFeaturesPage() {
  useMonument("magma");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);
  const [msg, setMsg] = useState(null);

  const fetchFeatures = async () => {
    try {
      setLoading(true);
      const res = await orgAdmin.features();
      setData(res.data);
    } catch {
      setData(null);
    }
    setLoading(false);
  };

  useEffect(() => { fetchFeatures(); }, []);

  const handleToggle = async (featureKey, currentEnabled) => {
    setToggling(featureKey);
    try {
      await orgAdmin.toggleFeature(featureKey, !currentEnabled);
      setMsg(`${FEATURES_BY_KEY[featureKey]?.label || featureKey} ${!currentEnabled ? "enabled" : "disabled"}`);
      setTimeout(() => setMsg(null), 3000);
      fetchFeatures();
    } catch (err) {
      const errMsg = err.response?.data?.error || "Failed";
      setMsg(errMsg);
      setTimeout(() => setMsg(null), 4000);
    }
    setToggling(null);
  };

  if (loading) {
    return (
      <div style={{ position: "relative" }}>
        <MonumentBackground monument="magma" intensity={0.1} />
        <div className="flex justify-center py-20"><Loader variant="orbit" size="lg" label="Loading features..." /></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ position: "relative" }}>
        <MonumentBackground monument="magma" intensity={0.1} />
        <div className="py-20 text-center text-text-dim">Failed to load feature configuration</div>
      </div>
    );
  }

  const planName = data.plan_name || "starter";
  const planDisplay = data.plan_display || planName;
  const limits = data.plan_limits || {};
  const features = data.features || {};

  return (
    <div style={{ position: "relative" }}>
      <MonumentBackground monument="magma" intensity={0.1} />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-white">Feature Management</h2>
            <p className="mt-1 text-sm text-text-muted">Toggle features for your organisation</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 font-mono text-[11px] uppercase tracking-wider text-primary">
              {planDisplay} Plan
            </span>
            <Link to="/billing">
              <Button variant="secondary" size="sm">Upgrade</Button>
            </Link>
          </div>
        </div>

        {/* Plan Limits */}
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Max Users", value: limits.max_users === -1 ? "Unlimited" : limits.max_users, color: "text-primary" },
            { label: "Max Challenges", value: limits.max_challenges === -1 ? "Unlimited" : limits.max_challenges, color: "text-secondary" },
            { label: "Max Events", value: limits.max_events === -1 ? "Unlimited" : limits.max_events, color: "text-success" },
          ].map(s => (
            <Card key={s.label} variant="glass" className="text-center !py-3">
              <p className={`math-text text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="font-mono text-[9px] uppercase tracking-wider text-text-dim">{s.label}</p>
            </Card>
          ))}
        </div>

        {/* Toast */}
        {msg && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">{msg}</motion.div>
        )}

        {/* Feature Grid by Category */}
        {FEATURE_CATEGORIES.map(category => {
          const categoryFeatures = FEATURE_DEFINITIONS.filter(f => f.category === category);
          return (
            <Card key={category} variant="solid">
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">{category}</p>
              <div className="mt-4 space-y-3">
                {categoryFeatures.map(featureDef => {
                  const key = featureDef.key;
                  const featureState = features[key];
                  const inPlan = featureDef.plans.includes(planName);
                  const isEnabled = featureState ? featureState.effective : inPlan;
                  const isToggling = toggling === key;

                  return (
                    <div key={key} className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 transition ${
                      inPlan
                        ? "border-line/10 bg-white/[0.02]"
                        : "border-warning/10 bg-warning/[0.02]"
                    }`}>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-xl flex-shrink-0">{featureDef.icon}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-white">{featureDef.label}</p>
                            {!inPlan && (
                              <span className="rounded-full bg-warning/10 px-1.5 py-0.5 font-mono text-[9px] uppercase text-warning">
                                Upgrade Required
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-text-dim truncate">{featureDef.description}</p>
                        </div>
                      </div>

                      {/* Toggle or Lock */}
                      {inPlan ? (
                        <button
                          onClick={() => handleToggle(key, isEnabled)}
                          disabled={isToggling}
                          className={`relative flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors ${
                            isEnabled ? "bg-success/30" : "bg-white/10"
                          }`}
                        >
                          <span className={`absolute h-5 w-5 rounded-full bg-white shadow transition-transform ${
                            isEnabled ? "translate-x-6" : "translate-x-1"
                          }`} />
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-lg">🔒</span>
                          <Link to="/billing">
                            <span className="font-mono text-[9px] text-warning hover:underline cursor-pointer">
                              Upgrade →
                            </span>
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </motion.div>
    </div>
  );
}
