import { motion } from "framer-motion";
import AnimatedCard from "./AnimatedCard";
import FeaturedCard from "./FeaturedCard";

/*
  Canva-style layout: rows of varying compositions.
  Each row is a flex layout with items of different flex ratios.
  Some items are tall (aspect-[3/4]), some wide (aspect-[16/9]),
  some square, some extra-wide — creating an organic, editorial feel.
*/

// Treasure hunt rows — 20 items across creative layouts
const treasureRows = [
  // Row 1: hero full-width (handled by FeaturedCard)
  // Row 2: 3 items — tall | wide | tall
  [{ flex: "1", aspect: "aspect-[3/4]", h: "h-[340px]" }, { flex: "1.6", aspect: "aspect-[16/10]", h: "h-[340px]" }, { flex: "1", aspect: "aspect-[3/4]", h: "h-[340px]" }],
  // Row 3: 2 items — wide landscape | portrait
  [{ flex: "2", aspect: "aspect-[2/1]", h: "h-[280px]" }, { flex: "1", aspect: "aspect-[4/5]", h: "h-[280px]" }],
  // Row 4: 4 items equal
  [{ flex: "1", aspect: "", h: "h-[240px]" }, { flex: "1", aspect: "", h: "h-[240px]" }, { flex: "1", aspect: "", h: "h-[240px]" }, { flex: "1", aspect: "", h: "h-[240px]" }],
  // Row 5: 1 wide panoramic
  [{ flex: "1", aspect: "aspect-[21/9]", h: "h-[260px]" }],
  // Row 6: 3 items — square | tall | square
  [{ flex: "1", aspect: "aspect-square", h: "h-[300px]" }, { flex: "0.8", aspect: "aspect-[3/4]", h: "h-[300px]" }, { flex: "1.2", aspect: "aspect-[4/3]", h: "h-[300px]" }],
  // Row 7: 2 items — big + small stacked feel
  [{ flex: "1.5", aspect: "", h: "h-[320px]" }, { flex: "1", aspect: "", h: "h-[320px]" }],
  // Row 8: 3 final items
  [{ flex: "1", aspect: "", h: "h-[280px]" }, { flex: "1.3", aspect: "", h: "h-[280px]" }, { flex: "0.7", aspect: "", h: "h-[280px]" }],
];

// Inauguration rows — 9 items
const inaugRows = [
  // Row 1: hero (FeaturedCard)
  // Row 2: 2 items
  [{ flex: "1", aspect: "aspect-[4/3]", h: "h-[320px]" }, { flex: "1.4", aspect: "aspect-[16/10]", h: "h-[320px]" }],
  // Row 3: 3 items
  [{ flex: "1", aspect: "", h: "h-[260px]" }, { flex: "1", aspect: "", h: "h-[260px]" }, { flex: "1", aspect: "", h: "h-[260px]" }],
  // Row 4: 2 items tall
  [{ flex: "1.3", aspect: "", h: "h-[340px]" }, { flex: "1", aspect: "aspect-[3/4]", h: "h-[340px]" }],
];

function distributeFiles(files, rows) {
  const result = [];
  let idx = 0;
  for (const row of rows) {
    const rowItems = [];
    for (const config of row) {
      if (idx < files.length) {
        rowItems.push({ file: files[idx], config });
        idx++;
      }
    }
    if (rowItems.length > 0) result.push(rowItems);
  }
  return result;
}

function SectionHeader({ label, title, subtitle, variant }) {
  const isGold = variant === "gold";
  const accent = isGold ? "#e8c070" : "#d4b4ff";
  const tag = isGold ? "#96723a" : "#8050b0";
  const line = isGold ? "#6b4a28" : "#5a3090";

  return (
    <div className="mb-12 text-center">
      <motion.p initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        className="font-mono text-[10px] uppercase tracking-[6px]" style={{ color: tag }}>
        {label}
      </motion.p>
      <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        transition={{ delay: 0.1 }} className="mt-4 flex items-center justify-center gap-5">
        <motion.span initial={{ width: 0 }} whileInView={{ width: 80 }} viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.8 }} className="h-px" style={{ background: `linear-gradient(90deg, transparent, ${line})` }} />
        <h2 className="break-words font-display text-3xl font-bold tracking-tight sm:text-6xl" style={{ color: accent }}>
          {title}
        </h2>
        <motion.span initial={{ width: 0 }} whileInView={{ width: 80 }} viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.8 }} className="h-px" style={{ background: `linear-gradient(90deg, ${line}, transparent)` }} />
      </motion.div>
      <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
        transition={{ delay: 0.25 }} className="mt-3 text-sm italic" style={{ color: tag }}>
        {subtitle}
      </motion.p>
    </div>
  );
}

export default function GallerySection({ title, subtitle, label, files, variant, onOpen }) {
  const isGold = variant === "gold";
  const rows = isGold ? treasureRows : inaugRows;
  const bgColor = isGold ? "#100800" : "#080512";
  const borderColor = isGold ? "rgba(107,74,40,0.3)" : "rgba(90,48,144,0.3)";

  const featured = files[0];
  const rest = files.slice(1);
  const distributed = distributeFiles(rest, rows);

  let globalIdx = 1; // start from 1 since 0 is featured

  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      className="relative mx-auto max-w-[1400px] overflow-hidden rounded-3xl"
      style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}` }}
    >
      {/* Ambient */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[10%] top-[20%] h-[500px] w-[500px] rounded-full opacity-[0.02] blur-[120px]"
          style={{ background: isGold ? "#c89030" : "#8040c0" }} />
        <div className="absolute bottom-[15%] right-[10%] h-[400px] w-[400px] rounded-full opacity-[0.025] blur-[100px]"
          style={{ background: isGold ? "#7a4810" : "#4020a0" }} />
      </div>

      <div className="relative z-10 px-4 py-14 sm:px-8 sm:py-20">
        <SectionHeader label={label} title={title} subtitle={subtitle} variant={variant} />

        {/* Featured hero */}
        <FeaturedCard file={featured} label={featured.label || title} sublabel={label} onClick={onOpen} variant={variant} />

        {/* Creative rows */}
        <div className="mt-10 space-y-4">
          {distributed.map((row, rowIdx) => (
            <motion.div
              key={rowIdx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: rowIdx * 0.06, duration: 0.6 }}
              className="flex flex-wrap gap-3 sm:flex-nowrap sm:gap-4"
            >
              {row.map(({ file, config }, colIdx) => {
                const idx = globalIdx++;
                // --r drives the flex ratio only at sm+; phones wrap 2-up via basis
                return (
                  <div key={colIdx} className={`${config.h} max-sm:h-44 basis-[calc(50%-0.375rem)] grow overflow-hidden rounded-2xl sm:[flex:var(--r)]`} style={{ "--r": config.flex }}>
                    <AnimatedCard
                      file={file}
                      index={idx}
                      onClick={onOpen}
                      variant={variant}
                      size="fill"
                    />
                  </div>
                );
              })}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
