// ══════════════════════════════════════════════════════════════════
// COMPETENCIA TAB — Individual Ad Screenshots
// ══════════════════════════════════════════════════════════════════
// 
// INTEGRATION GUIDE:
// 
// 1. Add these types to the top of your page.tsx:

interface AdScreenshot {
  adUrl: string;
  snapshotUrl: string;
  bodyPreview: string;
  screenshot: string | null;
}

interface CompetitorResult {
  competitor: string;
  ads: AdScreenshot[];
  analysis: {
    promos: string[];
    summary: string;
    channels: string[];
  };
  metaAdsLibraryUrl: string;
  totalAdsFound: number;
  scannedAt: string;
}

// 2. Add these state variables inside your component:
//
// const [competitors, setCompetitors] = useState<CompetitorResult[]>([]);
// const [loadingCompetitors, setLoadingCompetitors] = useState(false);

// 3. Add this fetch function:
//
// async function scanCompetitors() {
//   setLoadingCompetitors(true);
//   try {
//     const res = await fetch('/api/competitors', { method: 'POST' });
//     const data = await res.json();
//     if (data.success) setCompetitors(data.data);
//   } catch (err) {
//     console.error('Error:', err);
//   } finally {
//     setLoadingCompetitors(false);
//   }
// }

// 4. Paste this JSX inside your tab conditional:

{activeTab === 'competencia' && (
  <div>
    {/* Header */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>🔍 Anuncios Competencia</h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.5 }}>
          Meta Ads Library — 3 anuncios activos por competidor
        </p>
      </div>
      <button
        onClick={scanCompetitors}
        disabled={loadingCompetitors}
        style={{
          padding: '10px 20px',
          background: loadingCompetitors ? '#555' : '#F59E0B',
          color: '#000',
          border: 'none',
          borderRadius: 8,
          fontWeight: 700,
          fontSize: 14,
          cursor: loadingCompetitors ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
        }}
      >
        {loadingCompetitors ? '⏳ Escaneando...' : '📡 Escanear Competencia'}
      </button>
    </div>

    {/* Loading */}
    {loadingCompetitors && (
      <div style={{
        textAlign: 'center',
        padding: 60,
        background: 'rgba(245,158,11,0.04)',
        borderRadius: 12,
        border: '1px dashed rgba(245,158,11,0.25)',
      }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🔄</div>
        <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 4px' }}>
          Extrayendo anuncios individuales de Meta Ads Library...
        </p>
        <p style={{ fontSize: 13, opacity: 0.4, margin: 0 }}>
          Navegando → Extrayendo IDs → Capturando screenshots · ~60s
        </p>
      </div>
    )}

    {/* Results */}
    {!loadingCompetitors && competitors.length > 0 && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {competitors.map((comp, i) => (
          <div key={i}>
            {/* Competitor header bar */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
              padding: '12px 16px',
              background: 'rgba(245,158,11,0.06)',
              borderRadius: 10,
              border: '1px solid rgba(245,158,11,0.12)',
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                  {comp.competitor}
                </h3>
                <span style={{ fontSize: 12, opacity: 0.4 }}>
                  {comp.totalAdsFound} anuncios activos encontrados · {new Date(comp.scannedAt).toLocaleString('es-CL')}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {comp.analysis.channels.map((ch, k) => (
                  <span key={k} style={{
                    fontSize: 11,
                    padding: '3px 8px',
                    background: 'rgba(255,255,255,0.06)',
                    borderRadius: 4,
                    opacity: 0.6,
                  }}>
                    {ch}
                  </span>
                ))}
                <a
                  href={comp.metaAdsLibraryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 12,
                    color: '#F59E0B',
                    textDecoration: 'none',
                    padding: '4px 10px',
                    border: '1px solid rgba(245,158,11,0.3)',
                    borderRadius: 6,
                    marginLeft: 4,
                  }}
                >
                  Ver todos ↗
                </a>
              </div>
            </div>

            {/* Summary */}
            <p style={{
              fontSize: 13,
              lineHeight: 1.6,
              margin: '0 0 12px',
              opacity: 0.7,
              padding: '0 4px',
            }}>
              {comp.analysis.summary}
            </p>

            {/* Promos badges */}
            {comp.analysis.promos.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16, padding: '0 4px' }}>
                {comp.analysis.promos.map((p, k) => (
                  <span key={k} style={{
                    fontSize: 11,
                    padding: '3px 10px',
                    background: 'rgba(245,158,11,0.1)',
                    border: '1px solid rgba(245,158,11,0.2)',
                    borderRadius: 6,
                    color: '#F59E0B',
                  }}>
                    🏷️ {p}
                  </span>
                ))}
              </div>
            )}

            {/* ── Ad Gallery: 3 individual screenshots ── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
            }}>
              {comp.ads.map((ad, j) => (
                <div
                  key={j}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.08)',
                    overflow: 'hidden',
                    transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(245,158,11,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.08)';
                  }}
                >
                  {/* Screenshot */}
                  {ad.screenshot ? (
                    <div style={{
                      position: 'relative',
                      width: '100%',
                      maxHeight: 360,
                      overflow: 'hidden',
                      background: '#111',
                    }}>
                      <img
                        src={ad.screenshot}
                        alt={`Ad ${j + 1} de ${comp.competitor}`}
                        style={{
                          width: '100%',
                          display: 'block',
                          objectFit: 'cover',
                          objectPosition: 'top',
                        }}
                      />
                      {/* Ad number badge */}
                      <div style={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        background: 'rgba(0,0,0,0.7)',
                        color: '#F59E0B',
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 4,
                      }}>
                        AD {j + 1}
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      height: 200,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(255,255,255,0.02)',
                      fontSize: 13,
                      opacity: 0.3,
                    }}>
                      📷 Screenshot no disponible
                    </div>
                  )}

                  {/* Ad body preview + link */}
                  <div style={{ padding: '10px 12px' }}>
                    {ad.bodyPreview && (
                      <p style={{
                        fontSize: 12,
                        lineHeight: 1.5,
                        margin: '0 0 8px',
                        opacity: 0.6,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {ad.bodyPreview}
                      </p>
                    )}
                    <a
                      href={ad.adUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 11,
                        color: '#F59E0B',
                        textDecoration: 'none',
                        fontWeight: 600,
                      }}
                    >
                      Ver anuncio completo ↗
                    </a>
                  </div>
                </div>
              ))}

              {/* Empty slots if less than 3 ads */}
              {comp.ads.length < 3 && Array.from({ length: 3 - comp.ads.length }).map((_, k) => (
                <div
                  key={`empty-${k}`}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: 10,
                    border: '1px dashed rgba(255,255,255,0.06)',
                    height: 200,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    opacity: 0.25,
                  }}
                >
                  Sin anuncio
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )}

    {/* Empty state */}
    {!loadingCompetitors && competitors.length === 0 && (
      <div style={{ textAlign: 'center', padding: 80, opacity: 0.35 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🏢</div>
        <p style={{ fontSize: 15 }}>Presiona "Escanear Competencia" para capturar anuncios de Shell y Aramco</p>
      </div>
    )}
  </div>
)}
