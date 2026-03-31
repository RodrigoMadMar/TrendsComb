"use client";

import { useState, useCallback } from "react";
import type { XTrend } from "./api/scan-x/route";
import type { GoogleTrendsResult } from "./api/scan-trends/route";
import type { NewsItem } from "./api/scan-news/route";
import type { CompetitorData } from "./api/competitors/route";
import type { BrandPulseResult } from "./api/brand-pulse/route";
import type { ScoredTrend } from "./api/score/route";
import type { InstagramData } from "./api/instagram/route";
import type { TikTokData } from "./api/tiktok/route";
import type { MetaAdsData } from "./api/meta-ads/route";

// ─── Types ───────────────────────────────────────────────────────────────────
type Status = "idle" | "loading" | "done" | "error";
type Tab = "tendencias" | "competencia";

interface ModuleState<T> {
  status: Status;
  data: T | null;
  error?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div
      style={{
        width: 16,
        height: 16,
        border: "2px solid rgba(255,255,255,0.15)",
        borderTop: "2px solid var(--accent)",
        borderRadius: "50%",
      }}
      className="animate-spin"
    />
  );
}

function StatusBadge({ status }: { status: Status }) {
  if (status === "idle") return null;
  if (status === "loading")
    return (
      <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-dim)", fontSize: 12 }}>
        <Spinner /> Escaneando...
      </span>
    );
  if (status === "done")
    return (
      <span style={{ color: "var(--success)", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)", display: "inline-block" }} />
        Actualizado
      </span>
    );
  return <span style={{ color: "var(--danger)", fontSize: 12 }}>Error</span>;
}

function ScanButton({
  onClick,
  loading,
  label = "Escanear",
}: {
  onClick: () => void;
  loading: boolean;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        background: loading ? "rgba(245,158,11,0.15)" : "var(--accent)",
        color: loading ? "var(--accent)" : "#000",
        border: loading ? "1px solid var(--accent)" : "none",
        borderRadius: 8,
        padding: "6px 14px",
        fontSize: 12,
        fontWeight: 600,
        cursor: loading ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "inherit",
        transition: "all 0.2s",
      }}
    >
      {loading && <Spinner />}
      {label}
    </button>
  );
}

function ModuleCard({
  title,
  icon,
  status,
  onScan,
  children,
}: {
  title: string;
  icon: string;
  status: Status;
  onScan: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>{icon}</span>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{title}</span>
          <StatusBadge status={status} />
        </div>
        <ScanButton onClick={onScan} loading={status === "loading"} />
      </div>
      {/* Body */}
      <div style={{ padding: 20, flexGrow: 1 }}>{children}</div>
    </div>
  );
}

// ─── Module: X Trends ────────────────────────────────────────────────────────
function categoryColor(cat: string): string {
  const map: Record<string, string> = {
    Precio: "#F59E0B",
    Reclamo: "#EF4444",
    Competencia: "#8B5CF6",
    Regulatorio: "#3B82F6",
    General: "#6B7280",
  };
  return map[cat] || "#6B7280";
}

function sentimentIcon(s: string) {
  if (s === "positivo") return "↑";
  if (s === "negativo") return "↓";
  return "→";
}

