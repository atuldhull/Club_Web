import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const files = [
  { url: "https://res.cloudinary.com/dd0pler5u/image/upload/v1774175009/th1_yu7tlg.jpg", type: "img", label: "Start" },
  { url: "https://res.cloudinary.com/dd0pler5u/image/upload/v1774175073/th2_m9gf5f.jpg", type: "img", label: "Clue I" },
  { url: "https://res.cloudinary.com/dd0pler5u/video/upload/v1774175545/th3_ddwp6t.mp4", type: "vid", label: "Chase" },
  { url: "https://res.cloudinary.com/dd0pler5u/video/upload/v1774176417/th4_rnyvnq.mp4", type: "vid", label: "Race" },
  { url: "https://res.cloudinary.com/dd0pler5u/video/upload/v1774175073/th5_hwaska.mp4", type: "vid", label: "Sprint" },
  { url: "https://res.cloudinary.com/dd0pler5u/image/upload/v1774175075/th6_k25h7p.jpg", type: "img", label: "Clue II" },
  { url: "https://res.cloudinary.com/dd0pler5u/image/upload/v1774175075/th7_ozqiy1.jpg", type: "img", label: "Discovery" },
  { url: "https://res.cloudinary.com/dd0pler5u/image/upload/v1774175075/th8_ms0yeh.jpg", type: "img", label: "Trail" },
  { url: "https://res.cloudinary.com/dd0pler5u/image/upload/v1774175079/th9_rzulny.jpg", type: "img", label: "Clue III" },
  { url: "https://res.cloudinary.com/dd0pler5u/image/upload/v1774175081/th10_jdzplq.jpg", type: "img", label: "Deep Forest" },
  { url: "https://res.cloudinary.com/dd0pler5u/image/upload/v1774175081/th11_erg6vl.jpg", type: "img", label: "The Riddle" },
  { url: "https://res.cloudinary.com/dd0pler5u/image/upload/v1774175081/th12_ktjb5x.jpg", type: "img", label: "Hidden Path" },
  { url: "https://res.cloudinary.com/dd0pler5u/image/upload/v1774175083/th13_riqglx.jpg", type: "img", label: "Clue IV" },
  { url: "https://res.cloudinary.com/dd0pler5u/image/upload/v1774175093/th14_hyvufj.jpg", type: "img", label: "Almost There" },
  { url: "https://res.cloudinary.com/dd0pler5u/image/upload/v1774175084/th15_w4bpxz.jpg", type: "img", label: "Final Clue" },
  { url: "https://res.cloudinary.com/dd0pler5u/image/upload/v1774175082/th16_cgq33i.jpg", type: "img", label: "The Mark" },
  { url: "https://res.cloudinary.com/dd0pler5u/image/upload/v1774175082/th17_j56sfy.jpg", type: "img", label: "X Marks" },
  { url: "https://res.cloudinary.com/dd0pler5u/image/upload/v1774175083/th18_qc2msf.jpg", type: "img", label: "Found It" },
  { url: "https://res.cloudinary.com/dd0pler5u/image/upload/v1774175084/th19_k1pfte.jpg", type: "img", label: "Victory" },
  { url: "https://res.cloudinary.com/dd0pler5u/image/upload/v1774175084/th20_l8mobt.jpg", type: "img", label: "Treasure!" },
];

// Scattered positions — bigger cards, more spread out, no overflow
const positions = [
  { left: 2, top: 1, w: 240, h: 180, rot: -1.5 },
  { left: 24, top: 0, w: 230, h: 170, rot: 1 },
  { left: 47, top: 2, w: 240, h: 180, rot: -0.8 },
  { left: 70, top: 0, w: 230, h: 170, rot: 1.5 },
  { left: 72, top: 12, w: 230, h: 175, rot: -1 },
  { left: 48, top: 14, w: 240, h: 180, rot: 0.8 },
  { left: 24, top: 13, w: 235, h: 175, rot: -1.2 },
  { left: 1, top: 16, w: 240, h: 180, rot: 1.5 },
  { left: 2, top: 27, w: 230, h: 170, rot: -0.8 },
  { left: 24, top: 29, w: 240, h: 180, rot: 1 },
  { left: 48, top: 27, w: 235, h: 175, rot: -1.5 },
  { left: 70, top: 29, w: 240, h: 180, rot: 0.5 },
  { left: 70, top: 41, w: 230, h: 170, rot: -0.5 },
  { left: 48, top: 43, w: 240, h: 180, rot: 1.2 },
  { left: 24, top: 41, w: 235, h: 175, rot: -1 },
  { left: 1, top: 43, w: 240, h: 180, rot: 0.8 },
  { left: 2, top: 55, w: 230, h: 170, rot: -1 },
  { left: 24, top: 57, w: 240, h: 180, rot: 1 },
  { left: 48, top: 55, w: 235, h: 175, rot: -0.5 },
  { left: 70, top: 57, w: 250, h: 190, rot: 0 },
];

function MapCanvas({ containerW, containerH }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerW) return;
    const ctx = canvas.getContext("2d");
    canvas.width = containerW * 2;
    canvas.height = containerH * 2;
    ctx.scale(2, 2);

    const centers = positions.map((p) => ({
      x: (p.left / 100) * containerW + p.w / 2,
      y: (p.top / 100) * containerH + p.h / 2,
    }));

    // Dashed path
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = "rgba(139,99,64,0.4)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centers[0].x, centers[0].y);
    for (let i = 1; i < centers.length; i++) {
      const p = centers[i - 1], c = centers[i];
      const cpx = (p.x + c.x) / 2 + (i % 2 ? 40 : -40);
      const cpy = (p.y + c.y) / 2;
      ctx.quadraticCurveTo(cpx, cpy, c.x, c.y);
    }
    ctx.stroke();

    // Glow path
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = "rgba(232,192,112,0.12)";
    ctx.lineWidth = 6;
    ctx.filter = "blur(3px)";
    ctx.beginPath();
    ctx.moveTo(centers[0].x, centers[0].y);
    for (let i = 1; i < centers.length; i++) {
      const p = centers[i - 1], c = centers[i];
      const cpx = (p.x + c.x) / 2 + (i % 2 ? 40 : -40);
      const cpy = (p.y + c.y) / 2;
      ctx.quadraticCurveTo(cpx, cpy, c.x, c.y);
    }
    ctx.stroke();
    ctx.filter = "none";

    // X marks at each stop
    ctx.setLineDash([]);
    centers.forEach((c, i) => {
      const s = i === 19 ? 8 : 5;
      ctx.strokeStyle = i === 19 ? "rgba(232,192,112,0.6)" : "rgba(139,99,64,0.5)";
      ctx.lineWidth = i === 19 ? 2.5 : 1.5;
      ctx.beginPath(); ctx.moveTo(c.x - s, c.y - s); ctx.lineTo(c.x + s, c.y + s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(c.x + s, c.y - s); ctx.lineTo(c.x - s, c.y + s); ctx.stroke();
    });

    // Star at last
    const last = centers[19];
    ctx.font = "20px serif";
    ctx.fillStyle = "rgba(232,192,112,0.4)";
    ctx.fillText("★", last.x + 50, last.y - 30);
  }, [containerW, containerH]);

  return (
    <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-[1]"
      style={{ width: containerW, height: containerH }} />
  );
}

function PhotoNode({ file, pos, index, onOpen }) {
  const isLast = index === files.length - 1;
  const isVid = file.type === "vid";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: index * 0.04, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="absolute z-[2]"
      style={{
        left: `${pos.left}%`,
        top: `${pos.top}%`,
        width: pos.w,
      }}
    >
      {/* Pin */}
      <motion.div
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
        className="absolute -top-3 left-1/2 z-10 -translate-x-1/2"
      >
        <div className={`h-3 w-3 rounded-full shadow-md ${isLast ? "bg-[#e8c070] shadow-[0_0_8px_rgba(232,192,112,0.5)]" : "bg-[#c8902a]"}`} />
        <div className="mx-auto h-2 w-px bg-[#8B6340]" />
      </motion.div>

      {/* Photo frame */}
      <motion.div
        whileHover={{ scale: 1.06, rotate: 0, zIndex: 20, boxShadow: "0 12px 40px rgba(200,140,40,0.4)" }}
        transition={{ type: "spring", stiffness: 300, damping: 18 }}
        className={`group cursor-pointer overflow-hidden rounded-lg bg-[#2a1500] shadow-[0_4px_20px_rgba(0,0,0,0.5)] ${
          isLast
            ? "border-[3px] border-[#e8c070] shadow-[0_0_25px_rgba(232,192,112,0.3)]"
            : isVid
              ? "border-[2.5px] border-dashed border-[#c06010]"
              : "border-[2.5px] border-[#8B6340] hover:border-[#e8c070]"
        }`}
        style={{ transform: `rotate(${pos.rot}deg)` }}
        onClick={() => file.type === "img" && onOpen(file.url)}
      >
        <div style={{ height: pos.h }} className="relative overflow-hidden">
          {file.type === "img" ? (
            <img src={file.url} alt={file.label} loading="lazy" decoding="async"
              width="400" height="300"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
          ) : (
            <video controls muted playsInline preload="metadata" className="h-full w-full object-cover">
              <source src={file.url} type="video/mp4" />
            </video>
          )}
          {/* Inner border glow */}
          <div className="pointer-events-none absolute inset-0 rounded shadow-[inset_0_0_0_1px_rgba(200,160,80,0.15)]" />
        </div>
      </motion.div>

      {/* Label */}
      <p className={`mt-1.5 text-center font-mono text-[9px] uppercase tracking-[2px] ${
        isLast ? "font-bold text-[#e8c070]" : "text-[#a07040]"
      }`}>
        {file.label}
      </p>
    </motion.div>
  );
}