function XTrendsPanel({ data }: { data: XTrend[] | null }) {
  if (!data) return <EmptyState text="Presiona Escanear para obtener tendencias de X." />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {data.map((t, i) => (
        <div
          key={i}
          className="animate-fadeIn"
          style={{
            background: "var(--surface2)",
            borderRadius: 10,
            padding: "12px 14px",
            borderLeft: `3px solid ${categoryColor(t.category)}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontFamily: "JetBrains Mono, monospace", color: categoryColor(t.category), fontSize: 11, fontWeight: 600 }}>
              {t.category}
            </span>
            <span style={{ fontSize: 11, color: t.sentiment === "positivo" ? "var(--success)" : t.sentiment === "negativo" ? "var(--danger)" : "var(--text-dim)" }}>
              {sentimentIcon(t.sentiment)} {t.sentiment}
            </span>
          </div>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{t.title}</div>
          <div style={{ color: "var(--text-dim)", fontSize: 12 }}>{t.summary}</div>
          {(t as XTrend & { commercialAngle?: string }).commercialAngle && (
            <div style={{ color: "var(--accent)", fontSize: 11, marginTop: 6, fontStyle: "italic" }}>
              💡 {(t as XTrend & { commercialAngle?: string }).commercialAngle}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Module: Google Trends ────────────────────────────────────────────────────
function GoogleTrendsPanel({ data }: { data: GoogleTrendsResult | null }) {
  if (!data) return <EmptyState text="Presiona Escanear para obtener datos de Google Trends." />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
        {data.source} · {data.period}
      </div>
      {data.trends.map((t, i) => (
        <div key={i} className="animate-fadeIn">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{t.keyword}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, color: t.trend === "up" ? "var(--success)" : t.trend === "down" ? "var(--danger)" : "var(--text-dim)" }}>
                {t.trend === "up" ? "↑" : t.trend === "down" ? "↓" : "→"}
              </span>
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>
                {t.interest}
              </span>
            </span>
          </div>
          <div
            style={{
              height: 6,
              background: "var(--surface2)",
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${t.interest}%`,
                height: "100%",
                background: `linear-gradient(90deg, var(--accent), var(--accent-dim))`,
                borderRadius: 3,
                transition: "width 0.8s ease",
              }}
            />
          </div>
          {t.relatedQueries && t.relatedQueries.length > 0 && (
            <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
              {t.relatedQueries.slice(0, 3).map((q, qi) => (
                <span key={qi} style={{ fontSize: 10, background: "var(--surface2)", padding: "2px 7px", borderRadius: 20, color: "var(--text-dim)" }}>
                  {q}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Module: News ─────────────────────────────────────────────────────────────
function urgencyColor(u: string): string {
  if (u === "alta") return "#EF4444";
  if (u === "media") return "#F59E0B";
  return "#6B7280";
}

function NewsPanel({ data }: { data: NewsItem[] | null }) {
  if (!data) return <EmptyState text="Presiona Escanear para obtener noticias regulatorias." />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {data.map((n, i) => (
        <div
          key={i}
          className="animate-fadeIn"
          style={{
            background: "var(--surface2)",
            borderRadius: 10,
            padding: "12px 14px",
            borderLeft: `3px solid ${urgencyColor(n.urgency)}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontFamily: "JetBrains Mono, monospace", color: urgencyColor(n.urgency), fontSize: 11, fontWeight: 600 }}>
              {n.category}
            </span>
            <span style={{ fontSize: 10, color: "var(--text-muted)", background: "var(--surface)", padding: "1px 6px", borderRadius: 20 }}>
              urgencia {n.urgency}
            </span>
          </div>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{n.title}</div>
          <div style={{ color: "var(--text-dim)", fontSize: 12 }}>{n.summary}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Module: Brand Pulse ──────────────────────────────────────────────────────
function BrandPulsePanel({ data }: { data: BrandPulseResult | null }) {
  if (!data) return <EmptyState text="Presiona Escanear para ver el pulso de marca." />;
  const max = Math.max(...data.brands.map((b) => b.interest));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
        {data.source} · {data.period}
      </div>
      {data.brands.map((b, i) => (
        <div key={i} className="animate-fadeIn">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: b.brand === "Copec" ? 700 : 500 }}>{b.brand}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, color: b.trend === "up" ? "var(--success)" : b.trend === "down" ? "var(--danger)" : "var(--text-dim)" }}>
                {b.trend === "up" ? "↑" : b.trend === "down" ? "↓" : "→"}
              </span>
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, fontWeight: 700, color: b.color }}>
                {b.interest}
              </span>
            </span>
          </div>
          <div style={{ height: 8, background: "var(--surface2)", borderRadius: 4, overflow: "hidden" }}>
            <div
              style={{
                width: `${(b.interest / max) * 100}%`,
                height: "100%",
                background: b.color,
                borderRadius: 4,
                transition: "width 0.8s ease",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Scored Trends ────────────────────────────────────────────────────────────
function typeColor(type: string): string {
  const map: Record<string, string> = {
    PRECIO: "#F59E0B",
    REGULATORIO: "#3B82F6",
    COMPETENCIA: "#8B5CF6",
    ESTACIONAL: "#10B981",
    VIRAL: "#EC4899",
  };
  return map[type] || "#6B7280";
}

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: "var(--surface2)", borderRadius: 2 }}>
        <div style={{ width: `${value * 10}%`, height: "100%", background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 700, color, minWidth: 16 }}>
        {value}
      </span>
    </div>
  );
}

function effortLabel(e: string): string {
  if (e === "S") return "Esfuerzo S — Rápido";
  if (e === "M") return "Esfuerzo M — Medio";
  return "Esfuerzo L — Grande";
}

function effortColor(e: string): string {
  if (e === "S") return "var(--success)";
  if (e === "M") return "var(--warning)";
  return "var(--danger)";
}

function ScoredTrendCard({ trend, index }: { trend: ScoredTrend; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const avg = Math.round((trend.scores.relevance + trend.scores.virality + trend.scores.brandFit) / 3);
  const color = typeColor(trend.type);

  return (
    <div
      className="animate-fadeIn"
      style={{
        background: "var(--surface)",
        border: `1px solid var(--border)`,
        borderRadius: 16,
        overflow: "hidden",
        animationDelay: `${index * 0.05}s`,
        opacity: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          borderLeft: `4px solid ${color}`,
          cursor: "pointer",
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span
                style={{
                  background: `${color}22`,
                  color,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 20,
                  fontFamily: "JetBrains Mono, monospace",
                  letterSpacing: "0.05em",
                }}
              >
                {trend.type}
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: effortColor(trend.effort),
                  background: `${effortColor(trend.effort)}22`,
                  padding: "2px 8px",
                  borderRadius: 20,
                }}
              >
                {effortLabel(trend.effort)}
              </span>
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{trend.trend}</div>
            <div style={{ color: "var(--text-dim)", fontSize: 12 }}>{trend.window}</div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 28, fontWeight: 800, color, fontFamily: "JetBrains Mono, monospace" }}>
              {avg}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>score</div>
          </div>
        </div>

        {/* Score bars */}
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, color: "var(--text-dim)", width: 70, flexShrink: 0 }}>Relevancia</span>
            <div style={{ flex: 1 }}><ScoreBar value={trend.scores.relevance} color={color} /></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, color: "var(--text-dim)", width: 70, flexShrink: 0 }}>Viralidad</span>
            <div style={{ flex: 1 }}><ScoreBar value={trend.scores.virality} color={color} /></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, color: "var(--text-dim)", width: 70, flexShrink: 0 }}>Brand Fit</span>
            <div style={{ flex: 1 }}><ScoreBar value={trend.scores.brandFit} color={color} /></div>
          </div>
        </div>

        <div style={{ marginTop: 10, fontSize: 11, color: "var(--text-muted)", textAlign: "right" }}>
          {expanded ? "▲ Ocultar propuestas" : "▼ Ver propuestas"}
        </div>
      </div>

      {/* Proposals */}
      {expanded && (
        <div
          style={{
            borderTop: "1px solid var(--border)",
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Propuestas de campaña
          </div>
          {trend.proposals.map((p, pi) => (
            <div
              key={pi}
              style={{
                background: "var(--surface2)",
                borderRadius: 10,
                padding: "12px 14px",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color }}>
                {pi + 1}. {p.title}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 8, lineHeight: 1.6 }}>
                {p.copy}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, background: "var(--surface)", padding: "3px 8px", borderRadius: 6, color: "var(--text-dim)" }}>
                  📢 {p.channel}
                </span>
                <span style={{ fontSize: 11, background: `${color}22`, padding: "3px 8px", borderRadius: 6, color }}>
                  → {p.cta}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Competitor Panel ─────────────────────────────────────────────────────────
function CompetitorPanel({ data }: { data: CompetitorData[] | null; status: Status }) {
  if (!data || !Array.isArray(data)) return (
    <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
      Usa el botón &quot;Escanear competencia&quot; para obtener datos.
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {data.map((comp, ci) => {
        const promos = Array.isArray(comp.currentPromos) ? comp.currentPromos : [];

        return (
          <div
            key={ci}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            {/* Competitor header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderLeft: `4px solid ${comp.color || "#666"}`,
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{comp.name || "Competidor"}</div>
                <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>{comp.messaging || ""}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Actividad</div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: comp.activityLevel === "alta" ? "var(--danger)" : comp.activityLevel === "media" ? "var(--warning)" : "var(--text-dim)",
                  }}
                >
                  {comp.activityLevel?.toUpperCase() || "—"}
                </div>
              </div>
            </div>

            <div style={{ padding: 20 }}>
              {/* Promos */}
              {promos.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                    Promos detectadas
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {promos.map((promo, pi) => (
                      <div key={pi} style={{ fontSize: 13, color: "var(--text-dim)", display: "flex", gap: 8 }}>
                        <span style={{ color: comp.color || "#666" }}>•</span> {typeof promo === "string" ? promo : ""}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Module: Instagram ───────────────────────────────────────────────────────
function InstagramPanel({ data, status }: { data: InstagramData[] | null; status: Status }) {
  if (status === "idle") return (
    <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
      Presiona &quot;Escanear Instagram&quot; para obtener datos de las cuentas de competidores.
    </div>
  );
  if (!data) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {data.map((account, ai) => (
        <div
          key={ai}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          {/* Account header */}
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>@{account.account}</div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>
                {account.posts.length} posts recientes
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, textAlign: "center" }}>
              <div>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 14, fontWeight: 700, color: "var(--danger)" }}>
                  {account.totalLikes.toLocaleString()}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>likes</div>
              </div>
              <div>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 14, fontWeight: 700, color: "var(--info)" }}>
                  {account.totalComments.toLocaleString()}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>comments</div>
              </div>
              <div>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 14, fontWeight: 700, color: "var(--success)" }}>
                  {account.totalViews.toLocaleString()}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>views</div>
              </div>
              <div>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 14, fontWeight: 700, color: "var(--accent)" }}>
                  {account.avgEngagement.toLocaleString()}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>avg eng.</div>
              </div>
            </div>
          </div>

          <div style={{ padding: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
              {account.posts.map((post, pi) => (
                <div
                  key={pi}
                  className="animate-fadeIn"
                  style={{
                    background: "var(--surface2)",
                    borderRadius: 10,
                    overflow: "hidden",
                  }}
                >
                  {/* Post media: video or image */}
                  {post.type === "Video" && post.videoUrl ? (
                    <video
                      src={post.videoUrl}
                      controls
                      preload="metadata"
                      poster={post.thumbnailUrl || undefined}
                      style={{ width: "100%", maxHeight: 350, display: "block", background: "#000" }}
                    />
                  ) : post.thumbnailUrl ? (
                    <a href={post.url} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={post.thumbnailUrl}
                        alt={post.caption?.substring(0, 50) || "Instagram post"}
                        style={{ width: "100%", maxHeight: 350, objectFit: "cover", display: "block" }}
                      />
                    </a>
                  ) : null}
                  <div style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 6, lineHeight: 1.5 }}>
                          {post.caption.substring(0, 200)}{post.caption.length > 200 ? "..." : ""}
                        </div>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            {post.type === "Video" ? "🎬" : "📷"} {post.productType}
                          </span>
                          <span style={{ fontSize: 11, color: "var(--danger)" }}>
                            ❤️ {post.likesCount.toLocaleString()}
                          </span>
                          <span style={{ fontSize: 11, color: "var(--info)" }}>
                            💬 {post.commentsCount}
                          </span>
                          {post.videoPlayCount && (
                            <span style={{ fontSize: 11, color: "var(--success)" }}>
                              ▶️ {post.videoPlayCount.toLocaleString()}
                            </span>
                          )}
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            {new Date(post.timestamp).toLocaleDateString("es-CL")}
                          </span>
                        </div>
                      </div>
                      <a
                        href={post.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 11, color: "var(--accent)", textDecoration: "none", flexShrink: 0 }}
                      >
                        Ver →
                      </a>
                    </div>

                    {/* Top comments */}
                    {post.latestComments && post.latestComments.length > 0 && (
                      <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                        {post.latestComments.slice(0, 2).map((c, ci) => (
                          <div key={ci} style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
                            <span style={{ fontWeight: 600, color: "var(--text-dim)" }}>@{c.ownerUsername}</span>{" "}
                            {(c.text || "").substring(0, 120)}{(c.text || "").length > 120 ? "..." : ""}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Module: TikTok ──────────────────────────────────────────────────────────
function TikTokPanel({ data, status }: { data: TikTokData[] | null; status: Status }) {
  if (status === "idle") return (
    <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
      Presiona &quot;Escanear TikTok&quot; para obtener datos de los competidores.
    </div>
  );
  if (!data || !Array.isArray(data)) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {data.map((account, ai) => (
        <div
          key={ai}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          {/* Account header */}
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {account.posts[0]?.authorAvatar && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={account.posts[0].authorAvatar}
                  alt={account.accountName}
                  style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }}
                />
              )}
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>
                  {account.accountName}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 1 }}>
                  @{account.account} · {account.posts.length} videos
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, textAlign: "center" }}>
              <div>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 14, fontWeight: 700, color: "var(--danger)" }}>
                  {account.totalLikes >= 1000 ? `${(account.totalLikes / 1000).toFixed(1)}K` : account.totalLikes}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>likes</div>
              </div>
              <div>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 14, fontWeight: 700, color: "var(--success)" }}>
                  {account.totalViews >= 1000000
                    ? `${(account.totalViews / 1000000).toFixed(1)}M`
                    : account.totalViews >= 1000
                    ? `${(account.totalViews / 1000).toFixed(1)}K`
                    : account.totalViews}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>views</div>
              </div>
              <div>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 14, fontWeight: 700, color: "var(--info)" }}>
                  {account.totalComments.toLocaleString()}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>comments</div>
              </div>
              <div>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 14, fontWeight: 700, color: "#8B5CF6" }}>
                  {account.totalShares.toLocaleString()}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>shares</div>
              </div>
            </div>
          </div>

          {/* Posts grid with video embeds */}
          <div style={{ padding: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
              {account.posts.map((post, pi) => (
                <div
                  key={pi}
                  className="animate-fadeIn"
                  style={{
                    background: "var(--surface2)",
                    borderRadius: 10,
                    overflow: "hidden",
                    border: "1px solid var(--border)",
                  }}
                >
                  {/* Video embed or cover */}
                  {post.webVideoUrl ? (
                    <div style={{ position: "relative" }}>
                      {post.coverUrl && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={post.coverUrl}
                          alt={post.text?.substring(0, 50) || "TikTok video"}
                          style={{ width: "100%", maxHeight: 320, objectFit: "cover", display: "block" }}
                        />
                      )}
                      <a
                        href={post.webVideoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "rgba(0,0,0,0.3)",
                          color: "#fff",
                          fontSize: 36,
                          textDecoration: "none",
                        }}
                      >
                        ▶
                      </a>
                    </div>
                  ) : post.coverUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={post.coverUrl}
                      alt={post.text?.substring(0, 50) || "TikTok video"}
                      style={{ width: "100%", maxHeight: 320, objectFit: "cover", display: "block" }}
                    />
                  ) : null}

                  <div style={{ padding: "10px 12px" }}>
                    <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 8, lineHeight: 1.5 }}>
                      {(post.text || "").substring(0, 150)}{(post.text || "").length > 150 ? "..." : ""}
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "var(--danger)" }}>
                        ❤️ {post.diggCount.toLocaleString()}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--success)" }}>
                        ▶️ {post.playCount >= 1000000
                          ? `${(post.playCount / 1000000).toFixed(1)}M`
                          : post.playCount >= 1000
                          ? `${(post.playCount / 1000).toFixed(1)}K`
                          : post.playCount}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--info)" }}>
                        💬 {post.commentCount}
                      </span>
                      <span style={{ fontSize: 11, color: "#8B5CF6" }}>
                        🔁 {post.shareCount}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {new Date(post.createTime).toLocaleDateString("es-CL")}
                      </span>
                    </div>
                    {post.musicTitle && (
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 6 }}>
                        🎵 {post.musicTitle}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Module: Meta Ads ────────────────────────────────────────────────────────
function MetaAdsPanel({ data, status }: { data: MetaAdsData[] | null; status: Status }) {
  if (status === "idle") return (
    <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
      Presiona &quot;Escanear Meta Ads&quot; para obtener anuncios activos de los competidores.
    </div>
  );
  if (!data || !Array.isArray(data)) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {data.map((page, pi) => (
        <div
          key={pi}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{page.pageName}</div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>
                {page.totalAds} anuncios activos en Meta Ads Library
              </div>
            </div>
          </div>

          <div style={{ padding: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
              {page.ads.map((ad, ai) => (
                <div
                  key={ai}
                  className="animate-fadeIn"
                  style={{
                    background: "var(--surface2)",
                    borderRadius: 10,
                    overflow: "hidden",
                    border: "1px solid var(--border)",
                  }}
                >
                  {/* Ad media */}
                  {ad.format === "video" && ad.videoUrl ? (
                    <video
                      src={ad.videoUrl}
                      controls
                      preload="metadata"
                      poster={ad.videoPreviewUrl || undefined}
                      style={{ width: "100%", maxHeight: 300, display: "block", background: "#000" }}
                    />
                  ) : ad.format === "video" && ad.videoPreviewUrl ? (
                    <a href={ad.adLibraryUrl} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={ad.videoPreviewUrl}
                        alt={`Ad de ${ad.pageName}`}
                        style={{ width: "100%", maxHeight: 300, objectFit: "cover", display: "block" }}
                      />
                    </a>
                  ) : ad.imageUrl ? (
                    <a href={ad.adLibraryUrl} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={ad.imageUrl}
                        alt={`Ad de ${ad.pageName}`}
                        style={{ width: "100%", maxHeight: 300, objectFit: "cover", display: "block" }}
                      />
                    </a>
                  ) : null}

                  <div style={{ padding: "10px 12px" }}>
                    <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 8, lineHeight: 1.5 }}>
                      {(ad.copy || "Sin texto").substring(0, 200)}{(ad.copy || "").length > 200 ? "..." : ""}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ fontSize: 10, background: "var(--surface)", padding: "2px 8px", borderRadius: 4, color: "var(--accent)", fontWeight: 600 }}>
                        {ad.format}
                      </span>
                      {ad.platforms.map((pl, pli) => (
                        <span key={pli} style={{ fontSize: 10, background: "var(--surface)", padding: "2px 6px", borderRadius: 4, color: "var(--text-muted)" }}>
                          {pl}
                        </span>
                      ))}
                      {ad.ctaText && (
                        <span style={{ fontSize: 10, background: "rgba(245,158,11,0.15)", padding: "2px 6px", borderRadius: 4, color: "var(--accent)" }}>
                          → {ad.ctaText}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 6 }}>
                      {ad.startDate ? `Desde ${ad.startDate.split(" ")[0]}` : ""}
                      {ad.endDate ? ` · Hasta ${ad.endDate.split(" ")[0]}` : ""}
                    </div>
                    <a
                      href={ad.adLibraryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 11, color: "var(--accent)", textDecoration: "none", marginTop: 6, display: "inline-block" }}
                    >
                      Ver en Meta Ads Library →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ padding: "32px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
      {text}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Page() {
  const [tab, setTab] = useState<Tab>("tendencias");
  const [scanningAll, setScanningAll] = useState(false);

  const [xState, setXState] = useState<ModuleState<XTrend[]>>({ status: "idle", data: null });
  const [trendsState, setTrendsState] = useState<ModuleState<GoogleTrendsResult>>({ status: "idle", data: null });
  const [newsState, setNewsState] = useState<ModuleState<NewsItem[]>>({ status: "idle", data: null });
  const [competitorsState, setCompetitorsState] = useState<ModuleState<CompetitorData[]>>({ status: "idle", data: null });
  const [brandPulseState, setBrandPulseState] = useState<ModuleState<BrandPulseResult>>({ status: "idle", data: null });
  const [scoredState, setScoredState] = useState<ModuleState<ScoredTrend[]>>({ status: "idle", data: null });
  const [instagramState, setInstagramState] = useState<ModuleState<InstagramData[]>>({ status: "idle", data: null });
  const [tiktokState, setTiktokState] = useState<ModuleState<TikTokData[]>>({ status: "idle", data: null });
  const [metaAdsState, setMetaAdsState] = useState<ModuleState<MetaAdsData[]>>({ status: "idle", data: null });

  const scanX = useCallback(async () => {
    setXState({ status: "loading", data: null });
    try {
      const res = await fetch("/api/scan-x");
      const data = await res.json();
      setXState({ status: "done", data });
    } catch {
      setXState({ status: "error", data: null });
    }
  }, []);

  const scanTrends = useCallback(async () => {
    setTrendsState({ status: "loading", data: null });
    try {
      const res = await fetch("/api/scan-trends");
      const data = await res.json();
      setTrendsState({ status: "done", data });
    } catch {
      setTrendsState({ status: "error", data: null });
    }
  }, []);

  const scanNews = useCallback(async () => {
    setNewsState({ status: "loading", data: null });
    try {
      const res = await fetch("/api/scan-news");
      const data = await res.json();
      setNewsState({ status: "done", data });
    } catch {
      setNewsState({ status: "error", data: null });
    }
  }, []);

  const scanCompetitors = useCallback(async () => {
    setCompetitorsState({ status: "loading", data: null });
    try {
      const res = await fetch("/api/competitors");
      const data = await res.json();
      if (!res.ok || !Array.isArray(data)) {
        setCompetitorsState({ status: "error", data: null });
        return;
      }
      setCompetitorsState({ status: "done", data });
    } catch {
      setCompetitorsState({ status: "error", data: null });
    }
  }, []);

  const scanInstagram = useCallback(async () => {
    setInstagramState({ status: "loading", data: null });
    try {
      const res = await fetch("/api/instagram");
      const data = await res.json();
      if (!res.ok || !Array.isArray(data)) {
        setInstagramState({ status: "error", data: null });
        return;
      }
      setInstagramState({ status: "done", data });
    } catch {
      setInstagramState({ status: "error", data: null });
    }
  }, []);

  const scanTikTok = useCallback(async () => {
    setTiktokState({ status: "loading", data: null });
    try {
      const res = await fetch("/api/tiktok");
      const data = await res.json();
      if (!res.ok || !Array.isArray(data)) {
        setTiktokState({ status: "error", data: null });
        return;
      }
      setTiktokState({ status: "done", data });
    } catch {
      setTiktokState({ status: "error", data: null });
    }
  }, []);

  const scanMetaAds = useCallback(async () => {
    setMetaAdsState({ status: "loading", data: null });
    try {
      const res = await fetch("/api/meta-ads");
      const data = await res.json();
      if (!res.ok || !Array.isArray(data)) {
        setMetaAdsState({ status: "error", data: null });
        return;
      }
      setMetaAdsState({ status: "done", data });
    } catch {
      setMetaAdsState({ status: "error", data: null });
    }
  }, []);

  const scanBrandPulse = useCallback(async () => {
    setBrandPulseState({ status: "loading", data: null });
    try {
      const res = await fetch("/api/brand-pulse");
      const data = await res.json();
      setBrandPulseState({ status: "done", data });
    } catch {
      setBrandPulseState({ status: "error", data: null });
    }
  }, []);

  const scoreAll = useCallback(
    async (
      xData: XTrend[] | null,
      googleData: GoogleTrendsResult | null,
      newsData: NewsItem[] | null,
      compData: CompetitorData[] | null,
      pulseData: BrandPulseResult | null
    ) => {
      setScoredState({ status: "loading", data: null });
      try {
        const res = await fetch("/api/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            xTrends: xData,
            googleTrends: googleData,
            news: newsData,
            competitors: compData,
            brandPulse: pulseData,
          }),
        });
        const data = await res.json();
        setScoredState({ status: "done", data });
      } catch {
        setScoredState({ status: "error", data: null });
      }
    },
    []
  );

  const scanAll = useCallback(async () => {
    setScanningAll(true);
    setScoredState({ status: "idle", data: null });

    // Run all scans in parallel
    const [xData, googleData, newsData, compData, pulseData] = await Promise.all([
      fetch("/api/scan-x")
        .then((r) => r.json())
        .then((d) => { setXState({ status: "done", data: d }); return d; })
        .catch(() => { setXState({ status: "error", data: null }); return null; }),
      fetch("/api/scan-trends")
        .then((r) => r.json())
        .then((d) => { setTrendsState({ status: "done", data: d }); return d; })
        .catch(() => { setTrendsState({ status: "error", data: null }); return null; }),
      fetch("/api/scan-news")
        .then((r) => r.json())
        .then((d) => { setNewsState({ status: "done", data: d }); return d; })
        .catch(() => { setNewsState({ status: "error", data: null }); return null; }),
      fetch("/api/competitors")
        .then((r) => r.json())
        .then((d) => { setCompetitorsState({ status: "done", data: d }); return d; })
        .catch(() => { setCompetitorsState({ status: "error", data: null }); return null; }),
      fetch("/api/brand-pulse")
        .then((r) => r.json())
        .then((d) => { setBrandPulseState({ status: "done", data: d }); return d; })
        .catch(() => { setBrandPulseState({ status: "error", data: null }); return null; }),
    ]);

    // Set loading states first
    setXState((s) => ({ ...s, status: s.status === "idle" ? "loading" : s.status }));
    setTrendsState((s) => ({ ...s, status: s.status === "idle" ? "loading" : s.status }));
    setNewsState((s) => ({ ...s, status: s.status === "idle" ? "loading" : s.status }));
    setCompetitorsState((s) => ({ ...s, status: s.status === "idle" ? "loading" : s.status }));
    setBrandPulseState((s) => ({ ...s, status: s.status === "idle" ? "loading" : s.status }));

    // Score everything with Claude
    await scoreAll(xData, googleData, newsData, compData, pulseData);

    setScanningAll(false);
  }, [scoreAll]);

  const BRAND_PILLARS = ["Cercanía", "Cobertura", "Confianza", "Innovación"];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Header */}
      <header
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 16px" }}>
          <div style={{ padding: "16px 0 12px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 22 }}>⛽</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.02em" }}>
                    FUEL TREND SCOUT{" "}
                    <span style={{ color: "var(--accent)" }}>AGENT</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "JetBrains Mono, monospace" }}>
                    Scraping real · Scoring IA · Copec Combustible
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                {BRAND_PILLARS.map((p) => (
                  <span
                    key={p}
                    style={{
                      fontSize: 10,
                      background: "var(--accent-glow)",
                      color: "var(--accent)",
                      padding: "2px 8px",
                      borderRadius: 20,
                      fontWeight: 600,
                    }}
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={scanAll}
              disabled={scanningAll}
              style={{
                background: scanningAll ? "rgba(245,158,11,0.15)" : "var(--accent)",
                color: scanningAll ? "var(--accent)" : "#000",
                border: scanningAll ? "1px solid var(--accent)" : "none",
                borderRadius: 10,
                padding: "10px 20px",
                fontSize: 13,
                fontWeight: 700,
                cursor: scanningAll ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontFamily: "inherit",
                flexShrink: 0,
                transition: "all 0.2s",
              }}
            >
              {scanningAll && <Spinner />}
              {scanningAll ? "Escaneando..." : "⚡ Escanear todo"}
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 0, borderBottom: "none", marginBottom: -1 }}>
            {(["tendencias", "competencia"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  background: "none",
                  border: "none",
                  borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
                  color: tab === t ? "var(--accent)" : "var(--text-muted)",
                  padding: "10px 16px",
                  fontSize: 13,
                  fontWeight: tab === t ? 700 : 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textTransform: "capitalize",
                  transition: "all 0.15s",
                }}
              >
                {t === "tendencias" ? "Tendencias" : "Competencia"}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main */}
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px 80px" }}>
        {tab === "tendencias" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* 2x2 grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: 16,
              }}
            >
              <ModuleCard title="X / Twitter" icon="𝕏" status={xState.status} onScan={scanX}>
                <XTrendsPanel data={xState.data} />
              </ModuleCard>
              <ModuleCard title="Google Trends Combustible" icon="📈" status={trendsState.status} onScan={scanTrends}>
                <GoogleTrendsPanel data={trendsState.data} />
              </ModuleCard>
              <ModuleCard title="Noticias Regulatorias" icon="⚖️" status={newsState.status} onScan={scanNews}>
                <NewsPanel data={newsState.data} />
              </ModuleCard>
              <ModuleCard title="Pulso de Marca" icon="💡" status={brandPulseState.status} onScan={scanBrandPulse}>
                <BrandPulsePanel data={brandPulseState.data} />
              </ModuleCard>
            </div>

            {/* Scored Trends */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>Tendencias Scoreadas</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    Análisis IA con contexto de marca Copec
                  </div>
                </div>
                <ScanButton
                  onClick={() =>
                    scoreAll(
                      xState.data,
                      trendsState.data,
                      newsState.data,
                      competitorsState.data,
                      brandPulseState.data
                    )
                  }
                  loading={scoredState.status === "loading"}
                  label="Analizar con Claude"
                />
              </div>

              {scoredState.status === "idle" && (
                <EmptyState text="Escanea los módulos y luego presiona 'Analizar con Claude' para obtener scoring y propuestas de campaña." />
              )}
              {scoredState.status === "loading" && (
                <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-dim)" }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                    <Spinner />
                  </div>
                  <div style={{ fontSize: 14 }}>Claude está analizando las tendencias...</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Esto puede tomar unos segundos</div>
                </div>
              )}
              {scoredState.status === "done" && scoredState.data && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {scoredState.data.map((trend, i) => (
                    <ScoredTrendCard key={i} trend={trend} index={i} />
                  ))}
                </div>
              )}
              {scoredState.status === "error" && (
                <EmptyState text="Error al analizar las tendencias. Intenta nuevamente." />
              )}
            </div>
          </div>
        )}

        {tab === "competencia" && (
          <div>
            <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Actividad de Competencia</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Shell Chile · Aramco Estaciones Chile</div>
              </div>
              <ScanButton onClick={scanCompetitors} loading={competitorsState.status === "loading"} label="Escanear competencia" />
            </div>
            <CompetitorPanel data={competitorsState.data} status={competitorsState.status} />

            {/* Meta Ads Section */}
            <div style={{ marginTop: 32 }}>
              <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>📢 Meta Ads Library</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Anuncios activos en Facebook e Instagram via Apify</div>
                </div>
                <ScanButton onClick={scanMetaAds} loading={metaAdsState.status === "loading"} label="Escanear Meta Ads" />
              </div>
              {metaAdsState.status === "loading" && (
                <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-dim)" }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}><Spinner /></div>
                  Cargando anuncios de Meta Ads Library...
                </div>
              )}
              {metaAdsState.status === "error" && (
                <EmptyState text="Error al cargar Meta Ads. Verifica APIFY_META_ADS_DATASET_ID en las variables de entorno." />
              )}
              <MetaAdsPanel data={metaAdsState.data} status={metaAdsState.status} />
            </div>

            {/* Instagram Section */}
            <div style={{ marginTop: 32 }}>
              <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>📸 Instagram Competidores</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Posts recientes y engagement via Apify</div>
                </div>
                <ScanButton onClick={scanInstagram} loading={instagramState.status === "loading"} label="Escanear Instagram" />
              </div>
              {instagramState.status === "loading" && (
                <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-dim)" }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}><Spinner /></div>
                  Cargando datos de Instagram...
                </div>
              )}
              {instagramState.status === "error" && (
                <EmptyState text="Error al cargar datos de Instagram." />
              )}
              <InstagramPanel data={instagramState.data} status={instagramState.status} />
            </div>

            {/* TikTok Section */}
            <div style={{ marginTop: 32 }}>
              <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>🎵 TikTok Competidores</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Videos recientes y métricas de engagement via Apify</div>
                </div>
                <ScanButton onClick={scanTikTok} loading={tiktokState.status === "loading"} label="Escanear TikTok" />
              </div>
              {tiktokState.status === "loading" && (
                <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-dim)" }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}><Spinner /></div>
                  Cargando datos de TikTok...
                </div>
              )}
              {tiktokState.status === "error" && (
                <EmptyState text="Error al cargar datos de TikTok. Verifica APIFY_TIKTOK_DATASET_ID en las variables de entorno." />
              )}
              <TikTokPanel data={tiktokState.data} status={tiktokState.status} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