export default function TreasureHuntSection({ onOpen }) {
  const containerRef = useRef(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const compassRotate = useTransform(scrollYProgress, [0, 1], [0, 360]);

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setDims({ w: containerRef.current.offsetWidth, h: containerRef.current.offsetHeight });
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Calculate container height based on lowest positioned item
  const maxBottom = positions.reduce((max, p) => Math.max(max, p.top + 18), 0);

  return (
    <motion.section
      ref={sectionRef}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className="relative mx-auto max-w-[1300px] overflow-hidden rounded-3xl"
      style={{
        backgroundColor: "#1c0e00",
        border: "1.5px solid rgba(92,48,16,0.5)",
        backgroundImage: `
          url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cpath d='M0 40 Q10 30 20 40 Q30 50 40 40 Q50 30 60 40 Q70 50 80 40' stroke='%238B6340' stroke-width='0.8' fill='none' opacity='0.12'/%3E%3Ccircle cx='40' cy='40' r='1' fill='%238B6340' opacity='0.2'/%3E%3C/svg%3E"),
          url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Ccircle cx='100' cy='100' r='80' fill='none' stroke='%23704020' stroke-width='0.4' opacity='0.06' stroke-dasharray='4 6'/%3E%3C/svg%3E")
        `,
      }}
    >
      {/* Ambient radial glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[15%] top-[20%] h-[400px] w-[400px] rounded-full bg-[#b47828] opacity-[0.04] blur-[100px]" />
        <div className="absolute bottom-[15%] right-[15%] h-[350px] w-[350px] rounded-full bg-[#784614] opacity-[0.05] blur-[80px]" />
        <div className="absolute left-[50%] top-[50%] h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#5a3010] opacity-[0.03] blur-[100px]" />
      </div>

      {/* Corner ornaments */}
      {["top-3 left-3", "top-3 right-3 -scale-x-100", "bottom-3 left-3 -scale-y-100", "bottom-3 right-3 scale-[-1]"].map((cls, i) => (
        <svg key={i} className={`pointer-events-none absolute ${cls} h-14 w-14 opacity-20`} viewBox="0 0 60 60" fill="none">
          <path d="M5 55 L5 5 L55 5" stroke="#8B6340" strokeWidth="2" />
          <circle cx="5" cy="5" r="3" fill="#8B6340" />
        </svg>
      ))}

      {/* Compass */}
      <motion.div style={{ rotate: compassRotate }}
        className="pointer-events-none absolute right-8 top-16 z-[3] hidden opacity-40 lg:block">
        <svg width="90" height="90" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="46" stroke="#8B6340" strokeWidth="1.5" />
          <circle cx="50" cy="50" r="40" stroke="#8B6340" strokeWidth="0.6" strokeDasharray="3 4" />
          <circle cx="50" cy="50" r="5" fill="#c8902a" />
          <text x="50" y="14" textAnchor="middle" fill="#e8c070" fontSize="10" fontFamily="serif" fontWeight="700">N</text>
          <text x="50" y="92" textAnchor="middle" fill="#a07040" fontSize="8">S</text>
          <text x="90" y="53" textAnchor="middle" fill="#a07040" fontSize="8">E</text>
          <text x="10" y="53" textAnchor="middle" fill="#a07040" fontSize="8">W</text>
          <polygon points="50,18 47,50 50,45 53,50" fill="#e8c070" />
          <polygon points="50,82 47,50 50,55 53,50" fill="#704020" />
        </svg>
      </motion.div>

      {/* Magnifying glass decoration */}
      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 5, repeat: Infinity }}
        className="pointer-events-none absolute bottom-16 left-10 z-[3] hidden opacity-30 lg:block"
      >
        <svg width="70" height="80" viewBox="0 0 80 90" fill="none">
          <circle cx="32" cy="32" r="26" stroke="#8B6340" strokeWidth="3" />
          <circle cx="32" cy="32" r="18" stroke="#8B6340" strokeWidth="1" opacity="0.4" />
          <line x1="51" y1="51" x2="74" y2="80" stroke="#8B6340" strokeWidth="5" strokeLinecap="round" />
        </svg>
      </motion.div>

      <div className="relative px-6 py-12 sm:px-10 sm:py-16">
        {/* Header */}
        <div className="relative z-10 mb-8 text-center">
          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="font-mono text-[9px] uppercase tracking-[5px] text-[#a0632a]">Event Memories</motion.p>
          <div className="mt-2 flex items-center justify-center gap-3">
            <span className="h-px w-16 bg-gradient-to-r from-transparent to-[#8B6340]" />
            <span className="h-2 w-2 rotate-45 bg-[#c8902a]" />
            <motion.h2 initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="font-display text-4xl font-bold tracking-wide text-[#e8c070] sm:text-5xl"
              style={{ textShadow: "0 0 40px rgba(200,150,50,0.2)" }}>
              Treasure Hunt
            </motion.h2>
            <span className="h-2 w-2 rotate-45 bg-[#c8902a]" />
            <span className="h-px w-16 bg-gradient-to-l from-transparent to-[#8B6340]" />
          </div>
          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            transition={{ delay: 0.15 }} className="mt-2 text-sm italic text-[#8a5a30]">
            Follow the path — every picture marks an X
          </motion.p>
        </div>

        {/* Mobile fallback — the scattered map needs ~1000px of width for its
            fixed-size cards; on phones they'd overlap and clip, so show a
            simple 2-up grid instead */}
        <div className="grid grid-cols-2 gap-3 md:hidden">
          {files.map((file, i) => {
            const isLast = i === files.length - 1;
            const isVid = file.type === "vid";
            return (
              <div key={i}>
                <div
                  className={`cursor-pointer overflow-hidden rounded-lg bg-[#2a1500] shadow-[0_4px_20px_rgba(0,0,0,0.5)] ${
                    isLast
                      ? "border-[3px] border-[#e8c070]"
                      : isVid
                        ? "border-[2.5px] border-dashed border-[#c06010]"
                        : "border-[2.5px] border-[#8B6340]"
                  }`}
                  onClick={() => file.type === "img" && onOpen(file.url)}
                >
                  {file.type === "img" ? (
                    <img src={file.url} alt={file.label} loading="lazy" decoding="async"
                      width="400" height="300" className="h-32 w-full object-cover" />
                  ) : (
                    <video controls muted playsInline preload="metadata" className="h-32 w-full object-cover">
                      <source src={file.url} type="video/mp4" />
                    </video>
                  )}
                </div>
                <p className={`mt-1.5 text-center font-mono text-[9px] uppercase tracking-[2px] ${
                  isLast ? "font-bold text-[#e8c070]" : "text-[#a07040]"
                }`}>
                  {file.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* Scattered map container */}
        <div ref={containerRef} className="relative hidden md:block" style={{ height: `${maxBottom}vw`, minHeight: 1800 }}>
          {dims.w > 0 && <MapCanvas containerW={dims.w} containerH={containerRef.current?.offsetHeight || 1200} />}

          {files.map((file, i) => (
            <PhotoNode key={i} file={file} pos={positions[i]} index={i} onOpen={onOpen} />
          ))}
        </div>

        {/* End marker */}
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          className="relative z-10 mt-4 text-center">
          <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 2.5, repeat: Infinity }}
            className="inline-flex items-center gap-2 rounded-full border border-[#e8c070]/25 bg-[#e8c070]/8 px-5 py-2">
            <span>🏁</span>
            <span className="font-display text-xs font-bold text-[#e8c070]">Journey Complete</span>
            <span>🏆</span>
          </motion.div>
        </motion.div>
      </div>
    </motion.section>
  );
}
